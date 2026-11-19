// robot/construir.mjs: filtra por país, aplica ajustes manuales, numera y arma las fuentes de cada canal
import { MAX_FUENTES, CDN_CONOCIDOS, CATEGORIAS_ES, CATEGORIAS_EXCLUIDAS } from "./config.mjs";
import { hostDe, esHostIp, raizDe, hostCoincide } from "./util.mjs";

const ORDEN_TIPO = { dominio_propio: 0, cdn_conocido: 1, tercero: 2, ip_directa: 3 };
const calidadNum = (q) => parseInt(q, 10) || 0;
const FORMATOS_LOGO = ["PNG", "WebP", "JPEG"]; // el SVG no se dibuja en React Native sin librerías

const tipoFuente = (url, website) => {
  const host = hostDe(url);
  if (esHostIp(url)) return "ip_directa";
  if (website && raizDe(host) === raizDe(hostDe(website))) return "dominio_propio";
  if (CDN_CONOCIDOS.some((d) => hostCoincide(host, d))) return "cdn_conocido";
  return "tercero";
};

const elegirLogo = (canalId, logos) => {
  const candidatos = (logos.get(canalId) || []).filter((l) => l.in_use && FORMATOS_LOGO.includes(l.format) && l.url?.startsWith("https"));
  candidatos.sort((a, b) => {
    const color = (l) => (l.tags?.includes("color") ? 1 : 0);
    return color(b) - color(a) || (b.width || 0) - (a.width || 0);
  });
  return candidatos[0]?.url || null;
};

const categoriaEs = (cats, extra) => {
  const lista = cats.filter((c) => !CATEGORIAS_EXCLUIDAS.includes(c));
  const principal = lista.find((c) => c !== "general") || lista[0];
  return (principal && (extra[principal] || CATEGORIAS_ES[principal])) || "General";
};

// Números estables: fijos de ajustes > ya asignados antes > siguiente libre desde 100. Nunca se reutilizan.
const numerar = (canales, fijos, previos) => {
  const usados = new Map(Object.entries(fijos).map(([id, n]) => [n, id]));
  for (const [id, n] of Object.entries(previos)) {
    if (fijos[id] === undefined) {
      if (usados.has(n) && usados.get(n) !== id) {
        throw new Error(`Número ${n} en conflicto entre ${id} y ${usados.get(n)} (revisa numeros_fijos)`);
      }
      usados.set(n, id);
    }
  }
  let siguiente = Math.max(99, ...usados.keys()) + 1;
  const numeros = {};
  const asignados = { ...previos };
  for (const c of [...canales].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    if (fijos[c.id] !== undefined) numeros[c.id] = fijos[c.id];
    else if (previos[c.id] !== undefined) numeros[c.id] = previos[c.id];
    else numeros[c.id] = siguiente++;
    asignados[c.id] = numeros[c.id];
  }
  return { numeros, asignados };
};

const indexarPor = (lista, campo) => {
  const mapa = new Map();
  for (const x of lista) {
    if (!x[campo]) continue; // entradas sin canal enlazado no se usan
    if (!mapa.has(x[campo])) mapa.set(x[campo], []);
    mapa.get(x[campo]).push(x);
  }
  return mapa;
};

export const construirPais = (pais, datos, ajustes, youtube, infantil, numeracionPrevia) => {
  const { channels, feeds, streams, blocklist, logos, countries } = datos;
  const bloqueados = new Set(blocklist.map((b) => b.channel));
  const excluidos = new Set(ajustes.excluir || []);
  const streamsPor = indexarPor(streams, "channel");
  const feedsPor = indexarPor(feeds, "channel");
  const logosPor = indexarPor(logos, "channel");
  const idiomasPais = countries.find((c) => c.code === pais)?.languages || [];

  const base = channels.filter(
    (c) =>
      c.country === pais && !c.closed && !c.is_nsfw && !bloqueados.has(c.id) && !excluidos.has(c.id) &&
      !(c.categories || []).some((k) => CATEGORIAS_EXCLUIDAS.includes(k)) &&
      (streamsPor.has(c.id) || youtube.oficiales?.[c.id])
  );

  const canales = base.map((c) => {
    const oficialCfg = ajustes.oficiales?.[c.id] || null;
    let fuentes = (streamsPor.get(c.id) || []).map((s) => {
      const tls = s.url.startsWith("https");
      const host = hostDe(s.url);
      const oficial = !!(oficialCfg && tls && (oficialCfg.dominios || []).some((d) => hostCoincide(host, d)));
      return {
        tipo_fuente: tipoFuente(s.url, c.website), url: s.url, referrer: s.referrer || null, user_agent: s.user_agent || null,
        calidad: s.quality || null, tls, geo: (s.labels || []).includes("Geo-blocked"), no_24_7: (s.labels || []).includes("Not 24/7"),
        oficial, estado: null,
      };
    });
    fuentes.sort(
      (a, b) =>
        Number(b.oficial) - Number(a.oficial) || Number(b.tls) - Number(a.tls) || Number(a.geo) - Number(b.geo) ||
        ORDEN_TIPO[a.tipo_fuente] - ORDEN_TIPO[b.tipo_fuente] || calidadNum(b.calidad) - calidadNum(a.calidad)
    );
    fuentes = fuentes.slice(0, MAX_FUENTES).map((f, i) => ({ ...f, prioridad: i + 1 }));
    const yt = youtube.oficiales?.[c.id];
    if (yt) {
      fuentes.unshift({ tipo_fuente: "youtube_oficial", url: yt.url, referrer: null, user_agent: null, calidad: null, tls: true, geo: false, no_24_7: false, oficial: true, estado: "no_verificado", prioridad: 0 });
    }

    const feedsCanal = feedsPor.get(c.id) || [];
    const feedPrincipal = feedsCanal.find((f) => f.is_main) || feedsCanal[0];
    const idiomas = feedPrincipal?.languages?.length ? feedPrincipal.languages : idiomasPais;
    const esKids = (c.categories || []).includes("kids");
    return {
      id: c.id, numero: 0, nombre: c.name, categorias: c.categories || [],
      categoria_es: categoriaEs(c.categories || [], ajustes.categoria_es || {}),
      idiomas, logo: elegirLogo(c.id, logosPor), sitio: c.website || null,
      oficial: fuentes.some((f) => f.oficial),
      infantil: infantil.canales?.[c.id] || (esKids ? "pendiente" : null),
      estado: "sin_verificar", verificado: null, fuentes,
    };
  });
  const { numeros, asignados } = numerar(canales, ajustes.numeros_fijos || {}, numeracionPrevia.asignados || {});
  canales.forEach((c) => {
    c.numero = numeros[c.id];
  });
  canales.sort((a, b) => a.numero - b.numero);
  return { canales, asignados };
};

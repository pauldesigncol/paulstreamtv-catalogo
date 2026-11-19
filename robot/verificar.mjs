// robot/verificar.mjs: ¿responde cada señal y es una lista #EXTM3U? Distingue "caído" de "no verificable desde fuera".
import { TIMEOUT_MS, CONCURRENCIA, PAUSA_MISMO_HOST_MS, DIAS_CAIDO } from "./config.mjs";
import { hostDe } from "./util.mjs";

const UA = "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

// Devuelve { resultado: "ok" | "definitivo" | "ambiguo", motivo }
export const comprobarUrl = async (f) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const headers = { "User-Agent": f.user_agent || UA, Range: "bytes=0-2047", Accept: "*/*" };
    if (f.referrer) headers.Referer = f.referrer;
    const r = await fetch(f.url, { headers, signal: ctrl.signal, redirect: "follow" });
    if (r.status === 404 || r.status === 410) return { resultado: "definitivo", motivo: `http_${r.status}` };
    if ([401, 403, 451, 429].includes(r.status)) return { resultado: "ambiguo", motivo: `http_${r.status}` };
    if (!r.ok) return { resultado: r.status >= 500 ? "ambiguo" : "definitivo", motivo: `http_${r.status}` };
    // lee solo el inicio de la respuesta y la cierra
    const lector = r.body.getReader();
    let texto = "";
    while (texto.length < 2048) {
      const { done, value } = await lector.read();
      if (done) break;
      texto += new TextDecoder().decode(value);
    }
    lector.cancel().catch(() => {});
    return texto.replace(/^﻿/, "").trimStart().startsWith("#EXTM3U")
      ? { resultado: "ok", motivo: null }
      : { resultado: "definitivo", motivo: "sin_extm3u" };
  } catch (e) {
    const codigo = e.cause?.code || e.name;
    if (codigo === "ENOTFOUND") return { resultado: "definitivo", motivo: "dns" };
    return { resultado: "ambiguo", motivo: codigo === "AbortError" ? "timeout" : String(codigo || "red") };
  } finally {
    clearTimeout(timer);
  }
};

// Revisa todas las fuentes (dominios en paralelo; dentro de un dominio, de una en una) y actualiza estado e historial
export const verificarCanales = async (canales, historial, ahora) => {
  const grupos = new Map();
  for (const c of canales) {
    for (const f of c.fuentes) {
      if (f.tipo_fuente === "youtube_oficial") continue;
      const h = hostDe(f.url) || "?";
      if (!grupos.has(h)) grupos.set(h, []);
      grupos.get(h).push(f);
    }
  }
  const colas = [...grupos.values()];
  const trabajador = async () => {
    while (colas.length) {
      for (const f of colas.pop()) {
        const r = await comprobarUrl(f);
        const h = historial[f.url] || { definitivos: 0, ultimo_ok: null };
        if (r.resultado === "ok") {
          h.definitivos = 0;
          h.ultimo_ok = ahora;
          f.estado = "ok";
        } else if (f.geo || r.resultado === "ambiguo") {
          f.estado = "no_verificable";
        } else {
          h.definitivos += 1;
          f.estado = h.definitivos >= DIAS_CAIDO ? "caida" : "dudosa";
        }
        f.motivo = r.motivo;
        h.ultima = ahora;
        historial[f.url] = h;
        await new Promise((ok) => setTimeout(ok, PAUSA_MISMO_HOST_MS));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, colas.length) }, trabajador));

  for (const c of canales) {
    const est = c.fuentes.map((f) => f.estado);
    const motivo = c.fuentes.map((f) => f.motivo).find(Boolean);
    if (est.includes("ok")) c.estado = "ok";
    else if (est.includes("no_verificable") || est.includes("no_verificado")) c.estado = "no_verificable";
    else if (est.every((e) => e === "caida")) c.estado = "caido";
    else c.estado = "dudoso";
    c.motivo = c.estado === "ok" ? null : motivo || null;
    c.verificado = ahora;
  }
  // limpia el historial de señales que ya no existen
  const vigentes = new Set(canales.flatMap((c) => c.fuentes.map((f) => f.url)));
  for (const u of Object.keys(historial)) if (!vigentes.has(u)) delete historial[u];
};

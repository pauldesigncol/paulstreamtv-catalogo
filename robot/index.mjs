// robot/index.mjs: descarga → filtra → ajustes → verifica → publica.
// Uso: node robot/index.mjs [--paises=CO,MX] [--sin-verificar]
// completo/XX.json (todos los canales, incluidos los no oficiales) solo se genera en local con GENERAR_COMPLETO=1.
import fs from "node:fs";
import path from "node:path";
import { PAISES, UMBRAL_CAIDA, CORREO_RETIRO } from "./config.mjs";
import { cargarDatos } from "./descargar.mjs";
import { construirPais } from "./construir.mjs";
import { verificarCanales } from "./verificar.mjs";
import { RAIZ, leerJson, escribirJson, escribirCatalogo } from "./util.mjs";

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const paises = arg("paises")?.split(",") || PAISES;
const verificar = !process.argv.includes("--sin-verificar");
const generarCompleto = process.env.GENERAR_COMPLETO === "1";
const ahora = new Date().toISOString();
const fecha = ahora.slice(0, 10);
const ruta = (...p) => path.join(RAIZ, ...p);

const datos = await cargarDatos();
const indice = leerJson(ruta("index.json"), { esquema: 1, paises: {} });
const errores = [];

for (const pais of paises) {
  try {
    const ajustes = leerJson(ruta(`ajustes/paises/${pais}.json`), {});
    const youtube = leerJson(ruta(`ajustes/youtube/${pais}.json`), {});
    const infantil = leerJson(ruta("ajustes/infantil.json"), {});
    const numeracion = leerJson(ruta(`estado/numeracion/${pais}.json`), { asignados: {} });
    const historial = leerJson(ruta(`estado/historial/${pais}.json`), {});

    const { canales, asignados } = construirPais(pais, datos, ajustes, youtube, infantil, numeracion);
    const previo = indice.paises[pais]?.canales_total ?? 0; // total publicado antes (sin importar cuántos sean oficiales)
    if (previo >= 20 && canales.length < previo * UMBRAL_CAIDA) {
      throw new Error(`${pais}: quedan ${canales.length} canales y antes había ${previo}; no se publica (revisar iptv-org o ajustes)`);
    }
    if (verificar) await verificarCanales(canales, historial, ahora);

    const cab = { esquema: 1, pais, version: fecha, generado: ahora, contacto_retiro: CORREO_RETIRO };
    // Producción: solo canales oficiales y solo sus fuentes oficiales. Completo: todo, para desarrollo.
    const produccion = canales.filter((c) => c.oficial).map((c) => ({ ...c, fuentes: c.fuentes.filter((f) => f.oficial) }));
    escribirCatalogo(ruta(`paises/${pais}.json`), { ...cab, tipo: "produccion" }, produccion);
    if (generarCompleto) escribirCatalogo(ruta(`completo/${pais}.json`), { ...cab, tipo: "completo" }, canales);
    escribirJson(ruta(`estado/numeracion/${pais}.json`), { asignados });
    escribirJson(ruta(`estado/historial/${pais}.json`), historial, 0);
    const cuenta = (e) => canales.filter((c) => c.estado === e).length;
    indice.paises[pais] = {
      version: fecha, canales_total: canales.length, canales_produccion: produccion.length,
      ok: cuenta("ok"), no_verificable: cuenta("no_verificable"), dudoso: cuenta("dudoso"), caido: cuenta("caido"),
      bytes_produccion: fs.statSync(ruta(`paises/${pais}.json`)).size,
    };
    console.log(`${pais}: ${canales.length} canales (${cuenta("ok")} ok, ${cuenta("no_verificable")} no verificables, ${cuenta("dudoso")} dudosos, ${cuenta("caido")} caídos), producción ${produccion.length}`);
  } catch (e) {
    errores.push(e.message);
    console.error(`ERROR ${pais}: ${e.message}`);
  }
}
escribirJson(ruta("index.json"), { ...indice, generado: ahora, contacto_retiro: CORREO_RETIRO });
if (errores.length) process.exit(1);

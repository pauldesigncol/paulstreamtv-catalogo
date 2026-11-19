// robot/descargar.mjs: baja los JSON de iptv-org (o los toma de CACHE_DIR para pruebas locales)
import fs from "node:fs";
import path from "node:path";
import { API, ARCHIVOS } from "./config.mjs";
import { validarEsquema } from "./esquema.mjs";

const bajar = async (url, intentos = 3) => {
  let ultimo;
  for (let i = 1; i <= intentos; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "paulstreamtv-catalogo-robot" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      ultimo = e;
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
  throw new Error(`No se pudo descargar ${url}: ${ultimo.message}`);
};

export const cargarDatos = async () => {
  const cache = process.env.CACHE_DIR;
  const datos = {};
  for (const nombre of ARCHIVOS) {
    datos[nombre] = cache
      ? JSON.parse(fs.readFileSync(path.join(cache, `${nombre}.json`), "utf8"))
      : await bajar(`${API}${nombre}.json`);
    validarEsquema(nombre, datos[nombre]);
  }
  return datos;
};

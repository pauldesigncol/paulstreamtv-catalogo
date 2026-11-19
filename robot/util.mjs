// robot/util.mjs
import fs from "node:fs";
import path from "node:path";

export const RAIZ = path.resolve(import.meta.dirname, "..");
export const leerJson = (ruta, defecto = null) => {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT" && defecto !== null) return defecto;
    throw new Error(`No se pudo leer ${ruta}: ${e.message}`);
  }
};
export const escribirJson = (ruta, datos, indent = 2) => {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(datos, null, indent) + "\n", "utf8");
};
// JSON con un canal por línea: diffs legibles y archivo pequeño
export const escribirCatalogo = (ruta, cabecera, canales) => {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const cab = JSON.stringify(cabecera).slice(0, -1);
  const cuerpo = canales.map((c) => "    " + JSON.stringify(c)).join(",\n");
  fs.writeFileSync(ruta, `${cab},"canales":[\n${cuerpo}\n]}\n`, "utf8");
};
const esIp = (h) => /^\d+\.\d+\.\d+\.\d+$/.test(h);
export const hostDe = (url) => {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ""; }
};
export const esHostIp = (url) => esIp(hostDe(url));
// Dominio "raíz" aproximado (com.co, gov.co, etc. cuentan como sufijo)
export const raizDe = (host) => {
  if (!host || esIp(host)) return host;
  const p = host.split(".");
  const sufijo2 = ["com", "gov", "org", "net", "edu", "co"];
  if (p.length >= 3 && p[p.length - 1].length === 2 && sufijo2.includes(p[p.length - 2])) return p.slice(-3).join(".");
  return p.slice(-2).join(".");
};
export const hostCoincide = (host, dominio) => host === dominio || host.endsWith("." + dominio);

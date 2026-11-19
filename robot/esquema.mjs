// robot/esquema.mjs: falla con un aviso claro si iptv-org cambia los campos que usamos
const REQUERIDOS = {
  channels: ["id", "name", "country", "categories", "is_nsfw", "closed", "website", "replaced_by"],
  feeds: ["channel", "id", "is_main", "languages"],
  streams: ["channel", "feed", "url", "quality", "labels", "referrer", "user_agent"],
  blocklist: ["channel", "reason"],
  logos: ["channel", "feed", "in_use", "tags", "width", "height", "format", "url"],
  countries: ["code", "languages"],
};
export const validarEsquema = (nombre, datos) => {
  if (!Array.isArray(datos) || datos.length === 0) throw new Error(`${nombre}.json no es una lista con datos`);
  const muestra = datos.slice(0, 300);
  for (const campo of REQUERIDOS[nombre]) {
    if (!muestra.some((o) => campo in o)) {
      throw new Error(`Esquema de iptv-org cambiado: ${nombre}.json ya no trae el campo "${campo}"`);
    }
  }
};

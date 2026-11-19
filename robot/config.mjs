// robot/config.mjs: constantes del robot del catálogo
export const PAISES = ["CO", "MX", "AR", "ES", "PE", "CL", "EC", "VE"];
export const API = "https://iptv-org.github.io/api/";
export const ARCHIVOS = ["channels", "feeds", "streams", "blocklist", "logos", "countries"];

export const MAX_FUENTES = 5; // señales que se conservan por canal
export const DIAS_CAIDO = 5; // fallos definitivos seguidos para marcar una señal como caída
export const UMBRAL_CAIDA = 0.7; // no se publica un país si queda con menos del 70 % de los canales anteriores
export const TIMEOUT_MS = 8000;
export const CONCURRENCIA = 16; // dominios revisados a la vez (dentro de un mismo dominio se revisa de uno en uno)
export const PAUSA_MISMO_HOST_MS = 150;
export const CORREO_RETIRO = "soportepaulstreamtv@gmail.com";

// CDN conocidos donde los canales suelen alojar su señal (no prueba que sea oficial: eso lo decide ajustes/)
export const CDN_CONOCIDOS = ["mdstrm.com", "cdnmedia.tv", "rtvc.gov.co", "enetres.net", "akamaized.net", "cloudfront.net", "streamtheworld.com"];

export const CATEGORIAS_ES = {
  general: "General", entertainment: "Entretenimiento", religious: "Religioso", music: "Música", news: "Noticias",
  movies: "Películas", legislative: "Legislativo", education: "Educación", outdoor: "Aire libre", kids: "Infantil",
  family: "Familia", culture: "Cultural", series: "Series", classic: "Clásicos", sports: "Deportes", public: "Público",
  documentary: "Documentales", comedy: "Comedia", animation: "Animación", business: "Negocios", cooking: "Cocina",
  auto: "Motor", interactive: "Interactivo", lifestyle: "Estilo de vida", relax: "Relax", science: "Ciencia",
  shop: "Compras", travel: "Viajes", weather: "Clima", woman: "Mujer",
};
export const CATEGORIAS_EXCLUIDAS = ["xxx"];

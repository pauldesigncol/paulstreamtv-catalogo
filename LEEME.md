# paulstreamtv-catalogo

Catálogo de TV abierta por país para la app Paul Stream TV. Un robot diario (GitHub Actions) toma los datos de [iptv-org](https://iptv-org.github.io/api/), los filtra, aplica ajustes manuales, revisa cada señal y publica un JSON pequeño por país.

> Contacto y solicitudes de retiro: ver [RETIRO.md](RETIRO.md).

## Qué se publica
| Ruta | Contenido | Quién lo usa |
|---|---|---|
| `paises/XX.json` | **Producción**: solo canales con `oficial: true` y solo sus fuentes oficiales | App de producción (Google Play y Apple) |
| `completo/XX.json` | Todos los canales con señal, marcados como oficiales o no | App en desarrollo, con el interruptor del catálogo |
| `index.json` | Versión y conteos por país; la app lo consulta primero | App |

## Reglas de filtrado (robot)
- Solo canales del país, sin `closed`, `is_nsfw` ni categoría `xxx`, y fuera de la `blocklist` de iptv-org.
- Se descartan los streams sin canal enlazado y se conservan hasta 5 fuentes por canal (https antes que http, sin etiqueta Geo-blocked, dominio propio antes que CDN, IP directa al final).
- Si un país queda con menos del 70 % de los canales publicados antes, no se publica y el robot falla con un aviso.
- Si iptv-org cambia los campos que usamos, el robot falla antes de publicar (`robot/esquema.mjs`).

## Qué significa `oficial`
Un canal es oficial solo si está en `ajustes/paises/XX.json` → `oficiales` con los `dominios` verificados a mano y la nota de cómo se verificó. Una fuente es oficial si es **https** y su dominio coincide con esa lista. Las señales http planas nunca son oficiales por ahora. El tipo de fuente `youtube_oficial` se agrega desde `ajustes/youtube/XX.json` → `oficiales`.

```json
"oficiales": {
  "Ejemplo.co": { "dominios": ["ejemplo.tv"], "verificado": "AAAA-MM-DD", "nota": "Cómo se verificó (página en vivo, red, dominio observado)" }
}
```

## Estados de un canal (`estado`)
| Estado | Significado |
|---|---|
| `ok` | Al menos una fuente respondió con `#EXTM3U` |
| `no_verificable` | Falló de forma ambigua (401/403/451/429, timeout, conexión rechazada, etiqueta Geo-blocked): **no se elimina**; el robot corre fuera del país y puede estar bloqueado. La app lo verifica desde el país del usuario |
| `dudoso` | Fallo definitivo reciente (404/410, DNS, no es una lista M3U), aún sin llegar a 5 días seguidos |
| `caido` | Todas las fuentes con 5 o más días seguidos de fallo definitivo |

## Numeración estable
`ajustes/paises/XX.json` → `numeros_fijos` fija los números de los canales importantes (1 a 99). Los demás reciben automáticamente el siguiente número libre desde el 100 y se guardan en `estado/numeracion/XX.json`. **Un número no se reutiliza nunca**, aunque el canal desaparezca.

## Esquema de `paises/XX.json` y `completo/XX.json` (`esquema: 1`)
Cabecera: `esquema`, `pais`, `version` (AAAA-MM-DD), `generado`, `contacto_retiro`, `tipo` (`produccion` o `completo`), `canales[]`.

Canal: `id`, `numero`, `nombre`, `categorias[]` (iptv-org), `categoria_es`, `idiomas[]` (ISO 639-3), `logo`, `sitio`, `oficial`, `infantil` (`null`, `pendiente`, `aprobado`, `rechazado`), `estado`, `motivo`, `verificado`, `fuentes[]`.

Fuente: `tipo_fuente` (`dominio_propio`, `cdn_conocido`, `tercero`, `ip_directa`, `youtube_oficial`), `url`, `referrer`, `user_agent`, `calidad`, `tls`, `geo`, `no_24_7`, `oficial`, `estado` (`ok`, `no_verificable`, `dudosa`, `caida`, `no_verificado`), `motivo`, `prioridad`.

## Uso local
```
node robot/index.mjs --paises=CO              # un país, con verificación
node robot/index.mjs --sin-verificar          # sin revisar las señales
CACHE_DIR=.cache node robot/index.mjs         # usa JSON de iptv-org ya descargados (pruebas)
```
No tiene dependencias: solo Node 20 o superior.

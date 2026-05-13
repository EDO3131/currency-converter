# Contexto del proyecto — Currency Converter

> Documento de referencia para iniciar una sesión nueva de Claude Code.
> Refleja el estado del proyecto al 13-05-2026.

---

## 1. Descripción general

Aplicación web de conversión de divisas que cubre **30 monedas** de América (10), Europa (10), Asia (7), África (5) y Oceanía (3). Obtiene tasas de cambio en tiempo real desde la API pública de frankfurter.app y muestra, para cada moneda seleccionada, una card con datos económicos del país emisor. Incluye un ticker animado con las 10 acciones globales más relevantes y un modal de mercado local por divisa.

La interfaz sigue el sistema de diseño **SAP Fiori**: paleta azul `#0070F2`, fondo gris claro `#F5F6F7`, cards blancas, tipografía limpia, indicadores semánticos de estado.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| UI | React | 19.2.5 |
| Build / Dev server | Vite | 8.0.10 |
| Estilos | CSS puro con custom properties | — |
| HTTP | `fetch` nativo del navegador | — |
| Empaquetador JSX | `@vitejs/plugin-react` (Babel) | 6.0.1 |
| Linting | ESLint + plugins react-hooks / react-refresh | 10.x |
| Base de datos | Supabase (PostgreSQL) | `@supabase/supabase-js` |
| API de acciones | Twelve Data | REST directo (CORS libre) |

**Sin librerías adicionales de UI, routing ni estado global.** Restricción explícita del proyecto.

---

## 3. Estructura de archivos

```
currency-converter/
│
├── index.html                  # Punto de entrada HTML. Sin CSP, sin meta adicional.
├── vite.config.js              # Config de Vite + proxy de desarrollo para CORS.
├── vercel.json                 # Rewrite rules para proxy en producción (Vercel).
├── package.json                # Dependencias: react, react-dom, tooling Vite, @supabase/supabase-js.
├── .env                        # Variables locales (gitignored): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TWELVE_DATA_KEY.
│
├── docs/
│   └── CONTEXT.md              # Este archivo.
│
└── src/
    ├── main.jsx                # Monta <App> en #root dentro de <StrictMode>.
    ├── index.css               # CSS del template original de Vite. Ver nota §10.1.
    │
    ├── App.jsx                 # Componente raíz. Solo lógica y presentación, sin datos.
    ├── App.css                 # Sistema de diseño Fiori completo. Variables en :root.
    │
    ├── components/
    │   ├── StocksTicker.jsx    # Ticker horizontal animado (10 acciones globales, header).
    │   ├── StocksModal.jsx     # Modal de mercado local: tabla + sparkline, sin pestañas.
    │   └── MiniChart.jsx       # Sparkline SVG 80×32px, verde/rojo según variación.
    │
    ├── data/
    │   └── countriesData.js    # Fallback local: 27 monedas. Respaldo si Supabase falla.
    │
    ├── lib/
    │   └── supabase.js         # Cliente Supabase (createClient). Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
    │
    └── services/
        ├── api.js              # Capa HTTP: fetch a frankfurter.app vía proxy; usa fallbackRates de Supabase.
        ├── countriesService.js # Capa de acceso a Supabase: consulta tabla currencies con SELECT público.
        └── stocksService.js    # Acceso a Twelve Data: /quote + /time_series. Caché en memoria Map (TTL 1h).
```

### Propósito detallado de cada archivo

**`vite.config.js`**
Configura el proxy del servidor de desarrollo para redirigir `/api/frankfurter/*` a `https://api.frankfurter.app/*`. Esto evita el bloqueo CORS que el navegador aplica a `fetch()` cross-origin (no aplica a navegación directa en barra de direcciones). Sin este proxy, la app muestra el error de tasas aunque la API funcione correctamente en el navegador.

**`vercel.json`**
Configura los rewrites del edge de Vercel para producción. La regla `"/api/frankfurter/:path*"` → `"https://api.frankfurter.app/:path*"` replica lo que hace el proxy de Vite, pero ejecutándose en la infraestructura de Vercel (server-side). `api.js` usa la misma URL relativa en ambos entornos sin ningún cambio.

**`src/data/countriesData.js`**
Objeto `COUNTRY_DATA` con una entrada por moneda (27 en total). Actúa como **fallback local** si Supabase no responde: `getCountriesData()` en `countriesService.js` lo usa en el bloque `catch`. A partir de este objeto se derivan y exportan `CURRENCIES` (array para los selectores) y `FALLBACK_RATES` (objeto para el estado inicial de tasas). Las 30 monedas en producción provienen de Supabase; este archivo cubre las 27 originales.

**`src/lib/supabase.js`**
Inicializa y exporta el cliente de Supabase usando `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. Es el único lugar donde vive el cliente — el resto del código lo importa desde aquí. No contiene lógica de negocio.

**`src/services/countriesService.js`**
Capa de acceso a datos sobre Supabase. Expone funciones que consultan la tabla `currencies` mediante SELECT público (permitido por RLS con anon key). Actúa como adaptador entre el esquema de la base de datos y las estructuras que espera el resto de la app.

**`src/services/api.js`**
`fetchRates(fallbackRates = {})` hace `GET /api/frankfurter/latest?base=USD`. El merge es `{ USD: 1, ...fallbackRates, ...liveRates }`: los `fallback_rate` de Supabase cubren todo lo que el BCE no rastrea (ARS, CLP, COP, etc.); frankfurter sobrescribe donde tiene cobertura. `STATIC_RATES` fue eliminado — Supabase es ahora la única fuente de tasas estáticas.

**`src/services/stocksService.js`**
Gestiona acciones via Twelve Data (800 req/día). Para cada símbolo lanza en paralelo `/quote` (precio actual, `percent_change`, volumen, nombre) y `/time_series?interval=1day&outputsize=7` (7 cierres para el sparkline). Caché en `Map` con TTL de 1h; un TODO documenta la migración futura a tabla `stocks_cache` en Supabase. `GLOBAL_STOCKS` (10 acciones) alimenta el ticker; `LOCAL_STOCKS` (2 acciones por divisa) alimenta el modal.

**`src/components/StocksTicker.jsx`**
Carga `GLOBAL_STOCKS` con `fetchStockList` al montar. Duplica los items para el loop CSS infinito (`translateX(-50%)`). Si la carga falla, devuelve `null` (el ticker es decorativo). Sticky bajo el shell bar (`top: 44px`). Oculto en `≤540px`.

**`src/components/StocksModal.jsx`**
Modal de mercado local sin pestañas. Carga los 2 símbolos de `LOCAL_STOCKS[currencyCode]` (o `GLOBAL_STOCKS.slice(0,2)` como fallback) al abrir. Muestra tabla con empresa, precio, variación %, volumen y sparkline. Cierra con ✕, clic en backdrop o tecla Escape.

**`src/components/MiniChart.jsx`**
SVG puro 80×32px. Normaliza un array de 7 precios de cierre al viewport con padding de 3px. Trazo verde `#107E3E` si la acción sube, rojo `#BB0000` si baja.

**`src/App.jsx`**
Contiene tres componentes y la lógica de la aplicación:
- `CurrencySelect` — selector con optgroups por región (América / Europa / Asia).
- `CountryCard` — card informativa con datos económicos del país. Retorna `null` si el código no tiene entrada en `COUNTRY_DATA`.
- `ConversionHistory` — lista las últimas 5 conversiones de la sesión. Muestra "Sin conversiones recientes" cuando el array está vacío.
- `App` — componente principal con estado (`amount`, `from`, `to`, `rotating`, `rates`, `loading`, `error`, `lastUpdated`, `history`), funciones `loadRates()` y `addToHistoryWith()`, y el árbol JSX completo.

**`src/App.css`**
Diseño Fiori implementado con CSS puro. Variables de diseño en `:root` con prefijo `--f-`. Cubre: shell bar, layout de página, card del convertidor, inputs/selects Fiori, botones primario/secundario, panel de resultado, mensajes de estado semántico, grid de country cards, responsive para ≤ 540px.

**`src/index.css`**
CSS del template original de Vite. Define variables de color y tipografía para tema claro/oscuro, y `font-size: 18px` en `:root`. **App.css anula lo relevante** (`body { font-size: 14px }`, `background`, etc.). No se modificó para no introducir riesgo. Ver §8.1.

---

## 4. API integrada

**Proveedor:** frankfurter.app  
**Fuente de datos:** Banco Central Europeo (BCE)  
**Costo:** gratuito, sin API key, sin rate limiting documentado

### Endpoint utilizado

```
GET https://api.frankfurter.app/latest?base=USD
```

**Respuesta:**
```json
{
  "amount": 1.0,
  "base": "USD",
  "date": "2026-05-07",
  "rates": {
    "EUR": 0.93,
    "GBP": 0.79,
    "JPY": 148.0,
    ...
  }
}
```

### Flujo completo

**Desarrollo (`npm run dev`):**
```
Navegador → fetch('/api/frankfurter/latest?base=USD')
         → Vite dev server (proxy en vite.config.js)
         → https://api.frankfurter.app/latest?base=USD
         → respuesta JSON → api.js → App.jsx
```

**Producción (Vercel — https://currency-converter-one-iota-39.vercel.app/):**
```
Navegador → fetch('/api/frankfurter/latest?base=USD')
         → Vercel Edge (rewrite en vercel.json)
         → https://api.frankfurter.app/latest?base=USD
         → respuesta JSON → api.js → App.jsx
```

`api.js` usa la misma URL relativa `/api/frankfurter/...` en ambos entornos.

### Monedas no cubiertas por el BCE

Varias monedas no están en la respuesta de frankfurter.app. Antes se mantenían en un objeto `STATIC_RATES` hardcodeado en `api.js`. Actualmente **todas las tasas de respaldo viven en la columna `fallback_rate` de la tabla `currencies` en Supabase**, incluidas las latinoamericanas (ARS, CLP, COP, PEN, UYU, BOB) y las de África y Oceanía no cubiertas (NGN, EGP, KES, MAD, FJD). `STATIC_RATES` fue eliminado de `api.js`.

---

## 5. Integración con Supabase

### 5.0 Base de datos

La tabla `currencies` en Supabase contiene **30 registros** (22 originales + 5 África + 3 Oceanía). Columnas: `code` (PK), `country`, `flag`, `continent`, `name`, `symbol`, `fallback_rate`, `decimals`, `central_bank`, `inflation`, `gdp`, `fun_fact`.

La columna `fallback_rate` es la **única fuente de tasas estáticas** del proyecto. `api.js` la recibe como parámetro `fallbackRates` y la aplica antes de las tasas en vivo de frankfurter. No hay tasas hardcodeadas en el frontend.

### 5.0.1 Row Level Security (RLS)

RLS está activo en la tabla `currencies`:

| Operación | Rol | Resultado |
|---|---|---|
| SELECT | `anon` | Permitido (política pública) |
| INSERT | `anon` | Bloqueado |
| UPDATE | `anon` | Bloqueado |
| DELETE | `anon` | Bloqueado |

El frontend solo puede leer datos. Escrituras requieren `service_role`, que se reserva para un backend futuro.

### 5.0.2 Variables de entorno

| Variable | Alcance | Dónde se configura |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (expuesta al navegador) | `.env` local · Dashboard Vercel |
| `VITE_SUPABASE_ANON_KEY` | Frontend (expuesta al navegador) | `.env` local · Dashboard Vercel |

La `service_role` key **no está configurada en ningún entorno activo** — se agrega cuando exista el backend.

### 5.0.3 Arquitectura en capas

```
App.jsx
  └── countriesService.js   ← única interfaz hacia Supabase
        └── supabase.js     ← cliente (createClient)
              └── Supabase  ← tabla currencies (PostgreSQL)
```

`App.jsx` nunca importa `supabase.js` directamente. Si la fuente de datos cambia, solo se toca `countriesService.js`.

---

## 6. Decisiones técnicas y su razón

### 6.1 Proxy de Vite en lugar de llamada directa a la API

**Decisión:** `fetch('/api/frankfurter/...')` con rewrite en `vite.config.js`.  
**Razón:** El navegador bloquea `fetch()` cross-origin si el servidor no responde con `Access-Control-Allow-Origin`. Aunque frankfurter.app soporta CORS, infraestructura de red intermedia (proxies corporativos, antivirus) puede eliminar esas cabeceras. El proxy de Vite hace la petición desde Node.js (sin restricciones de CORS) y devuelve la respuesta al navegador como si fuera del mismo origen.  
**Tradeoff:** El proxy de Vite solo actúa durante `npm run dev`. Para producción, cada host requiere su mecanismo equivalente. En Vercel se resuelve con `vercel.json` (§5.8); en otros hosts se necesitaría configuración específica de esa plataforma.

### 6.2 `countriesData.js` como única fuente de verdad

**Decisión:** `CURRENCIES` y `FALLBACK_RATES` se derivan de `COUNTRY_DATA` con `Object.entries().map()` y `Object.fromEntries()`.  
**Razón:** Antes existían tres objetos paralelos en `App.jsx` que compartían `flag`, `symbol` y nombre de moneda. Cualquier corrección requería editar en dos lugares. Ahora agregar una moneda nueva requiere tocar solo `countriesData.js`.

### 6.3 `decimals` co-ubicado en `COUNTRY_DATA` en lugar de `LARGE_DECIMALS` separado

**Decisión:** Las entradas de ARS, CLP, COP, HUF, JPY y KRW tienen `decimals: 0`. `formatResult()` lee `COUNTRY_DATA[code]?.decimals ?? 2`.  
**Razón:** Un `Set` de códigos separado es una lista paralela que duplica conocimiento. Al poner `decimals: 0` en la misma entrada que describe la moneda, la regla y su justificación están en el mismo lugar.

### 6.4 `FALLBACK_RATES` como estado inicial (no pantalla vacía)

**Decisión:** `useState(FALLBACK_RATES)` como valor inicial de `rates`.  
**Razón:** La app es funcional desde el primer render, antes de que la llamada a la API complete. El usuario ve un convertidor operativo con tasas aproximadas mientras se cargan las reales. Evita una pantalla en blanco o un estado de carga que bloquee la interacción.

### 6.5 Manejo de error no destructivo

**Decisión:** El `catch` de `loadRates()` muestra un mensaje pero no limpia `rates`.  
**Razón:** Si la API falla en un refresco manual, el usuario conserva las últimas tasas cargadas. La app nunca queda en estado roto.

### 6.6 Sin librerías adicionales de UI/estado

**Decisión:** `fetch` nativo, CSS puro, sin Axios, React Query, Tailwind, etc.  
**Razón:** Restricción explícita del proyecto para mantener el footprint mínimo y usar solo lo nativo del navegador.

### 6.7 `vercel.json` como proxy de producción

**Decisión:** Rewrite declarativo `"/api/frankfurter/:path*"` → `"https://api.frankfurter.app/:path*"` en `vercel.json`.  
**Razón:** Vercel ejecuta los rewrites en su edge network antes de que la respuesta llegue al navegador, por lo que no hay solicitud cross-origin. La solución es puramente declarativa (JSON), no requiere una función serverless, y permite que `api.js` use la misma URL relativa sin ningún cambio entre entornos.  
**Tradeoff:** La configuración es específica de Vercel. Un deploy en Netlify, Nginx u otro host necesitaría un equivalente adaptado a esa plataforma.

### 6.8 `CountryCard` retorna `null` para códigos sin datos

**Decisión:** `if (!data) return null` como primera línea de `CountryCard`.  
**Razón:** Hace el componente tolerante a gaps en los datos sin requerir lógica defensiva en el padre. Si en el futuro se agrega una moneda nueva sin agregar su entrada en `countriesData.js`, la card simplemente no aparece — sin error de runtime.

---

## 9. Estado detallado del proyecto

### Funcionalidad implementada
- [x] Conversión entre 30 monedas (América, Europa, Asia, África, Oceanía)
- [x] Tasas reales desde frankfurter.app con actualización manual
- [x] `fallback_rate` unificado en Supabase para todas las monedas no cubiertas por BCE
- [x] Card informativa por moneda: país, banco central, inflación, PIB, dato curioso
- [x] Botón "Ver mercado" en cada card → modal de mercado local
- [x] Indicadores de estado: éxito (verde), error (rojo) al actualizar tasas
- [x] Botón de intercambio con animación
- [x] Diseño SAP Fiori completo con shell bar, paleta azul, responsive
- [x] Historial de últimas 5 conversiones de la sesión (en memoria, no persistente)
- [x] Deploy en producción: https://currency-converter-one-iota-39.vercel.app/
- [x] Proxy en producción via `vercel.json` (resuelve CORS en Vercel)
- [x] Supabase: tabla `currencies` (30 registros), RLS activo, `fallback_rate` fuente única
- [x] Variables de entorno: Supabase + Twelve Data en `.env` local y dashboard Vercel
- [x] Arquitectura en capas: `supabase.js` → `countriesService.js` → `App.jsx`
- [x] Ticker de acciones globales animado (10 símbolos, Twelve Data, sticky bajo shell bar)
- [x] Modal de mercado local por divisa (2 acciones, sparkline 7 días, sin pestañas)
- [x] Caché en memoria para acciones (TTL 1h, TODO documentado para migrar a Supabase)

### Limitaciones conocidas
- Los datos económicos de `countriesData.js` (inflación, PIB) son estáticos y aproximados a mayo 2026.
- El historial de conversiones vive en memoria: se pierde al recargar la página.
- El caché de acciones es por sesión: dos usuarios distintos no comparten datos.
- `vercel.json` resuelve CORS solo para Vercel.
- `index.css` y `src/assets/` tienen remanentes del template Vite sin auditar.
- `LOCAL_STOCKS` solo tiene listas para USD, EUR, GBP, JPY y CNY; el resto de divisas usa `GLOBAL_STOCKS.slice(0,2)` como fallback.

---

## 7. Estado actual del proyecto

### Etapa 1 — Completada
Conversión en tiempo real, fallback, country cards, diseño Fiori, deploy Vercel con proxy CORS.

### Etapa 2 — Completada
Integración con Supabase: tabla `currencies` (30 registros), RLS activo, arquitectura en capas, `fallback_rate` unificado como única fuente de tasas estáticas, variables de entorno en local y Vercel.

### Etapa 3 — Completada (parcialmente)
Datos de acciones vía Twelve Data: ticker animado en header, modal de mercado local por divisa, sparkline 7 días, caché en memoria. Pendiente: historial persistente y migración del caché de acciones a Supabase.

### Etapa 4 — Pendiente
Backend propio: API server-side con `service_role` para historial de conversiones y tabla `stocks_cache` compartida entre sesiones.

---

## 8. Próximos pasos posibles

Estos pasos **no están comprometidos** — son candidatos naturales según la trayectoria del proyecto:

1. **Backend propio con Supabase** — API server-side (Edge Function o servicio Node) con `service_role` para historial de conversiones persistente y tabla `stocks_cache` compartida entre sesiones.
2. **Migración del caché de acciones a Supabase** — tabla `stocks_cache` con TTL; reduce llamadas a Twelve Data cuando múltiples usuarios consultan los mismos símbolos (TODO ya documentado en `stocksService.js`).
3. **Persistencia del historial** — guardar conversiones en Supabase en lugar de memoria.
4. **Ampliar `LOCAL_STOCKS`** — agregar listas de acciones locales para más divisas (ZAR, AUD, INR, etc.) con 2 símbolos cada una.
5. **Gráfico de tendencia de divisas** — consumir el endpoint histórico de frankfurter.app (`/YYYY-MM-DD..YYYY-MM-DD`) para mostrar la evolución del par en los últimos 30 días.
6. **Actualización automática de tasas** — polling cada N minutos con `setInterval` en `useEffect`, con indicador visual.
7. **Modo oscuro** — aprovechar las variables `--f-*` ya definidas para alternar paleta con `prefers-color-scheme`.
8. **Limpieza de `index.css`** — auditar y consolidar en `App.css`.

---

## 10. Convenciones de código

### 10.1 Nota sobre `index.css` vs `App.css`

`index.css` (template de Vite) define `font-size: 18px` en `:root`, lo que afecta las unidades `rem` globales. `App.css` usa `body { font-size: 14px }` y valores `px` fijos en todos los componentes Fiori para evitar la herencia. No mezclar `rem` en estilos Fiori — usar `px` directamente.

### 10.2 Datos

- Todo dato estático vive en `src/data/countriesData.js`. Cero datos en `App.jsx`.
- Exports nombrados para arrays/objetos derivados (`CURRENCIES`, `FALLBACK_RATES`). Export default para el objeto primario (`COUNTRY_DATA`).
- Constantes de módulo en `UPPER_SNAKE_CASE`.

### 10.3 Componentes

- Componentes auxiliares definidos en el mismo archivo que su consumidor mientras sean de uso único. Si un componente crece o se reutiliza, moverlo a `src/components/`.
- `CountryCard` y `CurrencySelect` están actualmente en `App.jsx` por ser exclusivos de esa vista.

### 10.4 Estilos CSS

- Variables de diseño Fiori con prefijo `--f-` en `:root` de `App.css`.
- Nombres de clase en `kebab-case`. Elementos hijo con guión: `.country-card-header`, `.country-card-body`.
- Modificadores con doble guión: `.country-cards--single`.
- Secciones delimitadas con comentario: `/* ── Nombre ──────... */`.
- El `@media (max-width: 540px)` va siempre al final del archivo.

### 10.5 Lógica asíncrona

- Patrón fijo para llamadas a la API: `setLoading(true)` → `setError(null)` → `try/catch/finally` → `setLoading(false)` en `finally`.
- El `catch` siempre hace `console.error('[contexto]', err)` antes de actualizar el estado de error, para facilitar el debugging.
- El estado `rates` nunca se limpia en el `catch` — se preservan las últimas tasas válidas.

### 10.6 Formateo de números

`formatResult(value, code)` usa `Intl.NumberFormat` con locale `es-ES`. El número de decimales lo determina `COUNTRY_DATA[code]?.decimals ?? 2`: si la entrada tiene `decimals: 0`, se formatea sin centavos; si no tiene el campo, el default es 2.

---

## 11. Flujo de trabajo Git

### Modelo de ramas

| Rama | Propósito |
|---|---|
| `main` | Código en producción. Solo recibe merges desde `develop` vía PR. |
| `develop` | Rama de integración. Recibe features y fixes terminados. |
| `feature/<nombre>` | Nuevas funcionalidades, creada desde `develop`. |
| `fix/<nombre>` | Corrección de bugs, creada desde `develop`. |

### Convenciones de commits

Formato: `<tipo>: <descripción en imperativo>`

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad visible para el usuario |
| `fix` | Corrección de bug |
| `chore` | Mantenimiento (configs, `.gitignore`, tooling) |
| `docs` | Cambios solo en documentación |
| `refactor` | Refactor sin cambio de comportamiento |

### Integración vía Pull Request

Los merges a `develop` y de `develop` a `main` se realizan a través de Pull Requests en GitHub. No se hace push directo a `main`.

### Archivos excluidos del repositorio

`.claude/settings.local.json` está en `.gitignore`. Contiene permisos de herramientas locales de Claude Code que son específicos de cada entorno de desarrollo y no deben compartirse ni versionarse.

# Contexto del proyecto — Currency Converter

> Documento de referencia para iniciar una sesión nueva de Claude Code.
> Refleja el estado del proyecto al 20-05-2026.

---

## 1. Descripción general

Aplicación web de conversión de divisas que cubre **30 monedas** de América (10), Europa (10), Asia (7), África (5) y Oceanía (3). Obtiene tasas de cambio en tiempo real desde la API pública de frankfurter.app y muestra, para cada moneda seleccionada, una card con datos económicos del país emisor. Incluye un ticker animado con las 10 acciones globales más relevantes y un modal de mercado local por divisa.

La interfaz sigue el sistema de diseño **SAP Fiori**: paleta azul `#0070F2`, fondo gris claro `#F5F6F7`, cards blancas, tipografía limpia, indicadores semánticos de estado.

---

## 2. Stack tecnológico

| Capa | Tecnología | Notas |
|---|---|---|
| UI | React 19.2.5 · Vite 8.0.10 | Frontend en Vercel |
| Estilos | CSS puro con custom properties | Variables `--f-*` en `:root` |
| HTTP (frontend) | `fetch` nativo · `api-client.js` | Toda llamada sale por `apiFetch()` |
| Backend | Node.js/Express en Render | https://currency-converter-api-gk8z.onrender.com |
| Base de datos | Supabase (PostgreSQL) | Accedida solo desde el backend |
| Tasas de cambio | frankfurter.app | Consultada solo desde el backend |
| API de acciones | Twelve Data (800 req/día) | Consultada solo desde el backend |
| Empaquetador JSX | `@vitejs/plugin-react` (Babel) 6.0.1 | — |
| Linting | ESLint + plugins react-hooks / react-refresh 10.x | — |

**Sin librerías adicionales de UI, routing ni estado global.** Restricción explícita del proyecto.

---

## 3. Estructura de archivos

```
currency-converter/
│
├── index.html                  # Punto de entrada HTML. Sin CSP, sin meta adicional.
├── vite.config.js              # Config de Vite. Proxy /api/frankfurter heredado (ya inactivo).
├── vercel.json                 # Rewrite /api/frankfurter heredado (ya inactivo).
├── package.json                # Dependencias: react, react-dom, tooling Vite, @supabase/supabase-js.
├── .env                        # Variables locales (gitignored): VITE_API_URL=http://localhost:3001
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
    │   └── countriesData.js    # Fallback local: 27 monedas. Respaldo si el backend no responde.
    │
    ├── lib/
    │   └── supabase.js         # Cliente Supabase (ya no usado desde el frontend; conservado).
    │
    └── services/
        ├── api-client.js       # Capa HTTP base. apiFetch(path) → VITE_API_URL + path. Punto único de salida.
        ├── api.js              # fetchRates(): GET /api/rates?base=USD al backend.
        ├── countriesService.js # getCountriesData(): GET /api/currencies al backend; fallback local.
        └── stocksService.js    # fetchStockList(): GET /api/stocks/global o /api/stocks/{code} al backend.
```

### Propósito detallado de cada archivo

**`vite.config.js`**
El proxy `/api/frankfurter/*` está **heredado y ya no activo**: el frontend dejó de llamar a frankfurter directamente tras la migración al backend propio. Se conserva para no introducir cambios de rotura; puede eliminarse en una limpieza futura.

**`vercel.json`**
El rewrite `/api/frankfurter/:path*` está **heredado y ya no activo** por la misma razón. Puede eliminarse junto con `vite.config.js`.

**`src/services/api-client.js`**
Capa HTTP base del frontend. `apiFetch(path, options)` construye `${VITE_API_URL}${path}` y delega a `fetch`. Es el **único punto de salida HTTP** del frontend — ningún otro servicio llama a `fetch` directamente. `VITE_API_URL` vale `http://localhost:3001` en local y la URL del backend en Render en producción.

**`src/data/countriesData.js`**
Objeto `COUNTRY_DATA` con una entrada por moneda (27 en total). Actúa como **fallback local** si el backend no responde: `getCountriesData()` en `countriesService.js` lo usa en el bloque `catch`. A partir de este objeto se derivan y exportan `CURRENCIES` y `FALLBACK_RATES`. Las 30 monedas en producción provienen del backend; este archivo cubre las 27 originales.

**`src/lib/supabase.js`**
Cliente Supabase inicializado con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Ya no se usa desde el frontend tras la migración al backend propio. Se conserva por si se necesita en el futuro; ningún servicio lo importa actualmente.

**`src/services/countriesService.js`**
`getCountriesData()` hace `GET /api/currencies` al backend mediante `apiFetch`. Mapea la respuesta al esquema interno (`countryData`, `currencies`, `fallbackRates`). En el `catch` devuelve los datos locales de `countriesData.js`.

**`src/services/api.js`**
`fetchRates(fallbackRates = {})` hace `GET /api/rates?base=USD` al backend. El merge final es `{ USD: 1, ...fallbackRates, ...rates }`: los `fallback_rate` del backend cubren monedas no rastreadas por el BCE; las tasas en vivo sobrescriben donde hay cobertura.

**`src/services/stocksService.js`**
`fetchStockList(symbols)` llama al backend: `/api/stocks/global` para las 10 acciones del ticker, `/api/stocks/{code}` para las 2 acciones del modal (USD, EUR, GBP, JPY, CNY). El backend gestiona la caché y los límites de Twelve Data. `GLOBAL_STOCKS` alimenta el ticker; `LOCAL_STOCKS` alimenta el modal.

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

## 4. Arquitectura de datos — Frontend → Backend → APIs externas

### Flujo completo

**Desarrollo (`npm run dev`):**
```
App.jsx
  ├── api.js → apiFetch('/api/rates?base=USD')
  ├── countriesService.js → apiFetch('/api/currencies')
  └── stocksService.js → apiFetch('/api/stocks/global' | '/api/stocks/{code}')
        ↓
  api-client.js: fetch('http://localhost:3001' + path)
        ↓
  Backend local (puerto 3001)
        ├── GET /api/rates → frankfurter.app
        ├── GET /api/currencies → Supabase tabla currencies
        └── GET /api/stocks/* → Twelve Data
```

**Producción:**
```
Frontend (Vercel: currency-converter-one-iota-39.vercel.app)
        ↓ VITE_API_URL = https://currency-converter-api-gk8z.onrender.com
Backend (Render: currency-converter-api-gk8z.onrender.com)
        ├── GET /api/rates → https://api.frankfurter.app/latest?base=USD
        ├── GET /api/currencies → Supabase tabla currencies (service_role)
        └── GET /api/stocks/* → api.twelvedata.com
```

El frontend usa la misma llamada `apiFetch(path)` en ambos entornos; solo cambia `VITE_API_URL`.

### Monedas no cubiertas por el BCE

Varias monedas no están en la respuesta de frankfurter.app (ARS, CLP, COP, PEN, UYU, BOB,
NGN, EGP, KES, MAD, FJD y otras). Sus tasas estáticas viven en la columna `fallback_rate`
de la tabla `currencies` en Supabase. El backend las devuelve junto con las tasas en vivo
en `GET /api/rates`; `api.js` las aplica con el merge `{ USD:1, ...fallbackRates, ...rates }`.

### Variables de entorno del frontend

| Variable | Valor local | Valor producción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | `https://currency-converter-api-gk8z.onrender.com` |

Las claves de Supabase y Twelve Data **no se necesitan en el frontend** — viven en el backend.

---

## 5. Integración con Supabase (vía backend)

### 5.0 Base de datos

La tabla `currencies` en Supabase contiene **30 registros** (22 originales + 5 África + 3 Oceanía). Columnas: `code` (PK), `country`, `flag`, `continent`, `name`, `symbol`, `fallback_rate`, `decimals`, `central_bank`, `inflation`, `gdp`, `fun_fact`.

La columna `fallback_rate` es la **única fuente de tasas estáticas** del proyecto. El backend la expone en `GET /api/rates` junto con las tasas en vivo de frankfurter. No hay tasas hardcodeadas en el frontend.

### 5.0.1 Acceso desde el backend

El backend en Render accede a Supabase con la `service_role` key, lo que le permite operaciones de lectura y escritura sin restricciones de RLS. Esto habilita, en el futuro, guardar historial de conversiones y una tabla `stocks_cache` compartida.

El frontend ya **no** tiene variables de entorno de Supabase — `src/lib/supabase.js` existe pero no se importa en ningún servicio activo.

### 5.0.2 Variables de entorno (backend en Render)

| Variable | Propósito |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Acceso completo a la BD |
| `TWELVE_DATA_KEY` | API de acciones |

### 5.0.3 Arquitectura en capas

```
App.jsx
  └── countriesService.js   ← llama a apiFetch('/api/currencies')
        └── api-client.js   ← fetch(VITE_API_URL + path)
              └── Backend (Render)
                    └── Supabase tabla currencies (service_role)
```

El frontend no toca Supabase directamente. Si la fuente de datos cambia, solo se toca el backend y `countriesService.js`.

---

## 6. Decisiones técnicas y su razón

### 6.1 Backend propio como intermediario único

**Decisión:** todo acceso a APIs externas (frankfurter, Supabase, Twelve Data) pasa por el backend en Render. El frontend solo conoce `VITE_API_URL`.  
**Razón:** elimina la exposición de API keys en el frontend, centraliza la lógica de caché y merge de tasas, y habilita la `service_role` de Supabase para operaciones de escritura futuras (historial, stocks_cache). También resuelve el problema de CORS sin necesidad de proxies declarativos en `vite.config.js` / `vercel.json`.  
**Tradeoff:** introduce una dependencia en la disponibilidad de Render (cold starts en el plan gratuito). El fallback local en `countriesService.js` mitiga el impacto en datos de países.

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

### 6.7 `api-client.js` como capa de abstracción HTTP

**Decisión:** `apiFetch(path, options)` en `src/services/api-client.js` como única función que llama a `fetch` en el frontend.  
**Razón:** centraliza la construcción de la URL base (`VITE_API_URL`), facilita el logging de peticiones, y permite cambiar el backend o agregar headers globales (auth, version) en un solo lugar.  
**Tradeoff:** mínimo — una indirección extra de función. Los servicios que usan `apiFetch` no necesitan conocer `VITE_API_URL`.

### 6.8 `CountryCard` retorna `null` para códigos sin datos

**Decisión:** `if (!data) return null` como primera línea de `CountryCard`.  
**Razón:** Hace el componente tolerante a gaps en los datos sin requerir lógica defensiva en el padre. Si en el futuro se agrega una moneda nueva sin agregar su entrada en `countriesData.js`, la card simplemente no aparece — sin error de runtime.

---

## 9. Estado detallado del proyecto

### Funcionalidad implementada
- [x] Conversión entre 30 monedas (América, Europa, Asia, África, Oceanía)
- [x] Tasas reales vía backend (frankfurter.app) con actualización manual
- [x] `fallback_rate` unificado en Supabase para monedas no cubiertas por BCE
- [x] Card informativa por moneda: país, banco central, inflación, PIB, dato curioso
- [x] Botón "Ver mercado" en cada card → modal de mercado local
- [x] Indicadores de estado: éxito (verde), error (rojo) al actualizar tasas
- [x] Botón de intercambio con animación
- [x] Diseño SAP Fiori completo con shell bar, paleta azul, responsive
- [x] Historial de últimas 5 conversiones de la sesión (en memoria, no persistente)
- [x] Frontend en Vercel: https://currency-converter-one-iota-39.vercel.app/
- [x] **Backend propio en Render:** https://currency-converter-api-gk8z.onrender.com
- [x] Migración completa: frontend no llama a ninguna API externa directamente
- [x] `api-client.js` como punto único de salida HTTP del frontend
- [x] Ticker de acciones globales animado (10 símbolos, sticky bajo shell bar)
- [x] Modal de mercado local por divisa (2 acciones, sparkline 7 días, sin pestañas)
- [x] Caché de acciones gestionada en el backend

### Limitaciones conocidas
- Los datos económicos de `countriesData.js` (inflación, PIB) son estáticos y aproximados a mayo 2026.
- El historial de conversiones vive en memoria: se pierde al recargar la página.
- El backend en Render (plan gratuito) puede tener cold starts de ~30 segundos tras inactividad.
- `vite.config.js` y `vercel.json` conservan el proxy de frankfurter heredado (ya inactivo).
- `index.css` y `src/assets/` tienen remanentes del template Vite sin auditar.
- `LOCAL_STOCKS` solo tiene listas para USD, EUR, GBP, JPY y CNY; el resto usa `GLOBAL_STOCKS.slice(0,2)` como fallback.

---

## 7. Estado actual del proyecto

### Etapa 1 — Completada
Conversión en tiempo real, fallback, country cards, diseño Fiori, deploy Vercel con proxy CORS.

### Etapa 2 — Completada
Integración con Supabase: tabla `currencies` (30 registros), RLS activo, arquitectura en capas, `fallback_rate` unificado como única fuente de tasas estáticas.

### Etapa 3 — Completada
Datos de acciones vía Twelve Data: ticker animado en header, modal de mercado local por divisa, sparkline 7 días.

### Etapa 4 — Completada
Backend propio en Render (`https://currency-converter-api-gk8z.onrender.com`): intermediario único entre el frontend y todas las APIs externas (frankfurter, Supabase, Twelve Data). El frontend usa `api-client.js` con `VITE_API_URL` como único punto de salida HTTP. La `service_role` de Supabase vive solo en el backend.

---

## 8. Próximos pasos posibles

Estos pasos **no están comprometidos** — son candidatos naturales según la trayectoria del proyecto:

1. **Historial persistente de conversiones** — el backend ya tiene acceso a Supabase con `service_role`; solo falta el endpoint `POST /api/history` y la tabla correspondiente.
2. **Caché de acciones en Supabase** — tabla `stocks_cache` con TTL compartida entre sesiones; el backend ya gestiona la lógica, solo falta persistirla en BD en lugar de memoria.
3. **Limpieza de proxies heredados** — eliminar la regla de frankfurter en `vite.config.js` y `vercel.json` (ya inactiva).
4. **Ampliar `LOCAL_STOCKS`** — agregar listas de acciones locales para más divisas (ZAR, AUD, INR, etc.) con 2 símbolos cada una.
5. **Gráfico de tendencia de divisas** — endpoint en el backend que consulte el histórico de frankfurter.app para los últimos 30 días.
6. **Actualización automática de tasas** — polling cada N minutos con `setInterval` en `useEffect`.
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

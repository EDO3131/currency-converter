# Contexto del proyecto — Currency Converter

> Documento de referencia para iniciar una sesión nueva de Claude Code.
> Refleja el estado del proyecto al 12-05-2026.

---

## 1. Descripción general

Aplicación web de conversión de divisas que cubre **27 monedas** de América (10), Europa (10) y Asia (7). Obtiene tasas de cambio en tiempo real desde la API pública de frankfurter.app y muestra, para cada moneda seleccionada, una card con datos económicos del país emisor.

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
├── .env                        # Variables locales (gitignored): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
│
├── docs/
│   └── CONTEXT.md              # Este archivo.
│
└── src/
    ├── main.jsx                # Monta <App> en #root dentro de <StrictMode>.
    ├── index.css               # CSS del template original de Vite. Ver nota §8.1.
    │
    ├── App.jsx                 # Componente raíz. Solo lógica y presentación, sin datos.
    ├── App.css                 # Sistema de diseño Fiori completo. Variables en :root.
    │
    ├── data/
    │   └── countriesData.js    # Única fuente de verdad de todos los datos de monedas.
    │
    ├── lib/
    │   └── supabase.js         # Cliente Supabase (createClient). Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
    │
    └── services/
        ├── api.js              # Capa HTTP: fetch a frankfurter.app vía proxy (Vite en dev, Vercel en prod).
        └── countriesService.js # Capa de acceso a Supabase: consulta tabla currencies con SELECT público.
```

### Propósito detallado de cada archivo

**`vite.config.js`**
Configura el proxy del servidor de desarrollo para redirigir `/api/frankfurter/*` a `https://api.frankfurter.app/*`. Esto evita el bloqueo CORS que el navegador aplica a `fetch()` cross-origin (no aplica a navegación directa en barra de direcciones). Sin este proxy, la app muestra el error de tasas aunque la API funcione correctamente en el navegador.

**`vercel.json`**
Configura los rewrites del edge de Vercel para producción. La regla `"/api/frankfurter/:path*"` → `"https://api.frankfurter.app/:path*"` replica lo que hace el proxy de Vite, pero ejecutándose en la infraestructura de Vercel (server-side). `api.js` usa la misma URL relativa en ambos entornos sin ningún cambio.

**`src/data/countriesData.js`**
Objeto `COUNTRY_DATA` con una entrada por moneda (27 en total). Cada entrada contiene: `country`, `flag`, `region`, `currency`, `symbol`, `fallbackRate`, `decimals` (solo si es 0), `centralBank`, `inflation`, `gdp`, `fact`. A partir de este objeto se derivan y exportan `CURRENCIES` (array para los selectores) y `FALLBACK_RATES` (objeto para el estado inicial de tasas). Es el único lugar donde viven datos — `App.jsx` no contiene ningún dato estático.

**`src/lib/supabase.js`**
Inicializa y exporta el cliente de Supabase usando `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. Es el único lugar donde vive el cliente — el resto del código lo importa desde aquí. No contiene lógica de negocio.

**`src/services/countriesService.js`**
Capa de acceso a datos sobre Supabase. Expone funciones que consultan la tabla `currencies` mediante SELECT público (permitido por RLS con anon key). Actúa como adaptador entre el esquema de la base de datos y las estructuras que espera el resto de la app.

**`src/services/api.js`**
Función `fetchRates()` que hace `GET /api/frankfurter/latest?base=USD` (URL relativa → Vite proxy → API externa). Mezcla la respuesta con `STATIC_RATES` para las 6 monedas latinoamericanas no cubiertas por el BCE. Lanza un error si HTTP status ≠ 2xx, que el componente captura para mostrar el mensaje de estado.

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

Las siguientes 6 monedas **no están en la respuesta de la API** (el BCE no las rastrea). Se mantienen con tasas estáticas en `api.js` como `STATIC_RATES`, que se mezclan antes de que la API pueda sobreescribirlas:

| Código | Moneda | Tasa estática vs USD |
|---|---|---|
| ARS | Peso argentino | 1100.0 |
| CLP | Peso chileno | 960.0 |
| COP | Peso colombiano | 4300.0 |
| PEN | Sol peruano | 3.75 |
| UYU | Peso uruguayo | 42.0 |
| BOB | Boliviano | 6.91 |

---

## 5. Integración con Supabase

### 5.0 Base de datos

La tabla `currencies` en Supabase contiene **22 registros** con los datos de las monedas principales. Columnas representativas: `code` (PK), `country`, `flag`, `region`, `currency_name`, `symbol`, `fallback_rate`, `decimals`, `central_bank`, `inflation`, `gdp`, `fact`.

Las 5 monedas restantes (hasta 27) aún se sirven exclusivamente desde `countriesData.js`.

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
- [x] Conversión entre 27 monedas (América, Europa, Asia)
- [x] Tasas reales desde frankfurter.app con actualización manual
- [x] Tasas de fallback para las 6 monedas no cubiertas por BCE
- [x] Card informativa por moneda: país, banco central, inflación, PIB, dato curioso
- [x] Indicadores de estado: éxito (verde), error (rojo) al actualizar tasas
- [x] Botón de intercambio con animación
- [x] Diseño SAP Fiori completo con shell bar, paleta azul, responsive
- [x] Datos centralizados en `countriesData.js` (sin datos en el componente)
- [x] Historial de últimas 5 conversiones de la sesión (en memoria, no persistente)
- [x] Deploy en producción: https://currency-converter-one-iota-39.vercel.app/
- [x] Proxy en producción via `vercel.json` (resuelve CORS en Vercel)
- [x] Integración con Supabase: tabla `currencies` con 22 registros reales
- [x] Row Level Security: SELECT público (anon key), INSERT/UPDATE/DELETE bloqueados desde frontend
- [x] Variables de entorno configuradas en `.env` (local) y en el dashboard de Vercel (producción)
- [x] Arquitectura en capas: `src/lib/supabase.js` + `src/services/countriesService.js`

### Limitaciones conocidas
- Las tasas de las 6 monedas latinoamericanas (ARS, CLP, COP, PEN, UYU, BOB) son estáticas permanentemente — no hay API gratuita confiable que las cubra.
- Los datos económicos de `countriesData.js` (inflación, PIB) son estáticos y aproximados a mayo 2026. No se actualizan automáticamente.
- El historial de conversiones vive en memoria: se pierde al recargar la página.
- `vercel.json` resuelve CORS solo para Vercel. Un deploy en otro host necesitaría configuración de proxy equivalente.
- `index.css` contiene variables del template de Vite que no se usan pero no se eliminaron para evitar efectos secundarios no explorados.
- Los assets `src/assets/hero.png`, `react.svg` y `vite.svg` son del template de Vite y no están en uso.
- La tabla `currencies` en Supabase tiene 22 registros; las 5 monedas restantes hasta 27 aún no tienen fila en la BD (se sirven desde `countriesData.js`).

---

## 7. Estado actual del proyecto

### Etapa 1 — Completada
Conversión en tiempo real, fallback, country cards, diseño Fiori, deploy Vercel con proxy CORS.

### Etapa 2 — Completada
Integración con Supabase: tabla `currencies` (22 registros), RLS activo, arquitectura en capas (`supabase.js` + `countriesService.js`), variables de entorno en local y Vercel, app en producción conectada a BD real.

### Etapa 3 — Pendiente
Backend propio: API server-side que use `service_role` para escribir en Supabase e implemente historial persistente de conversiones.

---

## 8. Próximos pasos posibles

Estos pasos **no están comprometidos** — son candidatos naturales según la trayectoria del proyecto:

1. **Backend propio con Supabase** — API server-side (Edge Function o servicio Node) que consulte frankfurter.app y almacene el historial de conversiones en Supabase. La `service_role` key se habilitará solo en ese contexto, nunca expuesta al frontend.
2. **Persistencia del historial** — usar Supabase para guardar conversiones de forma persistente en lugar de memoria o `localStorage`.
3. **Completar los 27 registros en Supabase** — las 5 monedas restantes aún no tienen fila en la tabla `currencies`; agregarlas para que la BD sea la única fuente de verdad.
4. **Gráfico de tendencia** — consumir el endpoint histórico de frankfurter.app (`/YYYY-MM-DD..YYYY-MM-DD?from=USD&to=EUR`) para mostrar la evolución del par en los últimos 30 días.
5. **Actualización automática** — polling cada N minutos usando `setInterval` en un `useEffect`, con indicador visual de "actualizando".
6. **Modo oscuro** — aprovechar las variables `--f-*` ya definidas en `:root` para alternar paleta con una clase en `<body>` y `prefers-color-scheme`.
7. **Limpieza de `index.css`** — auditar qué variables del template original siguen activas y eliminar las que no apliquen, consolidando toda la hoja de estilos en `App.css`.

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

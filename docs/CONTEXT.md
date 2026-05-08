# Contexto del proyecto — Currency Converter

> Documento de referencia para iniciar una sesión nueva de Claude Code.
> Refleja el estado del proyecto al 07-05-2026.

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

**Sin librerías adicionales de UI, routing, estado global ni HTTP.** Restricción explícita del proyecto.

---

## 3. Estructura de archivos

```
currency-converter/
│
├── index.html                  # Punto de entrada HTML. Sin CSP, sin meta adicional.
├── vite.config.js              # Config de Vite + proxy de desarrollo para CORS.
├── package.json                # Dependencias. Solo react, react-dom y tooling de Vite.
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
    └── services/
        └── api.js              # Capa HTTP: fetch a frankfurter.app vía proxy de Vite.
```

### Propósito detallado de cada archivo

**`vite.config.js`**
Configura el proxy del servidor de desarrollo para redirigir `/api/frankfurter/*` a `https://api.frankfurter.app/*`. Esto evita el bloqueo CORS que el navegador aplica a `fetch()` cross-origin (no aplica a navegación directa en barra de direcciones). Sin este proxy, la app muestra el error de tasas aunque la API funcione correctamente en el navegador.

**`src/data/countriesData.js`**
Objeto `COUNTRY_DATA` con una entrada por moneda (27 en total). Cada entrada contiene: `country`, `flag`, `region`, `currency`, `symbol`, `fallbackRate`, `decimals` (solo si es 0), `centralBank`, `inflation`, `gdp`, `fact`. A partir de este objeto se derivan y exportan `CURRENCIES` (array para los selectores) y `FALLBACK_RATES` (objeto para el estado inicial de tasas). Es el único lugar donde viven datos — `App.jsx` no contiene ningún dato estático.

**`src/services/api.js`**
Función `fetchRates()` que hace `GET /api/frankfurter/latest?base=USD` (URL relativa → Vite proxy → API externa). Mezcla la respuesta con `STATIC_RATES` para las 6 monedas latinoamericanas no cubiertas por el BCE. Lanza un error si HTTP status ≠ 2xx, que el componente captura para mostrar el mensaje de estado.

**`src/App.jsx`**
Contiene tres componentes y la lógica de la aplicación:
- `CurrencySelect` — selector con optgroups por región (América / Europa / Asia).
- `CountryCard` — card informativa con datos económicos del país. Retorna `null` si el código no tiene entrada en `COUNTRY_DATA`.
- `App` — componente principal con estado (`amount`, `from`, `to`, `rotating`, `rates`, `loading`, `error`, `lastUpdated`), función `loadRates()` (async, con try/catch/finally), y el árbol JSX completo.

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

### Flujo completo en desarrollo

```
Navegador → fetch('/api/frankfurter/latest?base=USD')
         → Vite dev server (proxy)
         → https://api.frankfurter.app/latest?base=USD
         → respuesta JSON → api.js → App.jsx
```

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

## 5. Decisiones técnicas y su razón

### 5.1 Proxy de Vite en lugar de llamada directa a la API

**Decisión:** `fetch('/api/frankfurter/...')` con rewrite en `vite.config.js`.  
**Razón:** El navegador bloquea `fetch()` cross-origin si el servidor no responde con `Access-Control-Allow-Origin`. Aunque frankfurter.app soporta CORS, infraestructura de red intermedia (proxies corporativos, antivirus) puede eliminar esas cabeceras. El proxy de Vite hace la petición desde Node.js (sin restricciones de CORS) y devuelve la respuesta al navegador como si fuera del mismo origen.  
**Tradeoff:** El proxy solo funciona con `npm run dev`. En producción se necesitaría un proxy equivalente en el servidor de hosting o usar una URL externa directa (si CORS funciona en ese entorno).

### 5.2 `countriesData.js` como única fuente de verdad

**Decisión:** `CURRENCIES` y `FALLBACK_RATES` se derivan de `COUNTRY_DATA` con `Object.entries().map()` y `Object.fromEntries()`.  
**Razón:** Antes existían tres objetos paralelos en `App.jsx` que compartían `flag`, `symbol` y nombre de moneda. Cualquier corrección requería editar en dos lugares. Ahora agregar una moneda nueva requiere tocar solo `countriesData.js`.

### 5.3 `decimals` co-ubicado en `COUNTRY_DATA` en lugar de `LARGE_DECIMALS` separado

**Decisión:** Las entradas de ARS, CLP, COP, HUF, JPY y KRW tienen `decimals: 0`. `formatResult()` lee `COUNTRY_DATA[code]?.decimals ?? 2`.  
**Razón:** Un `Set` de códigos separado es una lista paralela que duplica conocimiento. Al poner `decimals: 0` en la misma entrada que describe la moneda, la regla y su justificación están en el mismo lugar.

### 5.4 `FALLBACK_RATES` como estado inicial (no pantalla vacía)

**Decisión:** `useState(FALLBACK_RATES)` como valor inicial de `rates`.  
**Razón:** La app es funcional desde el primer render, antes de que la llamada a la API complete. El usuario ve un convertidor operativo con tasas aproximadas mientras se cargan las reales. Evita una pantalla en blanco o un estado de carga que bloquee la interacción.

### 5.5 Manejo de error no destructivo

**Decisión:** El `catch` de `loadRates()` muestra un mensaje pero no limpia `rates`.  
**Razón:** Si la API falla en un refresco manual, el usuario conserva las últimas tasas cargadas. La app nunca queda en estado roto.

### 5.6 Sin librerías adicionales

**Decisión:** `fetch` nativo, CSS puro, sin Axios, React Query, Tailwind, etc.  
**Razón:** Restricción explícita del proyecto para mantener el footprint mínimo y usar solo lo nativo del navegador.

### 5.7 `CountryCard` retorna `null` para códigos sin datos

**Decisión:** `if (!data) return null` como primera línea de `CountryCard`.  
**Razón:** Hace el componente tolerante a gaps en los datos sin requerir lógica defensiva en el padre. Si en el futuro se agrega una moneda nueva sin agregar su entrada en `countriesData.js`, la card simplemente no aparece — sin error de runtime.

---

## 6. Estado actual del proyecto

### Funcionalidad implementada
- [x] Conversión entre 27 monedas (América, Europa, Asia)
- [x] Tasas reales desde frankfurter.app con actualización manual
- [x] Tasas de fallback para las 6 monedas no cubiertas por BCE
- [x] Card informativa por moneda: país, banco central, inflación, PIB, dato curioso
- [x] Indicadores de estado: éxito (verde), error (rojo) al actualizar tasas
- [x] Botón de intercambio con animación
- [x] Diseño SAP Fiori completo con shell bar, paleta azul, responsive
- [x] Datos centralizados en `countriesData.js` (sin datos en el componente)

### Limitaciones conocidas
- Las tasas de las 6 monedas latinoamericanas (ARS, CLP, COP, PEN, UYU, BOB) son estáticas permanentemente — no hay API gratuita confiable que las cubra.
- Los datos económicos de `countriesData.js` (inflación, PIB) son estáticos y aproximados a mayo 2026. No se actualizan automáticamente.
- El proxy de Vite solo funciona en desarrollo (`npm run dev`). Para producción se requiere configuración adicional de servidor.
- `index.css` contiene variables del template de Vite que no se usan pero no se eliminaron para evitar efectos secundarios no explorados.
- Los assets `src/assets/hero.png`, `react.svg` y `vite.svg` son del template de Vite y no están en uso.

---

## 7. Próximos pasos posibles

Estos pasos **no están comprometidos** — son candidatos naturales según la trayectoria del proyecto:

1. **Historial de conversiones** — mostrar las últimas N conversiones realizadas en la sesión, usando `useState` con un array.
2. **Gráfico de tendencia** — consumir el endpoint histórico de frankfurter.app (`/YYYY-MM-DD..YYYY-MM-DD?from=USD&to=EUR`) para mostrar la evolución del par en los últimos 30 días.
3. **Actualización automática** — polling cada N minutos usando `setInterval` en un `useEffect`, con indicador visual de "actualizando".
4. **Modo oscuro** — aprovechar las variables `--f-*` ya definidas en `:root` para alternar paleta con una clase en `<body>` y `prefers-color-scheme`.
5. **Configuración de producción** — definir estrategia de proxy para el build final (servidor Express, Nginx reverse proxy, o función serverless).
6. **Limpieza de `index.css`** — auditar qué variables del template original siguen activas y eliminar las que no apliquen, consolidando toda la hoja de estilos en `App.css`.

---

## 8. Convenciones de código

### 8.1 Nota sobre `index.css` vs `App.css`

`index.css` (template de Vite) define `font-size: 18px` en `:root`, lo que afecta las unidades `rem` globales. `App.css` usa `body { font-size: 14px }` y valores `px` fijos en todos los componentes Fiori para evitar la herencia. No mezclar `rem` en estilos Fiori — usar `px` directamente.

### 8.2 Datos

- Todo dato estático vive en `src/data/countriesData.js`. Cero datos en `App.jsx`.
- Exports nombrados para arrays/objetos derivados (`CURRENCIES`, `FALLBACK_RATES`). Export default para el objeto primario (`COUNTRY_DATA`).
- Constantes de módulo en `UPPER_SNAKE_CASE`.

### 8.3 Componentes

- Componentes auxiliares definidos en el mismo archivo que su consumidor mientras sean de uso único. Si un componente crece o se reutiliza, moverlo a `src/components/`.
- `CountryCard` y `CurrencySelect` están actualmente en `App.jsx` por ser exclusivos de esa vista.

### 8.4 Estilos CSS

- Variables de diseño Fiori con prefijo `--f-` en `:root` de `App.css`.
- Nombres de clase en `kebab-case`. Elementos hijo con guión: `.country-card-header`, `.country-card-body`.
- Modificadores con doble guión: `.country-cards--single`.
- Secciones delimitadas con comentario: `/* ── Nombre ──────... */`.
- El `@media (max-width: 540px)` va siempre al final del archivo.

### 8.5 Lógica asíncrona

- Patrón fijo para llamadas a la API: `setLoading(true)` → `setError(null)` → `try/catch/finally` → `setLoading(false)` en `finally`.
- El `catch` siempre hace `console.error('[contexto]', err)` antes de actualizar el estado de error, para facilitar el debugging.
- El estado `rates` nunca se limpia en el `catch` — se preservan las últimas tasas válidas.

### 8.6 Formateo de números

`formatResult(value, code)` usa `Intl.NumberFormat` con locale `es-ES`. El número de decimales lo determina `COUNTRY_DATA[code]?.decimals ?? 2`: si la entrada tiene `decimals: 0`, se formatea sin centavos; si no tiene el campo, el default es 2.

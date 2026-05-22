# Currency Converter — Claude Code Context

Convertidor de monedas React + Vite. 30 divisas (América / Europa / Asia / África / Oceanía),
tasas en tiempo real desde frankfurter.app, diseño SAP Fiori, sin librerías adicionales.
**Frontend:** https://currency-converter-one-iota-39.vercel.app/
**Backend API:** https://currency-converter-api-gk8z.onrender.com

## Stack

- React 19.2.5 · Vite 8.0.10 · CSS puro · fetch nativo · Vercel (hosting frontend)
- **Backend propio** — Node.js/Express en Render. Intermediario único hacia todas las APIs externas.
- **Supabase** — BD: tabla `currencies` (30 registros) + tabla `conversion_history`. Auth con Supabase Auth (email/password + Google OAuth). Accedido solo desde el backend.
- **Twelve Data** — API de acciones (800 req/día), accedida solo desde el backend.
- **Restricción activa:** no instalar paquetes npm más allá de los existentes

## Estructura

```
src/
  App.jsx               # Componentes: CurrencySelect, CountryCard, ConversionHistory, AppContent, App.
  App.css               # Sistema de diseño Fiori completo. Variables --f-* en :root.
  context/
    AuthContext.jsx     # AuthProvider + useAuth(). Estado global: user, token, login/register/logout/Google.
  components/
    AuthModal.jsx       # Modal login/registro: email+contraseña y Google OAuth. Tabs login/registro.
    UserMenu.jsx        # Botón "Iniciar sesión" o avatar con menú desplegable (cerrar sesión).
    StocksTicker.jsx    # Ticker horizontal animado con las 10 acciones globales (header).
    StocksModal.jsx     # Modal de mercado local: tabla de acciones con mini gráfico.
    MiniChart.jsx       # Sparkline SVG 80×32px para la variación de 7 días.
  data/
    countriesData.js    # Fallback local: 27 monedas con sus datos (respaldo si el backend falla).
  lib/
    supabase.js         # Cliente Supabase (ya no se usa desde el frontend; conservado por si acaso).
  services/
    api-client.js       # Capa HTTP base: apiFetch(path) → VITE_API_URL + path. Punto único de salida.
    api.js              # fetchRates(): GET /api/rates?base=USD al backend.
    authService.js      # login(), register(), logoutApi(), getMe(), loginWithGoogle(). Llama al backend.
    historyService.js   # getHistory(), saveConversion(), deleteConversion(). Bearer token requerido.
    countriesService.js # getCountriesData(): GET /api/currencies al backend; fallback a datos locales.
    stocksService.js    # fetchStockList(): GET /api/stocks/global o /api/stocks/{code} al backend.
docs/
  CONTEXT.md            # Contexto extendido del proyecto (decisiones, historial).
.env                    # Variables locales (gitignored): VITE_API_URL=http://localhost:3001
vite.config.js          # Proxy heredado /api/frankfurter/* (ya no activo; frontend no llama a frankfurter)
vercel.json             # Rewrite heredado /api/frankfurter/* (ya no activo)
```

## Reglas que no romper

**Datos:** todo dato estático vive en `src/data/countriesData.js`.
`App.jsx` no debe contener arrays de monedas, tasas ni configuraciones.
`CURRENCIES` y `FALLBACK_RATES` se derivan del mismo objeto `COUNTRY_DATA`.

**Arquitectura frontend → backend:** el frontend **nunca** llama directamente a Supabase,
frankfurter.app ni Twelve Data. Toda petición de datos sale por `apiFetch()` en `api-client.js`
hacia el backend en Render (`VITE_API_URL`). La única excepción es el fallback local en
`countriesService.js` cuando el backend no responde.

**api-client.js:** punto único de salida HTTP del frontend. `apiFetch(path, options)` construye
`VITE_API_URL + path` y llama a `fetch`. No añadir llamadas HTTP fuera de este módulo.

**Variables de entorno (frontend):**
- `VITE_API_URL` — URL base del backend. Local: `http://localhost:3001`; producción: configurada en dashboard Vercel.
- Las claves de Supabase y Twelve Data ya no se necesitan en el frontend; viven solo en el backend (Render).

**Autenticación:** el frontend gestiona auth a través del backend (`/api/auth/*`). El token JWT de
Supabase Auth se almacena en `localStorage` con la clave `auth_token`. Google OAuth devuelve el
token en el hash de la URL (`#access_token=...`); el flujo de email/password lo recibe en el body.
`AuthContext.jsx` es el único consumidor de `authService.js` — no acceder al token desde fuera.

**Historial persistente:** `saveConversion()` y `getHistory()` en `historyService.js` requieren Bearer
token. Solo se llaman cuando `user && token` están presentes en `AuthContext`. Sin sesión, el historial
vive solo en memoria (máx. 5 entradas) y se borra al cerrar sesión.

**Seguridad:** ninguna API key ni credencial de servicio va al frontend ni al repositorio.
El backend en Render es el único que conoce `SUPABASE_SERVICE_ROLE_KEY`, `TWELVE_DATA_KEY`, etc.
La tabla `conversion_history` tiene RLS deshabilitado — la seguridad se aplica en el backend
validando el Bearer token en cada request antes de acceder a Supabase.

**Stocks:** `stocksService.js` llama al backend (`/api/stocks/global`, `/api/stocks/{code}`),
no a Twelve Data directamente. El backend gestiona caché, TTL y límites de la API.

**Decimales:** `formatResult()` lee `COUNTRY_DATA[code]?.decimals ?? 2`.
Las monedas sin centavos visibles (ARS, CLP, COP, HUF, JPY, KRW) tienen
`decimals: 0` en su entrada de `countriesData.js`.

**CSS:** usar valores `px` en estilos Fiori —no `rem`—. `index.css` fija
`font-size: 18px` en `:root` (template Vite sin modificar), lo que
distorsionaría los tamaños Fiori si se usaran unidades relativas.

## Estado actual

Implementado: 30 divisas (5 regiones), conversión en tiempo real, country cards con datos
económicos, diseño Fiori responsive, ticker animado de 10 acciones globales, modal de mercado
local (2 acciones, sparkline 7 días), historial de conversiones persistente en Supabase,
autenticación opcional (email/contraseña + Google OAuth).
**Backend propio desplegado en Render** — el frontend ya no llama a ninguna API externa
directamente; toda la lógica de Supabase Auth, frankfurter y Twelve Data vive en el backend.

Deuda conocida: `index.css` y `src/assets/` tienen remanentes del template
Vite que no se usan (no tocar sin auditar).
`vite.config.js` y `vercel.json` conservan el proxy de frankfurter heredado (ya inactivo).

## Flujo de ramas

```
main ← develop ← feature/<nombre>
                ← fix/<nombre>
```

Merges vía Pull Request. No push directo a `main`.
`.claude/settings.local.json` y `.env` excluidos del repo (en `.gitignore`).

## Próximas etapas posibles

- Limpieza de `vite.config.js` y `vercel.json`: eliminar el proxy de frankfurter ya inactivo.
- Ampliar `LOCAL_STOCKS` para más divisas (ZAR, AUD, INR, etc.).
- Caché de acciones en Supabase (`stocks_cache`) compartida entre sesiones.
- Botón para eliminar entradas del historial (el endpoint `DELETE /api/history/:id` ya existe).

## Convenciones

- Constantes de módulo: `UPPER_SNAKE_CASE`
- Clases CSS: `kebab-case`; modificadores: `bloque--modificador`
- Async: siempre `setLoading` → `setError(null)` → try/catch/finally
- El `catch` nunca limpia `rates`; preserva las últimas tasas válidas
- `CountryCard` retorna `null` si el código no tiene entrada en los datos

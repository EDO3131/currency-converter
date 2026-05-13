# Currency Converter — Claude Code Context

Convertidor de monedas React + Vite. 30 divisas (América / Europa / Asia / África / Oceanía),
tasas en tiempo real desde frankfurter.app, diseño SAP Fiori, sin librerías adicionales.
**Deploy activo:** https://currency-converter-one-iota-39.vercel.app/

## Stack

- React 19.2.5 · Vite 8.0.10 · CSS puro · fetch nativo · Vercel (hosting)
- **Supabase** (`@supabase/supabase-js`) — BD en producción: tabla `currencies` (30 registros), `fallback_rate` unificado
- **Twelve Data** — API de acciones (800 req/día). Key: `VITE_TWELVE_DATA_KEY`
- **Restricción activa:** no instalar paquetes npm más allá de los existentes

## Estructura

```
src/
  App.jsx               # Componentes: CurrencySelect, CountryCard, ConversionHistory, App.
  App.css               # Sistema de diseño Fiori completo. Variables --f-* en :root.
  components/
    StocksTicker.jsx    # Ticker horizontal animado con las 10 acciones globales (header).
    StocksModal.jsx     # Modal de mercado local: tabla de acciones con mini gráfico.
    MiniChart.jsx       # Sparkline SVG 80×32px para la variación de 7 días.
  data/
    countriesData.js    # Fallback local: 27 monedas con sus datos (respaldo si Supabase falla).
  lib/
    supabase.js         # Cliente Supabase inicializado con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
  services/
    api.js              # fetch a frankfurter.app vía proxy; acepta fallbackRates de Supabase.
    countriesService.js # Capa de acceso a Supabase: lee tabla currencies con SELECT público.
    stocksService.js    # Acceso a Twelve Data (quote + time_series). Caché en memoria Map.
docs/
  CONTEXT.md            # Contexto extendido del proyecto (decisiones, historial).
.env                    # Variables locales (gitignored): SUPABASE_*, VITE_TWELVE_DATA_KEY.
vite.config.js          # Proxy /api/frankfurter/* → https://api.frankfurter.app/* (solo dev)
vercel.json             # Rewrite equivalente para producción en Vercel
```

## Reglas que no romper

**Datos:** todo dato estático vive en `src/data/countriesData.js`.
`App.jsx` no debe contener arrays de monedas, tasas ni configuraciones.
`CURRENCIES` y `FALLBACK_RATES` se derivan del mismo objeto `COUNTRY_DATA`.

**Supabase / Seguridad:**
- El cliente en `src/lib/supabase.js` usa solo la `anon key` (variable `VITE_SUPABASE_ANON_KEY`).
- La tabla `currencies` tiene RLS activo: SELECT público permitido (anon key), INSERT/UPDATE/DELETE bloqueados desde el frontend.
- La `service_role` key **nunca** va al frontend ni al repositorio — reservada para backend futuro.
- Las variables de entorno locales viven en `.env` (gitignored); en producción se configuran en el dashboard de Vercel.
- `countriesService.js` es la única capa autorizada para interactuar con Supabase; `App.jsx` no importa el cliente directamente.

**API y proxy (frankfurter):** el fetch usa URL relativa `/api/frankfurter/...` —
no cambiar a URL absoluta. En dev la resuelve `vite.config.js`; en prod, `vercel.json`.
`fetchRates(fallbackRates)` acepta los `fallback_rate` de Supabase como base estática;
frankfurter los sobrescribe donde tenga cobertura. `STATIC_RATES` fue eliminado de `api.js`.

**Stocks / Twelve Data:** `stocksService.js` llama directamente a `api.twelvedata.com` (CORS libre).
Dos endpoints por símbolo en paralelo: `/quote` (precio, variación, volumen) y
`/time_series` (7 cierres para el sparkline). Caché en memoria con TTL de 1 hora.
La `service_role` key nunca va al frontend — el TODO en el caché documenta la migración futura a Supabase.

**Decimales:** `formatResult()` lee `COUNTRY_DATA[code]?.decimals ?? 2`.
Las monedas sin centavos visibles (ARS, CLP, COP, HUF, JPY, KRW) tienen
`decimals: 0` en su entrada de `countriesData.js`.

**CSS:** usar valores `px` en estilos Fiori —no `rem`—. `index.css` fija
`font-size: 18px` en `:root` (template Vite sin modificar), lo que
distorsionaría los tamaños Fiori si se usaran unidades relativas.

## Estado actual

Implementado: 30 divisas (5 regiones), conversión en tiempo real, fallback_rate unificado
en Supabase para todas las monedas, country cards con datos económicos, diseño Fiori responsive,
shell bar con ticker animado de 10 acciones globales (Twelve Data), modal de mercado local
por país (sin pestañas, 2 acciones, sparkline 7 días), historial de últimas 5 conversiones
(en memoria), deploy en Vercel con proxy CORS.

Deuda conocida: `index.css` y `src/assets/` tienen remanentes del template
Vite que no se usan (no tocar sin auditar). El historial no persiste al recargar.
El caché de acciones vive en memoria (TODO documentado para migrar a Supabase).

## Flujo de ramas

```
main ← develop ← feature/<nombre>
                ← fix/<nombre>
```

Merges vía Pull Request. No push directo a `main`.
`.claude/settings.local.json` y `.env` excluidos del repo (en `.gitignore`).

## Próxima etapa

Backend propio: API server-side con `service_role` de Supabase para historial
persistente de conversiones y migración del caché de acciones a tabla `stocks_cache`.

## Convenciones

- Constantes de módulo: `UPPER_SNAKE_CASE`
- Clases CSS: `kebab-case`; modificadores: `bloque--modificador`
- Async: siempre `setLoading` → `setError(null)` → try/catch/finally
- El `catch` nunca limpia `rates`; preserva las últimas tasas válidas
- `CountryCard` retorna `null` si el código no tiene entrada en los datos

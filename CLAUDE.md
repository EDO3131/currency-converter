# Currency Converter — Claude Code Context

Convertidor de monedas React + Vite. 27 divisas (América / Europa / Asia),
tasas en tiempo real desde frankfurter.app, diseño SAP Fiori, sin librerías adicionales.
**Deploy activo:** https://currency-converter-one-iota-39.vercel.app/

## Stack

- React 19.2.5 · Vite 8.0.10 · CSS puro · fetch nativo · Vercel (hosting)
- **Supabase** (`@supabase/supabase-js`) — base de datos en producción con tabla `currencies` (22 registros)
- **Restricción activa:** no instalar paquetes npm más allá de los existentes

## Estructura

```
src/
  App.jsx               # Componentes: CurrencySelect, CountryCard, ConversionHistory, App.
  App.css               # Sistema de diseño Fiori completo. Variables --f-* en :root.
  data/
    countriesData.js    # Única fuente de verdad: 27 monedas con todos sus datos.
  lib/
    supabase.js         # Cliente Supabase inicializado con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
  services/
    api.js              # fetch a frankfurter.app vía proxy (Vite en dev, Vercel en prod).
    countriesService.js # Capa de acceso a Supabase: lee tabla currencies con SELECT público.
docs/
  CONTEXT.md            # Contexto extendido del proyecto (decisiones, historial).
.env                    # Variables de entorno locales (gitignored). Ver §Supabase.
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

**API y proxy:** el fetch usa URL relativa `/api/frankfurter/...` —
no cambiar a URL absoluta. En dev la resuelve `vite.config.js`; en prod, `vercel.json`.
Las 6 monedas latinoamericanas (ARS, CLP, COP, PEN, UYU, BOB) usan tasas
estáticas permanentes en `api.js`; el BCE no las cubre.

**Decimales:** `formatResult()` lee `COUNTRY_DATA[code]?.decimals ?? 2`.
Las monedas sin centavos visibles (ARS, CLP, COP, HUF, JPY, KRW) tienen
`decimals: 0` en su entrada de `countriesData.js`.

**CSS:** usar valores `px` en estilos Fiori —no `rem`—. `index.css` fija
`font-size: 18px` en `:root` (template Vite sin modificar), lo que
distorsionaría los tamaños Fiori si se usaran unidades relativas.

## Estado actual

Implementado: conversión en tiempo real, fallback ante error de API,
country cards con datos económicos, diseño Fiori responsive, shell bar,
historial de últimas 5 conversiones (en memoria), deploy en Vercel con proxy CORS,
integración con Supabase (tabla `currencies`, 22 registros, RLS activo, conectado en producción).

Deuda conocida: `index.css` y `src/assets/` tienen remanentes del template
Vite que no se usan (no tocar sin auditar). El historial no persiste al recargar.

## Flujo de ramas

```
main ← develop ← feature/<nombre>
                ← fix/<nombre>
```

Merges vía Pull Request. No push directo a `main`.
`.claude/settings.local.json` y `.env` excluidos del repo (en `.gitignore`).

## Próxima etapa

Backend propio: API server-side que consulte frankfurter.app y almacene historial
de conversiones de forma persistente usando Supabase como BD. La `service_role`
key (actualmente sin usar) se habilitará solo en ese contexto server-side.

## Convenciones

- Constantes de módulo: `UPPER_SNAKE_CASE`
- Clases CSS: `kebab-case`; modificadores: `bloque--modificador`
- Async: siempre `setLoading` → `setError(null)` → try/catch/finally
- El `catch` nunca limpia `rates`; preserva las últimas tasas válidas
- `CountryCard` retorna `null` si el código no tiene entrada en los datos

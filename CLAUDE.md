# Currency Converter — Claude Code Context

Convertidor de monedas React + Vite. 27 divisas (América / Europa / Asia),
tasas en tiempo real desde frankfurter.app, diseño SAP Fiori, sin librerías adicionales.

## Stack

- React 19.2.5 · Vite 8.0.10 · CSS puro · fetch nativo
- **Restricción activa:** no instalar paquetes npm más allá de los existentes

## Estructura

```
src/
  App.jsx               # Solo lógica y presentación. Cero datos estáticos.
  App.css               # Sistema de diseño Fiori completo. Variables --f-* en :root.
  data/
    countriesData.js    # Única fuente de verdad: 27 monedas con todos sus datos.
  services/
    api.js              # fetch a frankfurter.app vía proxy de Vite.
docs/
  CONTEXT.md            # Contexto extendido del proyecto (decisiones, historial).
vite.config.js          # Proxy /api/frankfurter/* → https://api.frankfurter.app/*
```

## Reglas que no romper

**Datos:** todo dato estático vive en `src/data/countriesData.js`.
`App.jsx` no debe contener arrays de monedas, tasas ni configuraciones.
`CURRENCIES` y `FALLBACK_RATES` se derivan del mismo objeto `COUNTRY_DATA`.

**API y proxy:** el fetch usa URL relativa `/api/frankfurter/...` —
no cambiar a URL absoluta. El proxy de `vite.config.js` resuelve el CORS.
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
country cards con datos económicos, diseño Fiori responsive, shell bar.

Pendiente / deuda conocida: `index.css` y `src/assets/` tienen
remanentes del template Vite que no se usan (no tocar sin auditar).
El proxy solo funciona en `npm run dev`; producción requiere proxy propio.

## Convenciones

- Constantes de módulo: `UPPER_SNAKE_CASE`
- Clases CSS: `kebab-case`; modificadores: `bloque--modificador`
- Async: siempre `setLoading` → `setError(null)` → try/catch/finally
- El `catch` nunca limpia `rates`; preserva las últimas tasas válidas
- `CountryCard` retorna `null` si el código no tiene entrada en los datos

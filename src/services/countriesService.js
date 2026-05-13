import { supabase } from '../lib/supabase'
import LOCAL_COUNTRY_DATA, { CURRENCIES as LOCAL_CURRENCIES, FALLBACK_RATES as LOCAL_FALLBACK_RATES } from '../data/countriesData'

const CONTINENT_ES = { America: 'América', Europe: 'Europa', Asia: 'Asia', Africa: 'África', Oceania: 'Oceanía' }

export async function getCountriesData() {
  try {
    const { data, error } = await supabase.from('currencies').select('*')
    if (error) throw error

    const countryData = {}
    for (const row of data) {
      countryData[row.code] = {
        country:      row.country,
        flag:         row.flag_emoji,
        region:       CONTINENT_ES[row.continent] ?? row.continent,
        currency:     row.name,
        symbol:       row.symbol,
        fallbackRate: row.fallback_rate ?? 1,
        centralBank:  row.central_bank,
        inflation:    row.inflation != null ? `${row.inflation}% anual` : '—',
        gdp:          row.gdp,
        fact:         row.fun_fact,
        ...(row.decimals != null ? { decimals: row.decimals } : {}),
      }
    }

    const currencies = Object.entries(countryData).map(([code, d]) => ({
      code,
      name:   d.currency,
      symbol: d.symbol,
      flag:   d.flag,
      region: d.region,
    }))

    const fallbackRates = Object.fromEntries(
      Object.entries(countryData).map(([code, d]) => [code, d.fallbackRate])
    )

    console.log('[countriesService] Datos cargados desde Supabase:', data.length, 'monedas')
    return { countryData, currencies, fallbackRates }
  } catch (err) {
    console.warn('[countriesService] Fallback a datos locales. Error:', err.message)
    return {
      countryData:   LOCAL_COUNTRY_DATA,
      currencies:    LOCAL_CURRENCIES,
      fallbackRates: LOCAL_FALLBACK_RATES,
    }
  }
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export async function searchLocation(query, fetcher = fetch) {
  const url = new URL(GEOCODE_URL);
  url.search = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" });
  const response = await fetcher(url);
  if (!response.ok) throw new Error("Location service is unavailable right now.");
  const item = (await response.json()).results?.[0];
  if (!item) return null;
  return {
    name: item.name,
    region: item.admin1 || item.admin2 || "",
    country: item.country || "",
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone || "auto",
    label: [item.name, item.admin1, item.country_code].filter(Boolean).join(", ")
  };
}

export const MODEL_POOL = {
  gfs: { api: "gfs_seamless", name: "GFS", nickname: "The American", provider: "NOAA", country: "US" },
  ecmwf: { api: "ecmwf_ifs025", name: "ECMWF", nickname: "The European", provider: "ECMWF", country: "EU" },
  icon: { api: "icon_seamless", name: "ICON", nickname: "The German Engine", provider: "DWD", country: "DE" },
  gem: { api: "gem_seamless", name: "GEM", nickname: "The Canadian", provider: "ECCC", country: "CA" },
  jma: { api: "jma_seamless", name: "JMA", nickname: "The Pacific Precision", provider: "JMA", country: "JP" },
  ukmo: { api: "ukmo_global_deterministic_10km", name: "UKMO", nickname: "The Brit", provider: "Met Office", country: "GB" },
  access: { api: "bom_access_global", name: "ACCESS-G", nickname: "The Thunder Down Under", provider: "BOM", country: "AU" }
};
export const DEFAULT_MODEL_KEYS = ["gfs", "ecmwf", "icon"];
export const MODEL_ROSTER = Object.fromEntries(DEFAULT_MODEL_KEYS.map(key => [key, MODEL_POOL[key]]));

function readSeries(hourly, variable, model, index) {
  const exact = hourly[`${variable}_${model}`];
  if (Array.isArray(exact)) return exact[index] ?? null;
  const family = model.startsWith("gfs") ? "gfs" : model.startsWith("ecmwf") ? "ecmwf" : "icon";
  const key = Object.keys(hourly).find(k => k.startsWith(`${variable}_`) && k.includes(family));
  return key ? hourly[key][index] ?? null : null;
}

function round(value, digits = 0) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

export function normalizeForecast(raw, requestedTime, roster = MODEL_ROSTER) {
  const times = raw.hourly?.time || [];
  if (!times.length) throw new Error("The weather provider returned no forecast hours.");
  let index = times.findIndex(time => time === requestedTime);
  if (index < 0) index = times.reduce((best, time, i) => Math.abs(new Date(time) - new Date(requestedTime)) < Math.abs(new Date(times[best]) - new Date(requestedTime)) ? i : best, 0);
  const build = model => ({
    temperatureF: round(readSeries(raw.hourly, "temperature_2m", model, index), 1),
    precipitationProbability: round(readSeries(raw.hourly, "precipitation_probability", model, index)),
    windMph: round(readSeries(raw.hourly, "wind_speed_10m", model, index), 1)
  });
  return { forecastTime: times[index], models: Object.fromEntries(Object.entries(roster).map(([key, model]) => [key, build(model.api)])) };
}

export function normalizeForecastSeries(raw, requestedTime, dayCount = 3, roster = MODEL_ROSTER) {
  const requested = new Date(requestedTime);
  return Array.from({ length: dayCount }, (_, day) => {
    const target = new Date(requested);
    target.setDate(target.getDate() + day);
    const localTarget = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}T${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;
    return normalizeForecast(raw, localTarget, roster);
  });
}

export async function fetchForecast(location, forecastTime, fetcher = fetch, roster = MODEL_ROSTER) {
  const date = forecastTime.slice(0, 10);
  const end = new Date(`${date}T12:00:00`); end.setDate(end.getDate() + 2);
  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(location.latitude), longitude: String(location.longitude),
    hourly: "temperature_2m,precipitation_probability,wind_speed_10m",
    models: Object.values(roster).map(model => model.api).join(","), temperature_unit: "fahrenheit",
    wind_speed_unit: "mph", timezone: location.timezone || "auto", start_date: date, end_date: endDate
  });
  const response = await fetcher(url);
  if (!response.ok) throw new Error("The weather models are taking a timeout. Try again shortly.");
  return normalizeForecastSeries(await response.json(), forecastTime, 3, roster);
}

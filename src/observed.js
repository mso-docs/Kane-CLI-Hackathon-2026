const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

export async function fetchObservedWeather({ latitude, longitude, timezone, forecastTime }, fetcher = fetch) {
  const date = forecastTime.slice(0, 10);
  const url = new URL(ARCHIVE_URL);
  url.search = new URLSearchParams({
    latitude: String(latitude), longitude: String(longitude), start_date: date, end_date: date,
    hourly: "temperature_2m,precipitation,wind_speed_10m", temperature_unit: "fahrenheit",
    precipitation_unit: "inch", wind_speed_unit: "mph", timezone: timezone || "auto"
  });
  const response = await fetcher(url);
  if (!response.ok) throw new Error("Archived weather is not available for this hour yet.");
  const payload = await response.json();
  const times = payload.hourly?.time || [];
  const index = times.findIndex(time => time === forecastTime);
  if (index < 0) throw new Error("No archived weather matched the forecast hour.");
  const value = (name, digits = 1) => Number.isFinite(payload.hourly[name]?.[index]) ? Number(payload.hourly[name][index].toFixed(digits)) : null;
  return {
    forecastTime, temperatureF: value("temperature_2m"), precipitationInches: value("precipitation", 3),
    windMph: value("wind_speed_10m"), source: "Open-Meteo ERA5 gridded historical weather"
  };
}

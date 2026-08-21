import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { searchLocation, fetchForecast, MODEL_POOL, MODEL_ROSTER } from "./src/weather.js";
import { calculateTournament, summarizeSeries } from "./src/agreement.js";
import { tournamentCommentary } from "./src/commentary.js";
import { fetchObservedWeather } from "./src/observed.js";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = join(process.cwd(), "public");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
const json = (res, status, body) => { res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };

async function api(req, res, url) {
  if (url.pathname === "/api/observed") {
    const latitude = Number(url.searchParams.get("latitude"));
    const longitude = Number(url.searchParams.get("longitude"));
    const forecastTime = url.searchParams.get("time");
    const timezone = url.searchParams.get("timezone") || "auto";
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !forecastTime || Number.isNaN(Date.parse(forecastTime))) return json(res, 400, { error: "Valid coordinates and forecast time are required." });
    if (forecastTime.slice(0, 10) >= new Date().toISOString().slice(0, 10)) return json(res, 409, { error: "This forecast day is not complete yet. The judges are still waiting." });
    return json(res, 200, await fetchObservedWeather({ latitude, longitude, timezone, forecastTime }));
  }
  if (url.pathname === "/api/matchup") {
    const query = url.searchParams.get("location")?.trim();
    const time = url.searchParams.get("time");
    if (!query || !time || Number.isNaN(Date.parse(time))) return json(res, 400, { error: "Enter a location and choose a valid forecast time." });
    const location = await searchLocation(query);
    if (!location) return json(res, 404, { error: `No location found for “${query}”. Try a city, state, or postal code.` });
    const requestedModels = (url.searchParams.get("models") || "").split(",").filter(Boolean);
    const uniqueModels = [...new Set(requestedModels)].filter(key => MODEL_POOL[key]);
    const roster = uniqueModels.length === 3 ? Object.fromEntries(uniqueModels.map(key => [key, MODEL_POOL[key]])) : MODEL_ROSTER;
    const forecasts = await fetchForecast(location, time, fetch, roster);
    const result = { location, roster, days: forecasts.map((forecast, index) => ({ ...forecast, day: index + 1, comparison: calculateTournament(forecast.models) })) };
    result.seriesSummary = summarizeSeries(result.days);
    result.commentary = tournamentCommentary(result);
    result.commentarySource = "deterministic fallback";
    return json(res, 200, result);
  }
  return json(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    const relative = url.pathname === "/" ? "index.html" : normalize(url.pathname).replace(/^[/\\]+/, "");
    if (relative.includes("..")) throw new Error("Invalid path");
    const file = await readFile(join(PUBLIC, relative));
    res.writeHead(200, { "content-type": types[extname(relative)] || "application/octet-stream", "cache-control": "no-store" }); res.end(file);
  } catch (error) {
    if (req.url.startsWith("/api/")) return json(res, 502, { error: error.message || "The bout could not be loaded." });
    try { const file = await readFile(join(PUBLIC, "index.html")); res.writeHead(200, { "content-type": types[".html"], "cache-control": "no-store" }); res.end(file); }
    catch { res.writeHead(500); res.end("Server error"); }
  }
});
server.listen(PORT, () => console.log(`Weather Model Fight Club → http://localhost:${PORT}`));

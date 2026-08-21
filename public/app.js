const form = document.querySelector("#fight-form");
const timeInput = document.querySelector("#time");
const status = document.querySelector("#status");
const arena = document.querySelector("#arena");
const submit = document.querySelector("#submit");
const modelPool = ["gfs", "ecmwf", "icon", "gem", "jma", "ukmo"];
let modelOrder = ["gfs", "ecmwf", "icon"];
let selectedModels = null;
const randomVenues = ["Miami, FL", "Denver, CO", "Seattle, WA", "Reykjavik, Iceland", "Tokyo, Japan", "London, UK", "Sydney, Australia", "Singapore", "Cape Town, South Africa", "Anchorage, AK", "New Orleans, LA", "Honolulu, HI", "Ushuaia, Argentina", "Buffalo, NY"];
let currentData = null;

function localInput(date) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}
const initial = new Date(); initial.setDate(initial.getDate() + 1); initial.setHours(16, 0, 0, 0);
timeInput.value = localInput(initial); timeInput.min = localInput(new Date());
timeInput.max = localInput(new Date(Date.now() + 7 * 86400000));
const fmt = (value, unit) => value == null ? "—" : `${value}${unit}`;
const modelName = key => currentData.roster[key]?.name || key.toUpperCase();

function roundCard(key, round, index) {
  const icons = { temperature: "°", precipitation: "◆", wind: "≋" };
  const values = modelOrder.map((model, index) => `<div class="model-value slot-${index}"><small>${modelName(model)}</small><b>${fmt(round.values[model], round.unit)}</b></div>`).join("");
  return `<article class="round-card ${round.level}"><div class="round-head"><span>ROUND ${index + 1}</span><b>${icons[key]}</b><h3>${round.label.toUpperCase()}</h3><em>${round.available ? `${round.level} disagreement` : "data unavailable"}</em></div><div class="round-values triple">${values}</div><p>${round.available ? `Range: ${round.difference}${round.unit} · Median: ${round.consensus}${round.unit}` : "This round is excluded from the score."}</p></article>`;
}

function dominantEffect(day) {
  const values = property => Object.values(day.models).map(model => model[property]).filter(Number.isFinite);
  if (values("precipitationProbability").some(value => value >= 60)) return "rain";
  if (values("windMph").some(value => value >= 20)) return "wind";
  if (values("temperatureF").some(value => value >= 90)) return "heat";
  return "clear";
}

function renderDay(index) {
  const day = currentData.days[index];
  document.querySelectorAll(".day-tab").forEach((tab, tabIndex) => tab.classList.toggle("active", tabIndex === index));
  document.querySelector("#fight-time").textContent = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(day.forecastTime));
  document.querySelector("#rounds").innerHTML = Object.entries(day.comparison.rounds).map(([key, round], roundIndex) => roundCard(key, round, roundIndex)).join("");
  const score = day.comparison.agreementScore;
  document.querySelector("#score-number").textContent = score ?? "—";
  document.querySelector("#meter-fill").style.width = `${score ?? 0}%`;
  document.querySelector("#verdict").textContent = score == null ? "NO DECISION" : score >= 80 ? "CHAMPIONSHIP HARMONY" : score >= 55 ? "SPLIT DECISION" : "MODELS AT WAR";
  document.querySelector("#weather-fx").className = `weather-fx ${dominantEffect(day)}`;
}

function renderTournament(data) {
  if (!Array.isArray(data.days) || data.days.length !== 3 || !data.roster) {
    throw new Error("The server returned an older matchup format. Stop the running server, restart it with npm start, then refresh this page.");
  }
  currentData = data;
  modelOrder = Object.keys(data.roster).slice(0, 3);
  renderFighters();
  saveFightCard(data);
  document.querySelector("#venue").textContent = data.location.label.toUpperCase();
  renderMap(data.location);
  document.querySelector("#day-tabs").innerHTML = data.days.map((day, index) => `<button type="button" class="day-tab${index === 0 ? " active" : ""}" data-day="${index}"><span>DAY ${index + 1}</span><b>${["OPENING BELL", "MAIN EVENT", "CHAMPIONSHIP"][index]}</b><small>${new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(day.forecastTime))}</small></button>`).join("");
  document.querySelectorAll(".day-tab").forEach(tab => tab.addEventListener("click", () => renderDay(Number(tab.dataset.day))));
  document.querySelector("#trend-chart").innerHTML = data.days.map((day, index) => `<button type="button" data-day="${index}" aria-label="Show day ${index + 1}, agreement ${day.comparison.agreementScore}"><i style="height:${day.comparison.agreementScore ?? 0}%"></i><b>${day.comparison.agreementScore ?? "—"}</b><span>D${index + 1}</span></button>`).join("");
  document.querySelectorAll("#trend-chart button").forEach(button => button.addEventListener("click", () => renderDay(Number(button.dataset.day))));
  document.querySelector("#average-score").textContent = data.seriesSummary.averageAgreement ?? "—";
  document.querySelector("#trend-label").textContent = data.seriesSummary.trend.toUpperCase();
  const distances = Object.fromEntries(modelOrder.map(model => [model, data.days.reduce((sum, day) => sum + (day.comparison.consensusDistance[model] ?? 0), 0) / data.days.length]));
  const closest = Object.entries(distances).sort((a, b) => a[1] - b[1])[0][0];
  document.querySelector("#consensus-table").innerHTML = modelOrder.map((model, index) => `<div class="consensus-row ${model === closest ? "leader" : ""}"><span>${index + 1}</span><b>${modelName(model)}</b><i><em style="width:${Math.max(5, 100 - Math.min(distances[model] * 200, 95))}%"></em></i><strong>${model === closest ? "★ CLOSEST TO CONSENSUS" : "IN THE PACK"}</strong></div>`).join("");
  document.querySelector("#commentary").textContent = `“${data.commentary}”`;
  document.querySelector("#commentary-source").textContent = `Generated only from calculated matchup data · ${data.commentarySource}`;
  renderDay(0); arena.hidden = false; arena.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderFighters() {
  const corners = ["BLUE CORNER", "RED CORNER", "GOLD CORNER"];
  const classes = ["blue", "red", "gold"];
  const parts = modelOrder.map((key, index) => {
    const model = currentData.roster[key];
    const fighter = `<article class="fighter ${classes[index]}"><span class="corner">${corners[index]}</span><div class="globe">${model.name[0]}</div><div><h2>${model.name}</h2><p>“${model.nickname.toUpperCase()}”</p><small>${model.provider.toUpperCase()} · GLOBAL MODEL · ${model.country}</small></div></article>`;
    return index ? `<div class="vs${index === 2 ? " third" : ""}"><small>${index === 1 ? "TRIPLE" : ""}</small><b>VS</b><small>${index === 1 ? "THREAT" : ""}</small></div>${fighter}` : fighter;
  });
  document.querySelector("#fighters").innerHTML = parts.join("");
}

function renderMap(location) {
  const frame = document.querySelector("#location-map");
  const locationLabel = document.querySelector("#map-location");
  const coordinates = document.querySelector("#map-coordinates");
  const link = document.querySelector("#map-link");
  if (!frame || !locationLabel || !coordinates || !link) return;
  const { latitude, longitude } = location;
  const span = 0.22;
  const bbox = [longitude - span, latitude - span * 0.65, longitude + span, latitude + span * 0.65].join(",");
  const mapUrl = new URL("https://www.openstreetmap.org/export/embed.html");
  mapUrl.search = new URLSearchParams({ bbox, layer: "mapnik", marker: `${latitude},${longitude}` });
  frame.src = mapUrl;
  locationLabel.textContent = location.label.toUpperCase();
  const latitudeLabel = `${Math.abs(latitude).toFixed(3)}° ${latitude >= 0 ? "N" : "S"}`;
  const longitudeLabel = `${Math.abs(longitude).toFixed(3)}° ${longitude >= 0 ? "E" : "W"}`;
  coordinates.textContent = `${latitudeLabel} · ${longitudeLabel}`;
  link.href = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=10/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
  frame.title = `Map of ${location.label}`;
}

function saveFightCard(data) {
  try {
    const archive = JSON.parse(localStorage.getItem("wmfc:fight-cards") || "[]");
    const id = `${data.location.latitude.toFixed(3)}:${data.location.longitude.toFixed(3)}:${data.days[0].forecastTime}`;
    const card = { ...data, id, savedAt: new Date().toISOString(), evaluations: archive.find(item => item.id === id)?.evaluations || {} };
    const updated = [card, ...archive.filter(item => item.id !== id)].slice(0, 30);
    localStorage.setItem("wmfc:fight-cards", JSON.stringify(updated));
  } catch { /* Browsing with storage disabled must not break live matchups. */ }
}

function showError(message) {
  status.className = "status error"; status.replaceChildren();
  const title = document.createElement("b"); title.textContent = "NO CONTEST";
  const detail = document.createElement("span"); detail.textContent = message;
  status.append(title, detail);
}

form.addEventListener("submit", async event => {
  event.preventDefault(); status.hidden = false; status.className = "status loading"; status.textContent = "Three models are entering the arena…";
  submit.disabled = true; submit.querySelector("span").textContent = "LOADING CARD";
  try {
    const params = new URLSearchParams({ location: form.location.value, time: form.time.value });
    if (selectedModels) params.set("models", selectedModels.join(","));
    const response = await fetch(`/api/matchup?${params}`); const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The fight card could not be loaded.");
    status.hidden = true; renderTournament(data);
  } catch (error) { showError(error.message); }
  finally { submit.disabled = false; submit.querySelector("span").textContent = "START MATCHUP"; }
});

document.querySelector("#randomize").addEventListener("click", () => {
  const options = randomVenues.filter(venue => venue !== form.location.value);
  form.location.value = options[Math.floor(Math.random() * options.length)];
  const randomDate = new Date(); randomDate.setDate(randomDate.getDate() + 1 + Math.floor(Math.random() * 4)); randomDate.setHours([9, 12, 16, 20][Math.floor(Math.random() * 4)], 0, 0, 0);
  timeInput.value = localInput(randomDate);
  selectedModels = [...modelPool].sort(() => Math.random() - 0.5).slice(0, 3);
  form.requestSubmit();
});

document.querySelector("#share").addEventListener("click", async () => {
  if (!currentData) return;
  const text = `Weather Model Fight Club: ${currentData.location.label} — ${currentData.seriesSummary.averageAgreement}/100 three-day Model Agreement. ${currentData.seriesSummary.trend}.`;
  try {
    if (navigator.share) await navigator.share({ title: "Weather Model Fight Club", text, url: location.href });
    else { await navigator.clipboard.writeText(`${text} ${location.href}`); document.querySelector("#share").textContent = "✓ FIGHT CARD COPIED"; }
  } catch {}
});

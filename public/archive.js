import { evaluateModels } from "./evaluation.js";

let modelOrder = ["gfs", "ecmwf", "icon"];
const palette = ["#36a9ff", "#ff4c42", "#ffbd3f"];
const color = model => palette[Math.max(0, modelOrder.indexOf(model))];
const metricMeta = {
  temperatureF: { label: "Temperature", unit: "°F" },
  precipitationProbability: { label: "Precipitation probability", unit: "%" },
  windMph: { label: "Wind speed", unit: " mph" }
};
let cards = readCards();
let current = cards[0] || null;
const dashboard = document.querySelector("#archive-dashboard");
const empty = document.querySelector("#empty-archive");

function readCards() {
  try {
    const stored = JSON.parse(localStorage.getItem("wmfc:fight-cards") || "[]");
    return Array.isArray(stored) ? stored.filter(card => Array.isArray(card.days) && card.days.length && card.roster && card.location) : [];
  }
  catch { return []; }
}
function saveCards() { localStorage.setItem("wmfc:fight-cards", JSON.stringify(cards)); }
const name = key => current.roster[key]?.name || key.toUpperCase();

function initialize() {
  empty.hidden = cards.length > 0; dashboard.hidden = !cards.length;
  if (!cards.length) return;
  const select = document.querySelector("#card-select");
  select.innerHTML = cards.map(card => `<option value="${card.id}">${card.location.label} · ${card.days[0].forecastTime.replace("T", " ")}</option>`).join("");
  select.addEventListener("change", () => { current = cards.find(card => card.id === select.value); render(); });
  document.querySelector("#metric-select").addEventListener("change", renderGraph);
  document.querySelector("#evaluate").addEventListener("click", evaluateCurrent);
  render();
}

function render() { modelOrder = Object.keys(current.roster).slice(0, 3); renderGraph(); renderBracket(); renderLedger(); }

function dateOnly(date) { return date.toISOString().slice(0, 10); }
function evaluationState(day) {
  const forecastDate = day.forecastTime.slice(0, 10);
  const today = dateOnly(new Date());
  const available = new Date(`${forecastDate}T12:00:00Z`); available.setUTCDate(available.getUTCDate() + 6);
  const availableDate = dateOnly(available);
  if (forecastDate >= today) return { state: "future", label: "FORECAST NOT FINISHED", availableDate };
  if (today < availableDate) return { state: "era5", label: "WAITING FOR ERA5", availableDate };
  return { state: "ready", label: "READY TO EVALUATE", availableDate };
}

function renderGraph() {
  const metric = document.querySelector("#metric-select").value;
  const meta = metricMeta[metric];
  const allValues = current.days.flatMap(day => modelOrder.map(model => day.models[model]?.[metric])).filter(Number.isFinite);
  const min = Math.min(...allValues); const max = Math.max(...allValues); const padding = Math.max((max - min) * 0.15, 1);
  const low = min - padding; const high = max + padding;
  const x = index => 70 + index * 310;
  const y = value => 240 - ((value - low) / (high - low || 1)) * 180;
  const lines = modelOrder.map(model => {
    const points = current.days.map((day, index) => ({ x: x(index), y: y(day.models[model]?.[metric]), value: day.models[model]?.[metric] })).filter(point => Number.isFinite(point.value));
    return `<polyline points="${points.map(point => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="${color(model)}" stroke-width="4"/>${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="6" fill="${color(model)}"/><text x="${point.x}" y="${point.y - 13}" text-anchor="middle">${point.value}${meta.unit}</text>`).join("")}`;
  }).join("");
  const ranges = current.days.map((day, index) => {
    const values = modelOrder.map(model => day.models[model]?.[metric]).filter(Number.isFinite);
    if (values.length < 2) return "";
    return `<line x1="${x(index)}" x2="${x(index)}" y1="${y(Math.min(...values))}" y2="${y(Math.max(...values))}" stroke="#d9ff42" stroke-width="12" opacity=".18"/>`;
  }).join("");
  const labels = current.days.map((day, index) => `<text x="${x(index)}" y="285" text-anchor="middle" class="axis-label">DAY ${index + 1}</text>`).join("");
  document.querySelector("#graph-title").textContent = `${meta.label.toUpperCase()} · MODEL SPREAD`;
  document.querySelector("#forecast-graph").innerHTML = `<svg viewBox="0 0 760 310" role="img" aria-label="${meta.label} forecasts for three models over three days"><line x1="40" y1="255" x2="720" y2="255" class="axis"/>${ranges}${lines}${labels}</svg>`;
  document.querySelector("#graph-legend").innerHTML = modelOrder.map(model => `<span><i style="background:${color(model)}"></i>${name(model)}</span>`).join("") + `<span><i class="range-key"></i>DISAGREEMENT RANGE</span>`;
}

function aggregateScores() {
  const evaluations = Object.values(current.evaluations || {});
  return Object.fromEntries(modelOrder.map(model => {
    const scores = evaluations.map(item => item.evaluation?.results?.[model]?.score).filter(Number.isFinite);
    return [model, scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null];
  }));
}

function renderBracket() {
  const scores = aggregateScores();
  const verified = Object.values(scores).some(Number.isFinite);
  const consensus = Object.fromEntries(modelOrder.map(model => [model, current.days.reduce((sum, day) => sum + (day.comparison.consensusDistance[model] ?? 1), 0)]));
  const rankValue = model => verified && Number.isFinite(scores[model]) ? scores[model] : -consensus[model];
  const [first, second, third] = modelOrder;
  const semifinalWinner = rankValue(first) >= rankValue(second) ? first : second;
  const champion = rankValue(semifinalWinner) >= rankValue(third) ? semifinalWinner : third;
  const card = model => `<div class="bracket-team ${model === champion ? "champion" : ""}"><i style="background:${color(model)}"></i><b>${name(model)}</b><span>${verified && Number.isFinite(scores[model]) ? `${scores[model]} EVAL` : "CONSENSUS SEED"}</span></div>`;
  document.querySelector("#fantasy-bracket").innerHTML = `<div class="bracket-round"><small>SEMIFINAL</small>${card(first)}${card(second)}</div><div class="bracket-connector">›</div><div class="bracket-round"><small>FINAL</small>${card(semifinalWinner)}${card(third)}</div><div class="bracket-connector">›</div><div class="bracket-round final"><small>CARD LEADER</small>${card(champion)}</div>`;
  document.querySelector("#bracket-note").textContent = verified ? "Bracket seeded by average verified evaluation score." : "Provisional bracket seeded by distance from consensus until observations are available.";
}

function renderLedger() {
  const evaluations = current.evaluations || {};
  const states = current.days.map(evaluationState);
  const ready = current.days.filter(day => !evaluations[day.forecastTime] && evaluationState(day).state === "ready").length;
  const evaluated = Object.keys(evaluations).length;
  const button = document.querySelector("#evaluate");
  button.disabled = ready === 0;
  button.title = ready ? `${ready} round${ready === 1 ? " is" : "s are"} ready` : "No archived rounds are ready yet";
  button.querySelector("span").textContent = ready ? `EVALUATE ${ready} READY ROUND${ready === 1 ? "" : "S"}` : evaluated === current.days.length ? "CARD FULLY EVALUATED" : "JUDGES WAITING";
  const nextDate = states.filter(state => state.state !== "ready").map(state => state.availableDate).sort()[0];
  const nextLabel = nextDate ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${nextDate}T12:00:00Z`)) : "after the forecast";
  document.querySelector("#evaluation-schedule").innerHTML = ready
    ? `<b>${ready} ROUND${ready === 1 ? "" : "S"} READY</b><span>Archived ERA5 weather can now be requested for deterministic scoring.</span>`
    : `<b>WHY CAN’T THIS BE EVALUATED YET?</b><span>Forecasts must happen first, then ERA5 gridded history must be published. The next check for this card is approximately <strong>${nextLabel}</strong>.</span>`;
  document.querySelector("#evaluation-ledger").innerHTML = current.days.map(day => {
    const record = evaluations[day.forecastTime];
    if (!record) {
      const state = evaluationState(day);
      const timing = state.state === "ready" ? "ARCHIVE AVAILABLE" : `EST. ${state.availableDate}`;
      return `<article class="ledger-day pending ${state.state}"><b>DAY ${day.day}</b><span>${state.label} · ${timing}</span></article>`;
    }
    const results = modelOrder.map(model => `<div class="ledger-model ${record.evaluation.winner === model ? "winner" : ""}"><b>${name(model)}</b><strong>${record.evaluation.results[model].score ?? "—"}</strong><span>${record.evaluation.winner === model ? "★ ROUND LEADER" : "EVAL SCORE"}</span></div>`).join("");
    return `<article class="ledger-day"><header><b>DAY ${day.day}</b><span>ERA5: ${record.observed.temperatureF}°F · ${record.observed.windMph} mph · ${record.observed.precipitationInches} in</span></header><div>${results}</div></article>`;
  }).join("");
}

async function evaluateCurrent() {
  const message = document.querySelector("#archive-message"); const button = document.querySelector("#evaluate");
  message.hidden = false; message.className = "status loading"; message.textContent = "The archive judges are reviewing eligible rounds…"; button.disabled = true;
  let completed = 0; let pending = 0;
  current.evaluations ||= {};
  for (const day of current.days) {
    if (current.evaluations[day.forecastTime]) continue;
    if (evaluationState(day).state !== "ready") { pending++; continue; }
    try {
      const params = new URLSearchParams({ latitude: current.location.latitude, longitude: current.location.longitude, timezone: current.location.timezone, time: day.forecastTime });
      const response = await fetch(`/api/observed?${params}`); const observed = await response.json();
      if (!response.ok) { pending++; continue; }
      current.evaluations[day.forecastTime] = { observed, evaluation: evaluateModels(day.models, observed), evaluatedAt: new Date().toISOString() }; completed++;
    } catch { pending++; }
  }
  cards = cards.map(card => card.id === current.id ? current : card); saveCards(); render();
  message.className = completed ? "status success" : "status";
  message.textContent = completed ? `${completed} round${completed === 1 ? "" : "s"} evaluated. ${pending ? `${pending} still pending.` : "The card is complete."}` : "The eligible round is still absent from the ERA5 archive. Check again later.";
  button.disabled = false;
}

initialize();

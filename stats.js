import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  Timestamp,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const userEmailEl = document.getElementById("userEmail");
const signOutBtn = document.getElementById("signOutBtn");
const darkSetting = document.getElementById("darkSetting");
const filterButtons = [...document.querySelectorAll(".filter-btn")];
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");
const statsContent = document.getElementById("statsContent");
const summaryTableBody = document.getElementById("summaryTableBody");

let selectedDays = 7;
let barChart = null;
let scatterChart = null;

const theme = localStorage.getItem("audio-detector-theme") || "light";
document.body.classList.toggle("dark", theme === "dark");
darkSetting.checked = theme === "dark";

darkSetting.addEventListener("change", () => {
  const isDark = darkSetting.checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("audio-detector-theme", isDark ? "dark" : "light");
  if (!statsContent.hidden) renderCharts(window.__statsRows || []);
});

signOutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const days = Number(button.dataset.days);
    if (days === selectedDays) return;
    selectedDays = days;
    filterButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
    if (auth.currentUser) loadStats(auth.currentUser.uid);
  });
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  userEmailEl.textContent = user.email || "Signed in";
  loadStats(user.uid);
});

async function loadStats(userId) {
  setState("loading");

  const cutoffDate = new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000);

  try {
    const eventsQuery = query(
      collection(db, "sound_events"),
      where("userId", "==", userId),
      where("detectedAt", ">=", Timestamp.fromDate(cutoffDate)),
      orderBy("detectedAt", "desc")
    );

    const snapshot = await getDocs(eventsQuery);
    const rows = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const detectedAt = data.detectedAt?.toDate?.();
        if (!detectedAt) return null;
        return {
          id: doc.id,
          soundLabel: data.soundLabel || "Unknown",
          confidence: Number(data.confidence || 0),
          detectedAt,
        };
      })
      .filter(Boolean);

    window.__statsRows = rows;

    if (rows.length === 0) {
      destroyCharts();
      summaryTableBody.innerHTML = "";
      setState("empty");
      return;
    }

    renderCharts(rows);
    renderSummaryTable(rows);
    setState("content");
  } catch (error) {
    console.error("Failed to load stats:", error);
    destroyCharts();
    summaryTableBody.innerHTML = `<tr><td colspan="4">Failed to load stats: ${escapeHtml(error.message || "Unknown error")}</td></tr>`;
    setState("content");
  }
}

function setState(state) {
  loadingState.hidden = state !== "loading";
  emptyState.hidden = state !== "empty";
  statsContent.hidden = state !== "content";
}

function renderCharts(rows) {
  const summary = buildSummary(rows);
  renderBarChart(summary);
  renderScatterChart(rows, summary.labels);
}

function buildSummary(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const existing = map.get(row.soundLabel) || {
      soundLabel: row.soundLabel,
      count: 0,
      lastDetected: row.detectedAt,
      confidenceSum: 0,
    };

    existing.count += 1;
    existing.confidenceSum += row.confidence;
    if (row.detectedAt > existing.lastDetected) {
      existing.lastDetected = row.detectedAt;
    }
    map.set(row.soundLabel, existing);
  });

  const items = [...map.values()].sort((a, b) => b.count - a.count || a.soundLabel.localeCompare(b.soundLabel));
  return {
    items,
    labels: items.map((item) => item.soundLabel),
  };
}

function renderBarChart(summary) {
  const ctx = document.getElementById("barChart");
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: summary.items.map((item) => item.soundLabel),
      datasets: [{
        label: "Detections",
        data: summary.items.map((item) => item.count),
        borderWidth: 1,
        borderRadius: 8,
      }],
    },
    options: chartOptions({
      scales: {
        x: {
          ticks: { maxRotation: 0, autoSkip: false },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
      plugins: {
        legend: { display: false },
      },
    }),
  });
}

function renderScatterChart(rows, labels) {
  const ctx = document.getElementById("scatterChart");
  if (scatterChart) scatterChart.destroy();

  const labelIndex = new Map(labels.map((label, index) => [label, index]));
  const points = rows.map((row) => ({
    x: row.detectedAt.getHours() + row.detectedAt.getMinutes() / 60,
    y: labelIndex.get(row.soundLabel),
    r: 4 + row.confidence * 12,
    soundLabel: row.soundLabel,
    confidence: row.confidence,
    detectedAt: row.detectedAt,
  }));

  scatterChart = new Chart(ctx, {
    type: "bubble",
    data: {
      datasets: [{
        label: "Detections",
        data: points,
      }],
    },
    options: chartOptions({
      parsing: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const point = context.raw;
              return `${point.soundLabel} • ${point.detectedAt.toLocaleString()} • confidence ${point.confidence.toFixed(3)}`;
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 23,
          ticks: {
            stepSize: 1,
            callback: (value) => `${value}:00`,
          },
          title: {
            display: true,
            text: "Hour of day",
          },
        },
        y: {
          min: -0.5,
          max: Math.max(labels.length - 0.5, 0.5),
          ticks: {
            stepSize: 1,
            callback: (value) => labels[value] || "",
          },
          title: {
            display: true,
            text: "Sound label",
          },
        },
      },
    }),
  });
}

function renderSummaryTable(rows) {
  const summary = buildSummary(rows);
  summaryTableBody.innerHTML = summary.items
    .map((item) => {
      const avgConfidence = item.confidenceSum / item.count;
      return `
        <tr>
          <td>${escapeHtml(item.soundLabel)}</td>
          <td>${item.count}</td>
          <td>${item.lastDetected.toLocaleString()}</td>
          <td>${avgConfidence.toFixed(3)}</td>
        </tr>
      `;
    })
    .join("");
}

function chartOptions(extra = {}) {
  const isDark = document.body.classList.contains("dark");
  const tickColor = isDark ? "#cbd5e1" : "#475569";
  const gridColor = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(15, 23, 42, 0.08)";

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {},
    plugins: {
      legend: {
        labels: { color: tickColor },
      },
    },
    elements: {
      point: {
        hoverRadius: 10,
      },
    },
    ...extra,
    scales: Object.fromEntries(
      Object.entries(extra.scales || {}).map(([key, config]) => [
        key,
        {
          grid: { color: gridColor },
          ticks: { color: tickColor, ...(config.ticks || {}) },
          title: { color: tickColor, ...(config.title || {}) },
          ...config,
        },
      ])
    ),
  };
}

function destroyCharts() {
  if (barChart) {
    barChart.destroy();
    barChart = null;
  }
  if (scatterChart) {
    scatterChart.destroy();
    scatterChart = null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

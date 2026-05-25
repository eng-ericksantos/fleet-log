/**
 * Fleet-Log — Teste de Carga K6
 *
 * Cenário: 50 VUs simultâneos por 30 segundos
 *   • POST /api/telemetry  → FastAPI  (simula sensores enviando telemetria)
 *   • GET  /api/vehicles   → NestJS   (simula dashboard lendo frota)
 *
 * Saídas geradas ao final:
 *   results/k6-summary.json  — métricas agregadas (JSON)
 *   results/k6-report.html   — relatório visual com Chart.js (abrível no browser)
 *
 * Para exportar também a série temporal bruta, adicione a flag:
 *   --out json=results/raw.json
 *   --out csv=results/raw.csv
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ─────────────────────────────────────────────────────────────────────────────
// Configuração de URLs (sobrescrevível via variável de ambiente)
// ─────────────────────────────────────────────────────────────────────────────
const CORE_API_URL  = __ENV.CORE_API_URL  || 'http://localhost:3000';
const TELEMETRY_URL = __ENV.TELEMETRY_URL || 'http://localhost:8000';

// IDs dos veículos de seed da telemetry-api (VH-001 … VH-005)
const VEHICLE_IDS = ['VH-001', 'VH-002', 'VH-003', 'VH-004', 'VH-005'];

// Coordenadas base (São Paulo) para dispersão realista
const BASE_LAT = -23.5505;
const BASE_LON = -46.6333;

// ─────────────────────────────────────────────────────────────────────────────
// Métricas customizadas por endpoint
// ─────────────────────────────────────────────────────────────────────────────
const telemetryErrors = new Counter('telemetry_errors');
const vehicleErrors   = new Counter('vehicle_errors');
const telemetryDuration = new Trend('telemetry_duration', true);
const vehicleDuration   = new Trend('vehicle_duration',   true);

// ─────────────────────────────────────────────────────────────────────────────
// Opções do teste
// ─────────────────────────────────────────────────────────────────────────────
export const options = {
  vus:      50,
  duration: '30s',

  thresholds: {
    // Globais
    http_req_failed:    ['rate<0.05'],   // taxa de erro < 5 %
    http_req_duration:  ['p(95)<2000'],  // 95 % das requests < 2 s

    // Por endpoint
    telemetry_duration: ['p(95)<1500'],  // POST telemetria < 1,5 s
    vehicle_duration:   ['p(95)<1000'],  // GET veículos    < 1 s
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Cenário principal
// ─────────────────────────────────────────────────────────────────────────────
export default function () {
  const vehicleId = VEHICLE_IDS[Math.floor(Math.random() * VEHICLE_IDS.length)];

  // ── 1. POST Telemetria → FastAPI ────────────────────────────────────────────
  const payload = JSON.stringify({
    vehicle_id:  vehicleId,
    latitude:    BASE_LAT + (Math.random() - 0.5) * 0.1,
    longitude:   BASE_LON + (Math.random() - 0.5) * 0.1,
    speed:       parseFloat((Math.random() * 120).toFixed(1)),
    fuel_level:  parseFloat((20 + Math.random() * 80).toFixed(1)),
    engine_temp: parseFloat((70 + Math.random() * 40).toFixed(1)),
    timestamp:   new Date().toISOString(),
  });

  const telRes = http.post(
    `${TELEMETRY_URL}/api/telemetry`,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
      tags:    { name: 'PostTelemetry' },
    },
  );

  telemetryDuration.add(telRes.timings.duration);

  const telOk = check(telRes, {
    'telemetry: status 201': (r) => r.status === 201,
    'telemetry: body has id': (r) => {
      try { return JSON.parse(r.body)?.id !== undefined; }
      catch { return false; }
    },
  });
  if (!telOk) telemetryErrors.add(1);

  // ── 2. GET Veículos → NestJS ────────────────────────────────────────────────
  const vehRes = http.get(
    `${CORE_API_URL}/api/vehicles`,
    { tags: { name: 'GetVehicles' } },
  );

  vehicleDuration.add(vehRes.timings.duration);

  const vehOk = check(vehRes, {
    'vehicles: status 200':  (r) => r.status === 200,
    'vehicles: is array':    (r) => {
      try { return Array.isArray(JSON.parse(r.body)); }
      catch { return false; }
    },
  });
  if (!vehOk) vehicleErrors.add(1);

  sleep(0.5); // pausa entre iterações do VU
}

// ─────────────────────────────────────────────────────────────────────────────
// handleSummary — geração automática de relatórios ao final do teste
// ─────────────────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'results/k6-summary.json': JSON.stringify(data, null, 2),
    'results/k6-report.html':  buildHtmlReport(data),
    stdout: buildTextSummary(data),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de relatório
// ─────────────────────────────────────────────────────────────────────────────

function v(metric, field) {
  const val = data => data?.metrics?.[metric]?.values?.[field];
  return val;
}

function fmt(n, decimals = 2) {
  if (n === undefined || n === null) return 'N/A';
  return Number(n).toFixed(decimals);
}

function buildTextSummary(data) {
  const m = data.metrics;
  const totalReqs  = m?.http_reqs?.values?.count ?? 0;
  const rps        = fmt(m?.http_reqs?.values?.rate);
  const errorRate  = fmt((m?.http_req_failed?.values?.rate ?? 0) * 100);
  const p95Global  = fmt(m?.http_req_duration?.values?.['p(95)']);
  const telP95     = fmt(m?.telemetry_duration?.values?.['p(95)']);
  const vehP95     = fmt(m?.vehicle_duration?.values?.['p(95)']);

  return [
    '',
    '═══════════════════════════════════════════════',
    '  Fleet-Log — Resultado do Teste de Carga K6',
    '═══════════════════════════════════════════════',
    `  Total de requests : ${totalReqs}`,
    `  Throughput        : ${rps} req/s`,
    `  Taxa de erros     : ${errorRate} %`,
    `  Latência p95 (global)         : ${p95Global} ms`,
    `  Latência p95 (POST telemetria): ${telP95} ms`,
    `  Latência p95 (GET  vehicles)  : ${vehP95} ms`,
    '───────────────────────────────────────────────',
    '  Relatórios salvos em: load-test/results/',
    '    • k6-summary.json',
    '    • k6-report.html',
    '═══════════════════════════════════════════════',
    '',
  ].join('\n');
}

function buildHtmlReport(data) {
  const m = data.metrics;

  // ── Métricas globais ───────────────────────────────────────────────────────
  const totalReqs  = m?.http_reqs?.values?.count          ?? 0;
  const throughput = fmt(m?.http_reqs?.values?.rate);
  const errorRate  = fmt((m?.http_req_failed?.values?.rate ?? 0) * 100);
  const avgGlobal  = fmt(m?.http_req_duration?.values?.avg);
  const p90Global  = fmt(m?.http_req_duration?.values?.['p(90)']);
  const p95Global  = fmt(m?.http_req_duration?.values?.['p(95)']);
  const p99Global  = fmt(m?.http_req_duration?.values?.['p(99)']);

  // ── Métricas por endpoint ──────────────────────────────────────────────────
  const telAvg = fmt(m?.telemetry_duration?.values?.avg);
  const telP90 = fmt(m?.telemetry_duration?.values?.['p(90)']);
  const telP95 = fmt(m?.telemetry_duration?.values?.['p(95)']);
  const telP99 = fmt(m?.telemetry_duration?.values?.['p(99)']);

  const vehAvg = fmt(m?.vehicle_duration?.values?.avg);
  const vehP90 = fmt(m?.vehicle_duration?.values?.['p(90)']);
  const vehP95 = fmt(m?.vehicle_duration?.values?.['p(95)']);
  const vehP99 = fmt(m?.vehicle_duration?.values?.['p(99)']);

  // ── Thresholds ─────────────────────────────────────────────────────────────
  const thresholdRows = Object.entries(data?.metrics ?? {})
    .flatMap(([name, metric]) => {
      if (!metric.thresholds || Object.keys(metric.thresholds).length === 0) return [];
      return Object.entries(metric.thresholds).map(([condition, result]) => {
        const passed = !result.ok === false; // result.ok = true means passed
        const status = result.ok ? 'PASSOU' : 'FALHOU';
        const color  = result.ok ? '#22c55e' : '#ef4444';
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace">${condition}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;color:${color}">${status}</td>
        </tr>`;
      });
    }).join('');

  // ── Dados para Chart.js ────────────────────────────────────────────────────
  const labels      = JSON.stringify(['avg', 'p(90)', 'p(95)', 'p(99)']);
  const telData     = JSON.stringify([telAvg, telP90, telP95, telP99].map(Number));
  const vehData     = JSON.stringify([vehAvg, vehP90, vehP95, vehP99].map(Number));
  const globalData  = JSON.stringify([avgGlobal, p90Global, p95Global, p99Global].map(Number));

  const now = new Date().toLocaleString('pt-BR');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fleet-Log — Relatório K6</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc; color: #1e293b; padding: 32px 24px;
    }
    h1 { font-size: 1.8rem; font-weight: 700; color: #0f172a; }
    h2 { font-size: 1.1rem; font-weight: 600; color: #334155; margin-bottom: 16px; }
    .subtitle { color: #64748b; font-size: 0.9rem; margin-top: 4px; margin-bottom: 32px; }
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 9999px;
      font-size: 0.75rem; font-weight: 600; margin-left: 8px;
    }
    .badge-blue  { background:#dbeafe; color:#1d4ed8; }
    .badge-green { background:#dcfce7; color:#15803d; }

    /* Cards ──────────────────────────────────────── */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px; margin-bottom: 32px;
    }
    .card {
      background: #fff; border-radius: 12px;
      border: 1px solid #e2e8f0; padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .card-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
    .card-value { font-size: 2rem; font-weight: 700; margin-top: 4px; }
    .card-unit  { font-size: 0.8rem; color: #64748b; }
    .green { color: #22c55e; }
    .red   { color: #ef4444; }
    .blue  { color: #3b82f6; }
    .indigo { color: #6366f1; }

    /* Charts ─────────────────────────────────────── */
    .chart-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px; margin-bottom: 32px;
    }
    .chart-card {
      background: #fff; border-radius: 12px;
      border: 1px solid #e2e8f0; padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .chart-wrapper { position: relative; height: 300px; }

    /* Threshold table ─────────────────────────────── */
    .table-card {
      background: #fff; border-radius: 12px;
      border: 1px solid #e2e8f0; padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06); margin-bottom: 32px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    thead th {
      text-align: left; padding: 8px 12px;
      background: #f1f5f9; color: #475569; font-weight: 600;
      border-bottom: 2px solid #e2e8f0;
    }
    footer { text-align: center; color: #94a3b8; font-size: 0.8rem; margin-top: 16px; }
  </style>
</head>
<body>

  <h1>🚛 Fleet-Log
    <span class="badge badge-blue">K6 Load Test</span>
    <span class="badge badge-green">50 VUs · 30 s</span>
  </h1>
  <p class="subtitle">Gerado em ${now}</p>

  <!-- ── Cards de resumo ──────────────────────────────────────────────── -->
  <div class="cards">
    <div class="card">
      <div class="card-label">Total de Requests</div>
      <div class="card-value blue">${totalReqs}</div>
    </div>
    <div class="card">
      <div class="card-label">Throughput</div>
      <div class="card-value indigo">${throughput}</div>
      <div class="card-unit">req / s</div>
    </div>
    <div class="card">
      <div class="card-label">Taxa de Erros</div>
      <div class="card-value ${Number(errorRate) < 5 ? 'green' : 'red'}">${errorRate}%</div>
    </div>
    <div class="card">
      <div class="card-label">Latência p95 Global</div>
      <div class="card-value ${Number(p95Global) < 2000 ? 'green' : 'red'}">${p95Global}</div>
      <div class="card-unit">ms</div>
    </div>
    <div class="card">
      <div class="card-label">p95 POST Telemetria</div>
      <div class="card-value ${Number(telP95) < 1500 ? 'green' : 'red'}">${telP95}</div>
      <div class="card-unit">ms</div>
    </div>
    <div class="card">
      <div class="card-label">p95 GET Veículos</div>
      <div class="card-value ${Number(vehP95) < 1000 ? 'green' : 'red'}">${vehP95}</div>
      <div class="card-unit">ms</div>
    </div>
  </div>

  <!-- ── Gráficos de latência ──────────────────────────────────────────── -->
  <div class="chart-grid">
    <div class="chart-card">
      <h2>Latência por Endpoint (ms)</h2>
      <div class="chart-wrapper">
        <canvas id="latencyByEndpoint"></canvas>
      </div>
    </div>
    <div class="chart-card">
      <h2>Distribuição Global de Latência (ms)</h2>
      <div class="chart-wrapper">
        <canvas id="globalLatency"></canvas>
      </div>
    </div>
  </div>

  <!-- ── Tabela de Thresholds ──────────────────────────────────────────── -->
  <div class="table-card">
    <h2>Thresholds</h2>
    <table>
      <thead>
        <tr>
          <th>Métrica</th>
          <th>Condição</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        ${thresholdRows || '<tr><td colspan="3" style="padding:12px;color:#94a3b8">Nenhum threshold definido</td></tr>'}
      </tbody>
    </table>
  </div>

  <footer>
    Fleet-Log Load Test Report · K6 · Gerado automaticamente via handleSummary()
  </footer>

  <script>
    // ── Gráfico 1: Latência por endpoint ────────────────────────────────────
    new Chart(document.getElementById('latencyByEndpoint'), {
      type: 'bar',
      data: {
        labels: ${labels},
        datasets: [
          {
            label: 'POST Telemetria (FastAPI)',
            data:  ${telData},
            backgroundColor: 'rgba(99, 102, 241, 0.7)',
            borderColor:     'rgb(99, 102, 241)',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'GET Veículos (NestJS)',
            data:  ${vehData},
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor:     'rgb(34, 197, 94)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.raw + ' ms' } } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Latência (ms)' } } },
      },
    });

    // ── Gráfico 2: Distribuição global ──────────────────────────────────────
    new Chart(document.getElementById('globalLatency'), {
      type: 'bar',
      data: {
        labels: ${labels},
        datasets: [{
          label: 'Global (todos endpoints)',
          data:  ${globalData},
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(168, 85, 247, 0.7)',
          ],
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
            'rgb(168, 85, 247)',
          ],
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ctx.raw + ' ms' } } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Latência (ms)' } } },
      },
    });
  </script>
</body>
</html>`;
}

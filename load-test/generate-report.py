#!/usr/bin/env python3
"""
Fleet-Log — Gerador de Relatório de Série Temporal K6
======================================================

Lê o arquivo raw.json gerado por:
    k6 run k6-script.js --out json=results/raw.json

Gera um relatório HTML interativo com:
  • Throughput ao longo do tempo (req/s por segundo)
  • Latência p95 ao longo do tempo
  • Contagem de VUs ativos ao longo do tempo
  • Resumo de erros por endpoint

Uso:
    python generate-report.py [raw.json] [output.html]

Padrão:
    python generate-report.py results/raw.json results/k6-timeseries.html

Dependências: somente stdlib Python 3.8+
"""

import json
import sys
import os
from datetime import datetime, timezone
from collections import defaultdict
from pathlib import Path


# ─────────────────────────────────────────────────────────────────────────────
# Parsing do NDJSON do K6
# ─────────────────────────────────────────────────────────────────────────────

def parse_k6_json(filepath: str) -> dict:
    """
    Lê o NDJSON gerado por `k6 --out json` e retorna um dicionário com
    séries temporais agrupadas por segundo.
    """
    buckets_reqs:     dict[int, int]   = defaultdict(int)
    buckets_duration: dict[int, list]  = defaultdict(list)
    buckets_vus:      dict[int, int]   = defaultdict(int)
    buckets_errors:   dict[int, int]   = defaultdict(int)

    tel_duration: dict[int, list] = defaultdict(list)
    veh_duration: dict[int, list] = defaultdict(list)

    t_start = None
    t_end   = None

    with open(filepath, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if entry.get('type') != 'Point':
                continue

            metric = entry.get('metric', '')
            point  = entry.get('data', {})
            value  = point.get('value', 0)
            tags   = point.get('tags', {})

            # Parseia timestamp (formato RFC3339 com nanos → truncamos nos µs)
            raw_ts = point.get('time', '')
            try:
                # Remove nanosegundos extras (Python aceita até microssegundos)
                ts_str = raw_ts[:26] + 'Z' if len(raw_ts) > 27 else raw_ts
                ts_str = ts_str.replace('Z', '+00:00')
                ts = datetime.fromisoformat(ts_str)
            except (ValueError, AttributeError):
                continue

            unix_sec = int(ts.timestamp())
            if t_start is None or unix_sec < t_start:
                t_start = unix_sec
            if t_end is None or unix_sec > t_end:
                t_end = unix_sec

            # ── Requests totais ──
            if metric == 'http_reqs':
                buckets_reqs[unix_sec] += int(value)

            # ── Duração das requests (ms) ──
            elif metric == 'http_req_duration':
                buckets_duration[unix_sec].append(value)
                name = tags.get('name', '')
                if name == 'PostTelemetry':
                    tel_duration[unix_sec].append(value)
                elif name == 'GetVehicles':
                    veh_duration[unix_sec].append(value)

            # ── VUs ──
            elif metric == 'vus':
                if value > buckets_vus[unix_sec]:
                    buckets_vus[unix_sec] = int(value)

            # ── Erros ──
            elif metric == 'http_req_failed' and value == 1:
                buckets_errors[unix_sec] += 1

    if t_start is None:
        raise ValueError("Nenhum dado de série temporal encontrado no arquivo.")

    # ── Preenche buracos na série (segundos sem dados = 0 / None) ──
    timeline = list(range(t_start, t_end + 1))
    base     = t_start

    def series_int(d):
        return [d.get(t, 0) for t in timeline]

    def series_p95(d):
        result = []
        for t in timeline:
            vals = d.get(t)
            if vals:
                sorted_vals = sorted(vals)
                idx = max(0, int(len(sorted_vals) * 0.95) - 1)
                result.append(round(sorted_vals[idx], 2))
            else:
                result.append(None)
        return result

    def series_avg(d):
        return [round(sum(v) / len(v), 2) if d.get(t) else None for t in timeline]

    labels = [t - base for t in timeline]  # segundos relativos desde o início

    return {
        'labels':        labels,
        'reqs_per_sec':  series_int(buckets_reqs),
        'p95_global':    series_p95(buckets_duration),
        'avg_global':    series_avg(buckets_duration),
        'p95_telemetry': series_p95(tel_duration),
        'p95_vehicle':   series_p95(veh_duration),
        'vus':           series_int(buckets_vus),
        'errors':        series_int(buckets_errors),
        'total_reqs':    sum(buckets_reqs.values()),
        'total_errors':  sum(buckets_errors.values()),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Geração do HTML
# ─────────────────────────────────────────────────────────────────────────────

HTML_TEMPLATE = '''\
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fleet-Log — Relatório Série Temporal K6</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f8fafc; color: #1e293b; padding: 32px 24px;
    }}
    h1 {{ font-size: 1.8rem; font-weight: 700; color: #0f172a; }}
    h2 {{ font-size: 1rem; font-weight: 600; color: #334155; margin-bottom: 16px; }}
    .subtitle {{ color: #64748b; font-size: 0.9rem; margin-top: 4px; margin-bottom: 32px; }}
    .badge {{
      display: inline-block; padding: 3px 10px; border-radius: 9999px;
      font-size: 0.75rem; font-weight: 600; margin-left: 8px;
    }}
    .badge-purple {{ background:#f3e8ff; color:#7c3aed; }}
    .cards {{
      display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px; margin-bottom: 32px;
    }}
    .card {{
      background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
      padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }}
    .card-label {{ font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing:.05em; }}
    .card-value {{ font-size: 1.9rem; font-weight: 700; margin-top: 4px; }}
    .card-unit  {{ font-size: 0.8rem; color: #64748b; }}
    .blue   {{ color: #3b82f6; }} .green {{ color: #22c55e; }}
    .red    {{ color: #ef4444; }} .amber {{ color: #f59e0b; }}
    .indigo {{ color: #6366f1; }}
    .charts {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }}
    @media (max-width: 900px) {{ .charts {{ grid-template-columns: 1fr; }} }}
    .chart-card {{
      background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
      padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }}
    .chart-card.full {{ grid-column: 1 / -1; }}
    .chart-wrapper {{ position: relative; height: 280px; }}
    footer {{ text-align:center; color:#94a3b8; font-size:0.8rem; margin-top:16px; }}
  </style>
</head>
<body>

  <h1>🚛 Fleet-Log
    <span class="badge badge-purple">Série Temporal — K6 Raw</span>
  </h1>
  <p class="subtitle">
    Gerado em {generated_at} &nbsp;·&nbsp;
    Total de requests: <strong>{total_reqs}</strong> &nbsp;·&nbsp;
    Erros: <strong class="red">{total_errors}</strong>
  </p>

  <div class="cards">
    <div class="card">
      <div class="card-label">Total Requests</div>
      <div class="card-value blue">{total_reqs}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Erros</div>
      <div class="card-value red">{total_errors}</div>
    </div>
    <div class="card">
      <div class="card-label">Taxa de Erro</div>
      <div class="card-value {error_color}">{error_rate}%</div>
    </div>
    <div class="card">
      <div class="card-label">Duração do Teste</div>
      <div class="card-value indigo">{duration}</div>
      <div class="card-unit">segundos</div>
    </div>
  </div>

  <div class="charts">

    <!-- Throughput -->
    <div class="chart-card full">
      <h2>Throughput — Requisições por Segundo</h2>
      <div class="chart-wrapper">
        <canvas id="throughputChart"></canvas>
      </div>
    </div>

    <!-- Latência global p95 e avg -->
    <div class="chart-card">
      <h2>Latência Global — avg vs p95 (ms)</h2>
      <div class="chart-wrapper">
        <canvas id="globalLatencyChart"></canvas>
      </div>
    </div>

    <!-- Latência por endpoint p95 -->
    <div class="chart-card">
      <h2>Latência p95 por Endpoint (ms)</h2>
      <div class="chart-wrapper">
        <canvas id="endpointLatencyChart"></canvas>
      </div>
    </div>

    <!-- VUs ao longo do tempo -->
    <div class="chart-card">
      <h2>VUs Ativos ao Longo do Tempo</h2>
      <div class="chart-wrapper">
        <canvas id="vusChart"></canvas>
      </div>
    </div>

    <!-- Erros ao longo do tempo -->
    <div class="chart-card">
      <h2>Erros por Segundo</h2>
      <div class="chart-wrapper">
        <canvas id="errorsChart"></canvas>
      </div>
    </div>

  </div>

  <footer>
    Fleet-Log Load Test — Relatório de Série Temporal &nbsp;·&nbsp;
    Gerado por generate-report.py a partir de raw.json (k6 --out json)
  </footer>

  <script>
    const labels = {labels};

    const COLORS = {{
      indigo:  "rgb(99, 102, 241)",
      green:   "rgb(34, 197, 94)",
      red:     "rgb(239, 68, 68)",
      amber:   "rgb(245, 158, 11)",
      blue:    "rgb(59, 130, 246)",
      purple:  "rgb(168, 85, 247)",
    }};

    function makeAlpha(color, alpha) {{
      return color.replace("rgb(", "rgba(").replace(")", `, ${{alpha}})`);
    }}

    const commonOpts = {{
      responsive: true, maintainAspectRatio: false,
      interaction: {{ mode: "index", intersect: false }},
      plugins: {{ legend: {{ position: "top" }} }},
    }};

    function lineDs(label, data, color, dashed=false) {{
      return {{
        label, data, borderColor: color,
        backgroundColor: makeAlpha(color, 0.15),
        borderWidth: 2, pointRadius: 0, fill: true,
        tension: 0.3,
        borderDash: dashed ? [5, 5] : [],
      }};
    }}

    // ── Throughput ──────────────────────────────────────────────────────────
    new Chart(document.getElementById("throughputChart"), {{
      type: "line",
      data: {{
        labels,
        datasets: [lineDs("req/s", {reqs_per_sec}, COLORS.indigo)],
      }},
      options: {{
        ...commonOpts,
        plugins: {{
          ...commonOpts.plugins,
          annotation: {{
            annotations: {{
              avgLine: {{
                type: "line", yMin: {avg_throughput}, yMax: {avg_throughput},
                borderColor: COLORS.amber, borderWidth: 2, borderDash: [6, 4],
                label: {{
                  display: true, content: "Média: {avg_throughput} req/s",
                  position: "end", color: COLORS.amber,
                  font: {{ size: 11 }},
                }},
              }},
            }},
          }},
        }},
        scales: {{
          y: {{ beginAtZero: true, title: {{ display: true, text: "req / s" }} }},
          x: {{ title: {{ display: true, text: "Tempo (s)" }} }},
        }},
      }},
    }});

    // ── Latência global ─────────────────────────────────────────────────────
    new Chart(document.getElementById("globalLatencyChart"), {{
      type: "line",
      data: {{
        labels,
        datasets: [
          lineDs("avg (ms)",   {avg_global},  COLORS.blue),
          lineDs("p95 (ms)",   {p95_global},  COLORS.red, true),
        ],
      }},
      options: {{
        ...commonOpts,
        scales: {{
          y: {{ beginAtZero: true, title: {{ display: true, text: "ms" }} }},
          x: {{ title: {{ display: true, text: "Tempo (s)" }} }},
        }},
      }},
    }});

    // ── Latência por endpoint ───────────────────────────────────────────────
    new Chart(document.getElementById("endpointLatencyChart"), {{
      type: "line",
      data: {{
        labels,
        datasets: [
          lineDs("POST Telemetria p95", {p95_telemetry}, COLORS.indigo),
          lineDs("GET Veículos p95",    {p95_vehicle},   COLORS.green),
        ],
      }},
      options: {{
        ...commonOpts,
        scales: {{
          y: {{ beginAtZero: true, title: {{ display: true, text: "ms" }} }},
          x: {{ title: {{ display: true, text: "Tempo (s)" }} }},
        }},
      }},
    }});

    // ── VUs ─────────────────────────────────────────────────────────────────
    new Chart(document.getElementById("vusChart"), {{
      type: "line",
      data: {{
        labels,
        datasets: [lineDs("VUs Ativos", {vus}, COLORS.purple)],
      }},
      options: {{
        ...commonOpts,
        scales: {{
          y: {{ beginAtZero: true, title: {{ display: true, text: "VUs" }} }},
          x: {{ title: {{ display: true, text: "Tempo (s)" }} }},
        }},
      }},
    }});

    // ── Erros ───────────────────────────────────────────────────────────────
    new Chart(document.getElementById("errorsChart"), {{
      type: "bar",
      data: {{
        labels,
        datasets: [{{
          label: "Erros / s",
          data: {errors},
          backgroundColor: makeAlpha(COLORS.red, 0.7),
          borderColor: COLORS.red, borderWidth: 1, borderRadius: 3,
        }}],
      }},
      options: {{
        ...commonOpts,
        scales: {{
          y: {{ beginAtZero: true, ticks: {{ precision: 0 }}, title: {{ display: true, text: "Erros" }} }},
          x: {{ title: {{ display: true, text: "Tempo (s)" }} }},
        }},
      }},
    }});
  </script>
</body>
</html>
'''


def build_html(ts: dict) -> str:
    total_reqs   = ts['total_reqs']
    total_errors = ts['total_errors']
    duration     = len(ts['labels'])
    error_rate   = round(total_errors / total_reqs * 100, 2) if total_reqs else 0
    error_color  = 'green' if error_rate < 5 else 'red'

    # Throughput médio (ignora zeros para não distorcer a média)
    non_zero = [r for r in ts['reqs_per_sec'] if r > 0]
    avg_throughput = round(sum(non_zero) / len(non_zero), 1) if non_zero else 0

    def js(val):
        """Converte list Python → literal JS (null para None)."""
        return json.dumps(val)

    return HTML_TEMPLATE.format(
        generated_at    = datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
        total_reqs      = total_reqs,
        total_errors    = total_errors,
        error_rate      = error_rate,
        error_color     = error_color,
        duration        = duration,
        avg_throughput  = avg_throughput,
        labels          = js(ts['labels']),
        reqs_per_sec    = js(ts['reqs_per_sec']),
        avg_global      = js(ts['avg_global']),
        p95_global      = js(ts['p95_global']),
        p95_telemetry   = js(ts['p95_telemetry']),
        p95_vehicle     = js(ts['p95_vehicle']),
        vus             = js(ts['vus']),
        errors          = js(ts['errors']),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def main():
    raw_path = sys.argv[1] if len(sys.argv) > 1 else 'results/raw.json'
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'results/k6-timeseries.html'

    if not os.path.exists(raw_path):
        print(f"[ERRO] Arquivo não encontrado: {raw_path}")
        print("       Execute o teste com: --out json=results/raw.json")
        sys.exit(1)

    print(f"[1/3] Lendo {raw_path} ...")
    ts = parse_k6_json(raw_path)

    print(f"[2/3] {ts['total_reqs']} requests encontradas em {len(ts['labels'])}s de dados")
    html = build_html(ts)

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(html, encoding='utf-8')

    print(f"[3/3] Relatório gerado: {out_path}")
    print(f"      Abra no browser para visualizar os gráficos de série temporal.")


if __name__ == '__main__':
    main()

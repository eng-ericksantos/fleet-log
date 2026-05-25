#!/usr/bin/env python3
"""
Fleet-Log — Monitor de Recursos dos Containers Docker
======================================================

Captura CPU% e RAM dos containers a cada N segundos via `docker stats`
e ao final gera um relatório HTML interativo com gráficos de série temporal.

Uso:
    python monitor-stats.py [--interval 1] [--output results/docker-stats]

Exemplos:
    python monitor-stats.py                    # padrão: 1s, salva em results/
    python monitor-stats.py --interval 2       # amostragem a cada 2 s
    python monitor-stats.py --output /tmp/run  # prefixo de saída customizado

Pressione Ctrl+C para encerrar a coleta e gerar o relatório HTML automaticamente.

Dependências: somente stdlib Python 3.8+  (sem pip install)
"""

import subprocess
import json
import csv
import sys
import os
import time
import argparse
from datetime import datetime
from collections import defaultdict
from pathlib import Path

# ─────────────────────────────────────────────────────────────────────────────
# Containers monitorados (nomes definidos no docker-compose.yml)
# ─────────────────────────────────────────────────────────────────────────────
TARGETS = ['fleetlog-mongodb', 'fleetlog-postgres']

# Paleta de cores por container (usada no HTML)
CONTAINER_COLORS = {
    'fleetlog-mongodb':  {'border': 'rgb(71,162,72)',  'bg': 'rgba(71,162,72,0.12)'},
    'fleetlog-postgres': {'border': 'rgb(51,103,145)', 'bg': 'rgba(51,103,145,0.12)'},
}

# ─────────────────────────────────────────────────────────────────────────────
# Utilitários de parsing
# ─────────────────────────────────────────────────────────────────────────────

def parse_mem_to_mb(value: str) -> float:
    """Converte string de memória do Docker (ex: '128.4MiB') para MB float."""
    value = value.strip()
    # Tabela: sufixo → multiplicador para MB
    table = [
        ('tib', 1_048_576.0), ('tb', 1_000_000.0),
        ('gib', 1_024.0),     ('gb', 1_000.0),
        ('mib', 1.048576),    ('mb', 1.0),
        ('kib', 0.001024),    ('kb', 0.001),
        ('b',   0.000001),
    ]
    lower = value.lower()
    for suffix, mult in table:
        if lower.endswith(suffix):
            try:
                return round(float(value[: -len(suffix)]) * mult, 2)
            except ValueError:
                return 0.0
    try:
        return float(value)
    except ValueError:
        return 0.0


def parse_pct(value: str) -> float:
    """'12.34%' → 12.34"""
    try:
        return round(float(value.strip().rstrip('%')), 2)
    except ValueError:
        return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Coleta de stats
# ─────────────────────────────────────────────────────────────────────────────

def collect_once(targets: list[str]) -> list[dict]:
    """
    Executa `docker stats --no-stream --format '{{json .}}'` para os containers
    alvo e retorna uma lista de dicionários com as métricas parseadas.
    """
    try:
        result = subprocess.run(
            ['docker', 'stats', '--no-stream', '--format', '{{json .}}'] + targets,
            capture_output=True,
            text=True,
            timeout=8,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        print(f'\n[AVISO] Falha ao chamar docker stats: {exc}')
        return []

    rows = []
    now_ts = datetime.now().isoformat(timespec='seconds')

    for line in result.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue

        name = data.get('Name', '')
        if name not in targets:
            continue

        mem_parts = data.get('MemUsage', '0B / 0B').split('/')
        net_parts = data.get('NetIO',    '0B / 0B').split('/')

        rows.append({
            'timestamp':  now_ts,
            'container':  name,
            'cpu_pct':    parse_pct(data.get('CPUPerc', '0%')),
            'mem_mb':     parse_mem_to_mb(mem_parts[0]) if mem_parts else 0.0,
            'mem_limit_mb': parse_mem_to_mb(mem_parts[1]) if len(mem_parts) > 1 else 0.0,
            'mem_pct':    parse_pct(data.get('MemPerc', '0%')),
            'net_rx_mb':  parse_mem_to_mb(net_parts[0]) if net_parts else 0.0,
            'net_tx_mb':  parse_mem_to_mb(net_parts[1]) if len(net_parts) > 1 else 0.0,
            'pids':       int(data.get('PIDs', '0') or 0),
        })

    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Persistência CSV
# ─────────────────────────────────────────────────────────────────────────────

CSV_FIELDS = ['timestamp', 'container', 'cpu_pct', 'mem_mb', 'mem_limit_mb',
              'mem_pct', 'net_rx_mb', 'net_tx_mb', 'pids']


def save_csv(records: list[dict], filepath: str) -> None:
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w', newline='', encoding='utf-8') as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(records)


# ─────────────────────────────────────────────────────────────────────────────
# Geração do relatório HTML
# ─────────────────────────────────────────────────────────────────────────────

def build_html_report(records: list[dict], interval: int) -> str:
    # Agrupa por container
    by_container: dict[str, list[dict]] = defaultdict(list)
    for r in records:
        by_container[r['container']].append(r)

    if not by_container:
        return '<html><body><p>Nenhum dado coletado.</p></body></html>'

    # Timestamps relativos (segundos desde o início) baseados no container com mais amostras
    ref_container = max(by_container, key=lambda c: len(by_container[c]))
    ref_samples   = by_container[ref_container]
    labels        = list(range(0, len(ref_samples) * interval, interval))

    # Constrói séries por container
    def series(container, field):
        return json.dumps([r[field] for r in by_container.get(container, [])])

    # Cards de resumo: pico e média de CPU e RAM
    def summary_card(container):
        rows = by_container.get(container, [])
        if not rows:
            return {'cpu_avg': 0, 'cpu_peak': 0, 'mem_avg': 0, 'mem_peak': 0}
        return {
            'cpu_avg':  round(sum(r['cpu_pct'] for r in rows) / len(rows), 1),
            'cpu_peak': round(max(r['cpu_pct'] for r in rows), 1),
            'mem_avg':  round(sum(r['mem_mb']  for r in rows) / len(rows), 0),
            'mem_peak': round(max(r['mem_mb']  for r in rows), 0),
        }

    summaries = {c: summary_card(c) for c in TARGETS}
    generated_at = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    duration_sec = len(labels) * interval if labels else 0

    # ── Dataset JS por container ──────────────────────────────────────────────
    def js_datasets(field, alpha=0.7):
        parts = []
        for c in TARGETS:
            color = CONTAINER_COLORS.get(c, {'border': 'gray', 'bg': 'rgba(128,128,128,0.1)'})
            label = c.replace('fleetlog-', '')
            data  = series(c, field)
            parts.append(f"""{{
              label: '{label}',
              data: {data},
              borderColor: '{color["border"]}',
              backgroundColor: '{color["bg"]}',
              borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3,
            }}""")
        return ',\n'.join(parts)

    # ── Cards HTML ────────────────────────────────────────────────────────────
    card_rows = []
    for c in TARGETS:
        s     = summaries[c]
        label = c.replace('fleetlog-', '')
        col   = CONTAINER_COLORS.get(c, {}).get('border', '#666')
        card_rows.append(f"""
        <div class="cgroup" style="border-top: 4px solid {col};">
          <h3 style="color:{col}">{label}</h3>
          <div class="mini-cards">
            <div class="mini-card">
              <div class="mc-label">CPU Médio</div>
              <div class="mc-val">{s['cpu_avg']}%</div>
            </div>
            <div class="mini-card">
              <div class="mc-label">CPU Pico</div>
              <div class="mc-val">{s['cpu_peak']}%</div>
            </div>
            <div class="mini-card">
              <div class="mc-label">RAM Médio</div>
              <div class="mc-val">{int(s['mem_avg'])} MB</div>
            </div>
            <div class="mini-card">
              <div class="mc-label">RAM Pico</div>
              <div class="mc-val">{int(s['mem_peak'])} MB</div>
            </div>
          </div>
        </div>""")
    cards_html = '\n'.join(card_rows)

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fleet-Log — Monitor de Recursos Docker</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f172a; color: #e2e8f0; padding: 32px 24px; min-height: 100vh;
    }}
    h1 {{ font-size: 1.7rem; font-weight: 700; }}
    h2 {{ font-size: 1rem; font-weight: 600; color: #94a3b8; margin-bottom: 16px; }}
    h3 {{ font-size: 1rem; font-weight: 700; margin-bottom: 14px; }}
    .subtitle {{ color: #64748b; font-size: 0.85rem; margin-top: 6px; margin-bottom: 28px; }}
    .badge {{
      display: inline-block; padding: 3px 10px; border-radius: 9999px;
      font-size: 0.72rem; font-weight: 700; margin-left: 8px;
      background: #1e293b; color: #94a3b8; border: 1px solid #334155;
    }}

    /* Container summary groups */
    .groups {{ display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 32px; }}
    .cgroup {{
      flex: 1; min-width: 260px; background: #1e293b;
      border-radius: 12px; padding: 20px;
      border: 1px solid #334155;
    }}
    .mini-cards {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
    .mini-card {{
      background: #0f172a; border-radius: 8px;
      padding: 12px; border: 1px solid #334155;
    }}
    .mc-label {{ font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing:.04em; }}
    .mc-val   {{ font-size: 1.5rem; font-weight: 700; margin-top: 4px; color: #f1f5f9; }}

    /* Charts */
    .charts {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }}
    @media (max-width: 860px) {{ .charts {{ grid-template-columns: 1fr; }} }}
    .chart-card {{
      background: #1e293b; border-radius: 12px; padding: 22px;
      border: 1px solid #334155;
    }}
    .chart-card.full {{ grid-column: 1 / -1; }}
    .chart-wrapper {{ position: relative; height: 260px; }}
    footer {{ text-align: center; color: #475569; font-size: 0.75rem; margin-top: 24px; }}

    /* Legend dot */
    .legend {{ display:flex; gap:20px; margin-bottom:6px; font-size:0.8rem; }}
    .dot {{ width:12px; height:12px; border-radius:50%; display:inline-block; margin-right:5px; }}
  </style>
</head>
<body>

  <h1>🐳 Fleet-Log
    <span class="badge">docker stats</span>
    <span class="badge">CPU &amp; RAM</span>
  </h1>
  <p class="subtitle">
    Gerado em {generated_at}
    &nbsp;·&nbsp; Duração: <strong>{duration_sec}s</strong>
    &nbsp;·&nbsp; Intervalo de amostragem: <strong>{interval}s</strong>
  </p>

  <!-- ── Resumo por container ───────────────────────────────────── -->
  <div class="groups">
    {cards_html}
  </div>

  <!-- ── Gráficos ──────────────────────────────────────────────── -->
  <div class="charts">

    <div class="chart-card full">
      <h2>CPU % ao longo do tempo</h2>
      <div class="chart-wrapper"><canvas id="cpuChart"></canvas></div>
    </div>

    <div class="chart-card">
      <h2>Uso de RAM (MB) ao longo do tempo</h2>
      <div class="chart-wrapper"><canvas id="ramMbChart"></canvas></div>
    </div>

    <div class="chart-card">
      <h2>RAM % ao longo do tempo</h2>
      <div class="chart-wrapper"><canvas id="ramPctChart"></canvas></div>
    </div>

    <div class="chart-card">
      <h2>PIDs ativos ao longo do tempo</h2>
      <div class="chart-wrapper"><canvas id="pidsChart"></canvas></div>
    </div>

    <div class="chart-card">
      <h2>Rede — Recebido acumulado (MB)</h2>
      <div class="chart-wrapper"><canvas id="netRxChart"></canvas></div>
    </div>

  </div>

  <footer>
    Fleet-Log Resource Monitor &nbsp;·&nbsp;
    Gerado por monitor-stats.py via docker stats
  </footer>

  <script>
    const labels = {json.dumps(labels)};

    const DARK_GRID = {{
      color: 'rgba(255,255,255,0.06)',
      border: {{ color: 'rgba(255,255,255,0.1)' }},
    }};

    const commonOpts = {{
      responsive: true,
      maintainAspectRatio: false,
      interaction: {{ mode: 'index', intersect: false }},
      plugins: {{
        legend: {{ position: 'top', labels: {{ color: '#94a3b8', boxWidth: 12, padding: 16 }} }},
      }},
      scales: {{
        x: {{
          ticks: {{ color: '#64748b', maxTicksLimit: 12 }},
          grid: DARK_GRID,
          title: {{ display: true, text: 'Tempo (s)', color: '#64748b' }},
        }},
        y: {{
          ticks: {{ color: '#64748b' }},
          grid: DARK_GRID,
          beginAtZero: true,
        }},
      }},
    }};

    function mk(canvasId, yLabel, datasets) {{
      new Chart(document.getElementById(canvasId), {{
        type: 'line',
        data: {{ labels, datasets }},
        options: {{
          ...commonOpts,
          scales: {{
            ...commonOpts.scales,
            y: {{ ...commonOpts.scales.y, title: {{ display: true, text: yLabel, color: '#64748b' }} }},
          }},
        }},
      }});
    }}

    // ── CPU ──────────────────────────────────────────────────────────────────
    mk('cpuChart', 'CPU %', [
      {js_datasets('cpu_pct')}
    ]);

    // ── RAM MB ───────────────────────────────────────────────────────────────
    mk('ramMbChart', 'MB', [
      {js_datasets('mem_mb')}
    ]);

    // ── RAM % ────────────────────────────────────────────────────────────────
    mk('ramPctChart', 'RAM %', [
      {js_datasets('mem_pct')}
    ]);

    // ── PIDs ─────────────────────────────────────────────────────────────────
    mk('pidsChart', 'PIDs', [
      {js_datasets('pids')}
    ]);

    // ── Net RX ───────────────────────────────────────────────────────────────
    mk('netRxChart', 'MB recebidos', [
      {js_datasets('net_rx_mb')}
    ]);
  </script>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────────────
# Entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Monitora CPU/RAM dos containers Fleet-Log via docker stats.',
    )
    parser.add_argument('--interval', type=float, default=1.0,
                        help='Intervalo entre amostras em segundos (padrão: 1)')
    parser.add_argument('--output', default='results/docker-stats',
                        help='Prefixo do arquivo de saída (padrão: results/docker-stats)')
    parser.add_argument('--containers', nargs='+', default=TARGETS,
                        help='Nomes dos containers a monitorar')
    args = parser.parse_args()

    csv_path  = args.output + '.csv'
    html_path = args.output + '-report.html'
    targets   = args.containers

    # ── Cabeçalho ─────────────────────────────────────────────────────────────
    sep = '═' * 62
    print(sep)
    print('  Fleet-Log — Monitor de Recursos Docker')
    print(sep)
    print(f'  Containers : {", ".join(targets)}')
    print(f'  Intervalo  : {args.interval}s')
    print(f'  CSV        : {csv_path}')
    print(f'  HTML       : {html_path}')
    print('  Pressione  : Ctrl+C para parar e gerar o relatório')
    print(sep)
    print()

    records   = []
    sample_n  = 0
    t_start   = time.time()

    try:
        while True:
            rows = collect_once(targets)
            records.extend(rows)
            sample_n += 1
            elapsed = int(time.time() - t_start)

            # ── Status live ────────────────────────────────────────────────────
            parts = [f'[{elapsed:>4}s] amostra #{sample_n:>4}']
            for r in rows:
                short = r['container'].replace('fleetlog-', '')
                parts.append(
                    f'{short}: CPU {r["cpu_pct"]:5.1f}%  RAM {r["mem_mb"]:7.1f} MB ({r["mem_pct"]:.1f}%)'
                )
            print('\r  ' + '   |   '.join(parts), end='', flush=True)

            time.sleep(args.interval)

    except KeyboardInterrupt:
        pass

    print('\n')

    if not records:
        print('[!] Nenhum dado coletado. Verifique se os containers estão rodando:')
        print('    docker ps --filter name=fleetlog')
        sys.exit(1)

    # ── Salva CSV ─────────────────────────────────────────────────────────────
    save_csv(records, csv_path)
    print(f'  [1/2] CSV salvo       → {csv_path}  ({len(records)} registros)')

    # ── Gera HTML ─────────────────────────────────────────────────────────────
    html = build_html_report(records, int(args.interval))
    Path(html_path).write_text(html, encoding='utf-8')
    print(f'  [2/2] HTML gerado     → {html_path}')
    print()
    print('  Abra o arquivo HTML no browser para visualizar os gráficos.')
    print(sep)


if __name__ == '__main__':
    main()

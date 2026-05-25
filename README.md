<div align="center">

# 🚛 Fleet-Log

**Sistema de Gestão de Frotas e Telemetria**

_Arquitetura de Microfrontends + Microsserviços · TCC_

[![Angular](https://img.shields.io/badge/Angular-18.2-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## Sobre o Projeto

Fleet-Log é uma plataforma completa de gestão de frotas que combina **Microfrontends** (Module Federation) com **Microsserviços** independentes para oferecer monitoramento em tempo real de veículos, motoristas, telemetria GPS e logs de eventos.

O projeto foi construído como TCC explorando padrões modernos de arquitetura distribuída, com separação clara de responsabilidades entre frontend e backend.

---

## Arquitetura

```
fleet-log/
├── apps/                          # Microfrontends Angular
│   ├── shell/        :4200        # Host — Layout, roteamento, sidebar, health-check
│   ├── admin-mf/     :4201        # Remote — Gestão de Veículos e Motoristas
│   └── dash-mf/      :4202        # Remote — Dashboard, Telemetria e Logs
│
├── services/                      # Microsserviços Backend
│   ├── core-api/     :3000        # NestJS + PostgreSQL — CRUD principal
│   └── telemetry-api/ :8000       # FastAPI + MongoDB — Telemetria e eventos
│
└── docker-compose.yml             # Orquestração completa
```

### Diagrama de Comunicação

```
Browser
  └── Shell (4200)  ──── Module Federation ────▶  Admin MF (4201)
          │                                   └──▶  Dash MF (4202)
          │
          ├── HTTP ──▶  Core API (3000)  ──▶  PostgreSQL (5432)
          └── HTTP ──▶  Telemetry API (8000) ──▶  MongoDB (27017)
```

---

## Stack Tecnológica

### Frontend

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Angular | 18.2 |
| Module Federation | @angular-architects/module-federation | 18.0 |
| Build | ngx-build-plus + Webpack | — |
| Estilo | Tailwind CSS | 3.4 |
| Gráficos | Chart.js + ng2-charts | 4.x / 7.x |

### Backend

| Serviço | Tecnologia | Banco de Dados |
|---|---|---|
| Core API | NestJS 10 + TypeORM | PostgreSQL 16 |
| Telemetry API | FastAPI 0.115 + Motor | MongoDB 7 |

### Infraestrutura

- **Docker Compose** — orquestração de todos os serviços
- **Hot-reload** em desenvolvimento em todos os serviços
- **Health-checks** nativos via Docker e endpoint de status no Shell

---

## Funcionalidades

### Admin MF — Gestão
- **Veículos** — Cadastro, listagem e remoção com placa, modelo, marca, ano e quilometragem
- **Motoristas** — Cadastro, listagem e remoção com CNH, categoria e telefone

### Dash MF — Monitoramento
- **Dashboard** — Gráfico de velocidade (line chart) e status da frota (doughnut chart) em tempo real
- **Telemetria** — Tabela com GPS (lat/lng), velocidade, nível de combustível e temperatura do motor por veículo
- **Logs de Eventos** — Registro de ignição, excesso de velocidade, geofence, manutenção e combustível baixo com severidade (info / warning / critical)
- **Seed de dados** — Geração de telemetria simulada integrada com as placas reais do PostgreSQL

### Shell — Plataforma
- Sidebar responsiva com colapso e menu mobile
- **Indicadores de status** (LED) dos serviços Core API e Telemetry API com polling de 30s
- **Graceful fallback** para Microfrontends indisponíveis
- Estatísticas rápidas na tela Home (veículos, motoristas, telemetria do dia, alertas)

---

## Pré-requisitos

- [Docker](https://www.docker.com/get-started) e Docker Compose v2+
- Portas livres: `4200`, `4201`, `4202`, `3000`, `8000`, `5432`, `27017`

---

## Quick Start

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/fleet-log.git
cd fleet-log
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

> Edite `.env` com suas credenciais se necessário. Os valores padrão já funcionam com o Docker Compose.

### 3. Suba todos os serviços

```bash
docker-compose up --build
```

A primeira execução pode levar alguns minutos enquanto as imagens são construídas e as dependências instaladas.

### 4. Acesse a aplicação

| Serviço | URL |
|---|---|
| **Aplicação (Shell)** | http://localhost:4200 |
| Admin MF | http://localhost:4201 |
| Dash MF | http://localhost:4202 |
| Core API (REST) | http://localhost:3000/api |
| **Core API (Swagger)** | http://localhost:3000/api/docs |
| Telemetry API (REST) | http://localhost:8000/api |
| **Telemetry API (Docs)** | http://localhost:8000/docs |

---

## API Reference

### Core API — Veículos `GET /api/vehicles`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/vehicles` | Lista todos os veículos |
| POST | `/api/vehicles` | Cria um veículo |
| DELETE | `/api/vehicles/:id` | Remove um veículo |
| GET | `/api/vehicles/count` | Total de veículos |

### Core API — Motoristas `GET /api/drivers`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/drivers` | Lista todos os motoristas |
| POST | `/api/drivers` | Cria um motorista |
| DELETE | `/api/drivers/:id` | Remove um motorista |
| GET | `/api/drivers/count` | Total de motoristas |

### Telemetry API

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/telemetry` | Lista registros de telemetria |
| POST | `/api/telemetry` | Insere telemetria |
| GET | `/api/telemetry/count` | Total (query `?today=true` para hoje) |
| GET | `/api/logs` | Lista logs/alertas |
| POST | `/api/logs` | Registra evento |
| GET | `/api/logs/count` | Total de logs |
| POST | `/api/simulate/seed` | Gera dados simulados |

---

## Desenvolvimento

### Comandos úteis

```bash
# Ver logs de um serviço específico
docker-compose logs -f core-api
docker-compose logs -f shell

# Acessar terminal de um container
docker-compose exec core-api sh
docker-compose exec telemetry-api sh

# Parar todos os containers (mantém volumes)
docker-compose down

# Parar e remover volumes (reset completo do banco)
docker-compose down -v

# Rebuild após instalar nova dependência
docker-compose up --build
```

### Hot-Reload

Todos os serviços têm hot-reload configurado para desenvolvimento:

| Serviço | Mecanismo |
|---|---|
| Angular (todos) | `--poll 2000` via Dockerfile |
| NestJS | `CHOKIDAR_USEPOLLING=true` + `--watch` |
| FastAPI | `WATCHFILES_FORCE_POLLING=true` + `--reload` |

> **Windows/WSL2:** O polling é necessário pois o inotify não funciona corretamente com bind mounts no Docker Desktop.

### Estrutura de um Microfrontend

Cada app Angular segue o padrão NgModule com roteamento filho:

```
apps/[nome]-mf/
├── webpack.config.js     # Module Federation — expõe ./Module
├── angular.json          # Builder: ngx-build-plus
├── src/app/
│   └── [feature]/
│       ├── [feature].module.ts          # NgModule exposto
│       ├── [feature]-routing.module.ts  # Rotas filhas
│       ├── [feature].component.ts/html  # Layout raiz
│       └── [sub-view]/
│           └── [sub-view].component.ts/html
```

---

## Modelos de Dados

### Vehicle (PostgreSQL)

```typescript
{
  id: string;          // UUID
  plate: string;       // Placa única
  model: string;
  brand: string;
  year: number;
  mileage: number;
  status: string;      // 'active' | 'inactive'
  createdAt: Date;
  updatedAt: Date;
}
```

### TelemetryData (MongoDB)

```python
{
  vehicle_id: str,
  latitude: float,      # -90 a 90
  longitude: float,     # -180 a 180
  speed: float,         # 0 a 400 km/h
  fuel_level: float,    # 0 a 100 %
  engine_temp: float,   # -40 a 200 °C
  timestamp: datetime
}
```

### LogEntry (MongoDB)

```python
{
  vehicle_id: str,
  driver_id: str | None,
  event_type: "ignition_on" | "ignition_off" | "speeding" | "geofence" | "maintenance" | "fuel_low",
  description: str,
  severity: "info" | "warning" | "critical",
  timestamp: datetime
}
```

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `POSTGRES_USER` | Usuário do PostgreSQL | `fleet` |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL | `fleet123` |
| `POSTGRES_DB` | Nome do banco | `fleetlog` |
| `DB_HOST` | Host do PostgreSQL | `postgres` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `MONGO_URL` | URI do MongoDB | `mongodb://mongodb:27017` |
| `MONGO_DB` | Nome do banco MongoDB | `fleetlog` |

---

## Teste de Carga (K6)

O diretório `load-test/` contém um script K6 que simula **50 VUs simultâneos por 30 segundos**, exercitando os dois backends em paralelo:

| Requisição | Endpoint | Serviço |
|---|---|---|
| `POST` | `/api/telemetry` | FastAPI — insere telemetria (sensores) |
| `GET` | `/api/vehicles` | NestJS — lista a frota (dashboard) |

### Pré-requisitos

- [Docker](https://www.docker.com/get-started) instalado (não é necessário instalar o K6 localmente)
- Todos os serviços do Fleet-Log em execução (`docker-compose up`)

### 1. Executar o teste via Docker

```bash
# Windows (PowerShell) — Docker Desktop
docker run --rm `
  -v "${PWD}/load-test:/load-test" `
  -w /load-test `
  -e CORE_API_URL=http://host.docker.internal:3000 `
  -e TELEMETRY_URL=http://host.docker.internal:8000 `
  grafana/k6 run k6-script.js `
  --out json=results/raw.json `
  --out csv=results/raw.csv
```

```bash
# Linux / macOS (bash)
docker run --rm \
  -v "$(pwd)/load-test:/load-test" \
  -w /load-test \
  -e CORE_API_URL=http://host.docker.internal:3000 \
  -e TELEMETRY_URL=http://host.docker.internal:8000 \
  grafana/k6 run k6-script.js \
  --out json=results/raw.json \
  --out csv=results/raw.csv
```

> **Linux sem Docker Desktop:** substitua `host.docker.internal` por `172.17.0.1` (gateway padrão do Docker) ou use `--network host` com `localhost`.

Ao final do teste o terminal exibe um resumo e os seguintes arquivos são criados:

| Arquivo | Conteúdo |
|---|---|
| `load-test/results/raw.json` | Série temporal completa (NDJSON — para gráficos de throughput) |
| `load-test/results/raw.csv` | Todos os pontos de dados em CSV |
| `load-test/results/k6-summary.json` | Métricas agregadas em JSON |
| `load-test/results/k6-report.html` | **Relatório visual** gerado automaticamente (abrir no browser) |

### 2. Gráficos de Throughput — Série Temporal

O arquivo `k6-report.html` gerado pelo próprio K6 exibe gráficos de percentis de latência e cards de resumo. Para um **relatório de série temporal** (req/s ao longo do tempo, latência p95 por segundo, VUs ativos) a partir do `raw.json`:

```bash
# Requer Python 3.8+ — sem dependências externas
python load-test/generate-report.py \
  load-test/results/raw.json \
  load-test/results/k6-timeseries.html
```

Abra `load-test/results/k6-timeseries.html` no browser para visualizar:

- 📈 **Throughput** (req/s por segundo) com linha de média
- ⏱️ **Latência** avg e p95 global ao longo do tempo
- 🔀 **Latência p95 por endpoint** (POST Telemetria vs GET Veículos)
- 👥 **VUs ativos** ao longo do tempo
- 🔴 **Erros** por segundo

### 3. Thresholds definidos

| Métrica | Limite |
|---|---|
| Taxa de erro global | `< 5 %` |
| Latência p95 global | `< 2 000 ms` |
| Latência p95 POST telemetria | `< 1 500 ms` |
| Latência p95 GET veículos | `< 1 000 ms` |

O K6 retorna código de saída `1` se algum threshold for violado — útil para pipelines CI.

---

## Monitoramento de Recursos (Docker Stats)

O script `load-test/monitor-stats.py` captura **CPU% e RAM** dos containers `fleetlog-mongodb` e `fleetlog-postgres` a cada segundo via `docker stats`, permitindo comparar o comportamento de cada banco durante o pico de carga do K6.

### Arquivos gerados

| Arquivo | Conteúdo |
|---|---|
| `results/docker-stats.csv` | Série temporal completa em CSV |
| `results/docker-stats-report.html` | Relatório visual interativo (abrível no browser) |

### Como usar

**Passo 1 — Abra dois terminais lado a lado.**

**Terminal A — inicie o monitor** (antes ou durante o teste K6):

```bash
# Requer Python 3.8+ — sem dependências externas
cd load-test
python monitor-stats.py
```

Parâmetros opcionais:

```bash
python monitor-stats.py --interval 2          # amostra a cada 2 s (padrão: 1 s)
python monitor-stats.py --output /tmp/run     # prefixo de saída customizado
python monitor-stats.py --containers fleetlog-mongodb fleetlog-postgres
```

O terminal mostrará as métricas em tempo real:

```
══════════════════════════════════════════════════════════════
  Fleet-Log — Monitor de Recursos Docker
══════════════════════════════════════════════════════════════
  Containers : fleetlog-mongodb, fleetlog-postgres
  Intervalo  : 1s
  ...
  [  42s] amostra #  42   |   mongodb: CPU   3.2%  RAM   128.4 MB (1.6%)   |   postgres: CPU   0.8%  RAM    45.1 MB (0.6%)
```

**Terminal B — rode o teste K6** (ver seção anterior).

**Encerre o monitor** com `Ctrl+C`: o script salva o CSV e gera o HTML automaticamente.

### Relatório HTML

Abra `load-test/results/docker-stats-report.html` no browser para visualizar:

| Gráfico | O que mostra |
|---|---|
| **CPU %** (full-width) | Consumo de CPU dos dois bancos ao longo do tempo |
| **RAM (MB)** | Crescimento de memória absoluta |
| **RAM %** | Uso relativo em relação ao limite do container |
| **PIDs ativos** | Número de processos/threads no container |
| **Rede RX acumulado** | Total de dados recebidos (acumulado desde o start) |

Cards de resumo mostram **CPU médio, CPU pico, RAM médio e RAM pico** por container — ideal para slides de TCC.

### Fluxo completo em paralelo

```bash
# Terminal 1 — Monitor de recursos
python load-test/monitor-stats.py

# Terminal 2 — Teste de carga K6 (Docker)
docker run --rm \
  -v "$(pwd)/load-test:/load-test" -w /load-test \
  -e CORE_API_URL=http://host.docker.internal:3000 \
  -e TELEMETRY_URL=http://host.docker.internal:8000 \
  grafana/k6 run k6-script.js \
  --out json=results/raw.json --out csv=results/raw.csv

# Terminal 1 — Ctrl+C após o K6 terminar → relatórios gerados

# Terminal 2 — Gera série temporal do K6
python load-test/generate-report.py results/raw.json
```

> **Dica:** rode `monitor-stats.py` alguns segundos **antes** do K6 para capturar a linha de base (idle) dos bancos e destacar o salto de consumo quando o teste começa.

---

## Expandindo o Projeto

Consulte o [REGRAS.md](./REGRAS.md) para guias detalhados sobre:

- Adicionar componentes e rotas nos Microfrontends
- Criar um novo Microfrontend do zero
- Adicionar endpoints na Core API (NestJS)
- Adicionar endpoints na Telemetry API (FastAPI)

---

<div align="center">

Feito com Angular · NestJS · FastAPI · Docker

</div>

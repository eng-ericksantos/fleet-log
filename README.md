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

# Fleet Log — Arquitetura e Diagramas

## 1. Diagrama de Relacionamento de Tabelas

O projeto utiliza dois bancos de dados com responsabilidades distintas: **PostgreSQL** para dados cadastrais e **MongoDB** para dados de telemetria e eventos em tempo real.

---

### 1.1 PostgreSQL — `core-api` (Dados Cadastrais)

> Gerenciado pelo NestJS com TypeORM. As tabelas não possuem FK direta entre si; a associação motorista ↔ veículo ocorre via referência de string nas coleções MongoDB.

```mermaid
erDiagram
    DRIVERS {
        uuid    id          PK "Auto-gerado"
        string  name           "Nome completo"
        string  cnh         UK "11 dígitos, único"
        string  cnhCategory    "A/B/C/D/E/AB/AC/AD/AE"
        string  phone          "DDD + número (10-11 dígitos)"
        string  status         "active | inactive"
        datetime createdAt     "Auto"
        datetime updatedAt     "Auto"
    }

    VEHICLES {
        uuid    id          PK "Auto-gerado"
        string  plate       UK "Formato Mercosul ou antigo"
        string  model          "Ex: Sprinter 415"
        string  brand          "Ex: Mercedes-Benz"
        int     year           "Ano de fabricação"
        float   mileage        "Quilometragem atual (km)"
        string  status         "active | inactive"
        datetime createdAt     "Auto"
        datetime updatedAt     "Auto"
    }
```

---

### 1.2 MongoDB — `telemetry-api` (Telemetria e Logs de Eventos)

> Gerenciado pelo FastAPI (Python). Os campos `vehicle_id` e `driver_id` são referências **soft** (string) aos registros do PostgreSQL — não há FK nativa entre bancos.

```mermaid
erDiagram
    TELEMETRY {
        ObjectId _id        PK "Auto-gerado pelo MongoDB"
        string  vehicle_id     "Ref → vehicles.plate (PostgreSQL)"
        float   latitude       "GPS: -90 a 90"
        float   longitude      "GPS: -180 a 180"
        float   speed          "km/h (0-400)"
        float   fuel_level     "% (0-100), opcional"
        float   engine_temp    "°C (-40 a 200), opcional"
        datetime timestamp     "UTC, auto"
    }

    LOGS {
        ObjectId _id        PK "Auto-gerado pelo MongoDB"
        string  vehicle_id     "Ref → vehicles.plate (PostgreSQL)"
        string  driver_id      "Ref → drivers.id (opcional)"
        string  event_type     "ignition_on/off | speeding | geofence | maintenance | fuel_low"
        string  description    "Descrição do evento (max 500 chars)"
        string  severity       "info | warning | critical"
        datetime timestamp     "UTC, auto"
    }

    TELEMETRY ||--o{ LOGS : "mesmo vehicle_id"
```

---

### 1.3 Referências Cross-Database

```mermaid
erDiagram
    VEHICLES_PG["VEHICLES (PostgreSQL)"] {
        uuid   id    PK
        string plate UK
    }
    DRIVERS_PG["DRIVERS (PostgreSQL)"] {
        uuid   id   PK
        string name
    }
    TELEMETRY_MG["TELEMETRY (MongoDB)"] {
        ObjectId _id       PK
        string   vehicle_id   "→ vehicles.plate"
    }
    LOGS_MG["LOGS (MongoDB)"] {
        ObjectId _id       PK
        string   vehicle_id   "→ vehicles.plate"
        string   driver_id    "→ drivers.id (opcional)"
    }

    VEHICLES_PG ||--o{ TELEMETRY_MG : "vehicle_id (soft ref)"
    VEHICLES_PG ||--o{ LOGS_MG      : "vehicle_id (soft ref)"
    DRIVERS_PG  ||--o{ LOGS_MG      : "driver_id (soft ref, opcional)"
```

---

## 2. Diagrama de Componentes da Arquitetura

```mermaid
graph TB
    subgraph DOCKER["🐳 Docker Compose Network"]
        direction TB

        subgraph MF["Microfrontends — Angular 17 + Module Federation"]
            SHELL["🐚 Shell App<br/>:4200<br/>Host / Orquestrador"]
            ADMIN["⚙️ admin-mf<br/>:4201<br/>Módulo Remoto — Cadastros"]
            DASH["📊 dash-mf<br/>:4202<br/>Módulo Remoto — Dashboard"]
        end

        subgraph BE["Backend — Microserviços"]
            CORE["🟦 core-api<br/>NestJS + TypeORM<br/>:3000"]
            TELE["🐍 telemetry-api<br/>FastAPI + Motor<br/>:8000"]
        end

        subgraph DB["Bancos de Dados"]
            PG[("🐘 PostgreSQL 16<br/>:5433<br/>Dados cadastrais")]
            MONGO[("🍃 MongoDB 7<br/>:27017<br/>Telemetria & Logs")]
        end

        SHELL -->|"loadRemoteModule<br/>/admin"| ADMIN
        SHELL -->|"loadRemoteModule<br/>/dash"| DASH
        ADMIN -->|"REST HTTP<br/>CRUD Drivers & Vehicles"| CORE
        DASH  -->|"REST HTTP<br/>Telemetria & Logs"| TELE
        DASH  -->|"REST HTTP<br/>Consulta cadastros"| CORE
        CORE  -->|"TypeORM"| PG
        TELE  -->|"Motor (async)"| MONGO
    end

    USER["👤 Usuário<br/>Browser"] -->|":4200"| SHELL
```

---

## 3. Fluxograma Geral da Aplicação

```mermaid
flowchart TD
    START(["👤 Usuário acessa\nlocalhost:4200"]) --> SHELL

    subgraph SHELL_BOX["Shell App — Host MF (:4200)"]
        SHELL["App principal carregada\nAngular Router ativo"]
        NAV{{"Rota acessada?"}}
        SHELL --> NAV
    end

    NAV -->|"/home"| HOME["🏠 HomeComponent\n(Shell próprio)"]
    NAV -->|"/admin"| LOAD_ADMIN

    subgraph ADMIN_BOX["admin-mf (:4201)"]
        LOAD_ADMIN["Module Federation\ncarrega remoteEntry.js"] --> ADMIN_MOD["AdminModule\nlazy-loaded"]
        ADMIN_MOD --> ADMIN_NAV{{"Sub-rota?"}}
        ADMIN_NAV -->|"/admin/vehicles"| VEH_PAGE["📋 Veículos\nListagem / CRUD"]
        ADMIN_NAV -->|"/admin/drivers"| DRV_PAGE["👤 Motoristas\nListagem / CRUD"]
    end

    NAV -->|"/dash"| LOAD_DASH

    subgraph DASH_BOX["dash-mf (:4202)"]
        LOAD_DASH["Module Federation\ncarrega remoteEntry.js"] --> DASH_MOD["DashModule\nlazy-loaded"]
        DASH_MOD --> DASH_NAV{{"Sub-rota?"}}
        DASH_NAV -->|"/dash/dashboard"| DASH_PAGE["📊 Dashboard\nKPIs e status geral"]
        DASH_NAV -->|"/dash/telemetry"| TELE_PAGE["📡 Telemetria\nDados GPS / Sensores"]
        DASH_NAV -->|"/dash/logs"| LOGS_PAGE["📋 Logs\nEventos & Alertas"]
    end

    subgraph CORE_API["core-api — NestJS (:3000)"]
        REST_CORE["REST API\n/drivers\n/vehicles\n/health"]
        REST_CORE --> PG_DB[("PostgreSQL\n:5433")]
    end

    subgraph TELE_API["telemetry-api — FastAPI (:8000)"]
        REST_TELE["REST API\n/telemetry\n/logs\n/simulate"]
        REST_TELE --> MONGO_DB[("MongoDB\n:27017")]
    end

    VEH_PAGE -->|"GET/POST/PUT/DELETE\n/vehicles"| REST_CORE
    DRV_PAGE -->|"GET/POST/PUT/DELETE\n/drivers"| REST_CORE
    DASH_PAGE -->|"GET /vehicles\nGET /drivers"| REST_CORE
    TELE_PAGE -->|"GET /telemetry\nGET /telemetry/latest"| REST_TELE
    LOGS_PAGE -->|"GET /logs\nGET /logs/:id"| REST_TELE

    subgraph SIMULATE["Simulação / Load Test"]
        SIM["POST /simulate\n(telemetry-api)"]
        K6["k6 Load Test\n(load-test/)"]
    end

    SIM -->|"Insere dados fake\nno MongoDB"| MONGO_DB
    K6 -->|"Requests concorrentes\npara todos os serviços"| REST_CORE
    K6 -->|"Requests concorrentes\npara todos os serviços"| REST_TELE
```

---

## Resumo de Portas e Containers

| Container | Imagem / Stack | Porta Host | Porta Interna | Depende de |
|---|---|---|---|---|
| `fleetlog-shell` | Angular 17 (webpack-dev-server) | 4200 | 4200 | admin-mf, dash-mf |
| `fleetlog-admin-mf` | Angular 17 + Module Federation | 4201 | 4201 | — |
| `fleetlog-dash-mf` | Angular 17 + Module Federation | 4202 | 4202 | — |
| `fleetlog-core-api` | NestJS + TypeORM | 3000 | 3000 | postgres (healthy) |
| `fleetlog-telemetry-api` | FastAPI + Motor (async) | 8000 | 8000 | mongodb (healthy) |
| `fleetlog-postgres` | PostgreSQL 16-alpine | 5433 | 5432 | — |
| `fleetlog-mongodb` | MongoDB 7 | 27017 | 27017 | — |

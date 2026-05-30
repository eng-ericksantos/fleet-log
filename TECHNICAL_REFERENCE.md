# Fleet Log — Referência Técnica

Documento com os fragmentos de código-fonte que fundamentam cada decisão arquitetural do projeto.

---

## 1. Infraestrutura — Docker Compose

O `docker-compose.yml` define **7 serviços** em uma única rede local gerenciada pelo Docker. Nenhum serviço de banco de dados sobe sem o *healthcheck* ser aprovado — os backends dependem explicitamente de `service_healthy`.

```yaml
# docker-compose.yml
services:
  # =============================================
  # DATABASES
  # =============================================
  postgres:
    image: postgres:16-alpine
    container_name: fleetlog-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb:
    image: mongo:7
    container_name: fleetlog-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # =============================================
  # BACKEND SERVICES
  # =============================================
  core-api:
    build:
      context: ./services/core-api
      dockerfile: Dockerfile
    container_name: fleetlog-core-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_USER: ${DB_USER}
      DB_PASS: ${DB_PASS}
      DB_NAME: ${DB_NAME}
      DB_SYNC: "true"
      CHOKIDAR_USEPOLLING: "true"
    volumes:
      - ./services/core-api:/app
      - /app/node_modules
      - /app/dist
    depends_on:
      postgres:
        condition: service_healthy

  telemetry-api:
    build:
      context: ./services/telemetry-api
      dockerfile: Dockerfile
    container_name: fleetlog-telemetry-api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      MONGO_URL: ${MONGO_URL}
      MONGO_DB: ${MONGO_DB}
      WATCHFILES_FORCE_POLLING: "true"
    volumes:
      - ./services/telemetry-api:/app
    depends_on:
      mongodb:
        condition: service_healthy

  # =============================================
  # MICROFRONTENDS (Angular)
  # =============================================
  shell:
    build:
      context: ./apps/shell
      dockerfile: Dockerfile
    container_name: fleetlog-shell
    restart: unless-stopped
    ports:
      - "4200:4200"
    environment:
      CHOKIDAR_USEPOLLING: "true"
    volumes:
      - ./apps/shell:/app
      - ./apps/admin-mf/src:/mf/admin-mf/src
      - ./apps/dash-mf/src:/mf/dash-mf/src
      - /app/node_modules
      - /app/.angular
    depends_on:
      - admin-mf
      - dash-mf

  admin-mf:
    build:
      context: ./apps/admin-mf
      dockerfile: Dockerfile
    container_name: fleetlog-admin-mf
    restart: unless-stopped
    ports:
      - "4201:4201"
    environment:
      CHOKIDAR_USEPOLLING: "true"
    volumes:
      - ./apps/admin-mf:/app
      - /app/node_modules
      - /app/.angular

  dash-mf:
    build:
      context: ./apps/dash-mf
      dockerfile: Dockerfile
    container_name: fleetlog-dash-mf
    restart: unless-stopped
    ports:
      - "4202:4202"
    environment:
      CHOKIDAR_USEPOLLING: "true"
    volumes:
      - ./apps/dash-mf:/app
      - /app/node_modules
      - /app/.angular

volumes:
  postgres_data:
  mongo_data:
```

> **Observações relevantes:**
> - Não há `deploy.resources` (limits de CPU/memória) definidos — o ambiente é de desenvolvimento local. Em produção, adicionar `mem_limit` e `cpus` por serviço.
> - O volume compartilhado do Shell (`/mf/admin-mf/src` e `/mf/dash-mf/src`) permite hot-reload cruzado entre os MFs durante o desenvolvimento sem rebuild de imagem.
> - `CHOKIDAR_USEPOLLING=true` e `WATCHFILES_FORCE_POLLING=true` são necessários pois o inotify do Linux não propaga eventos de mudança de arquivos de volumes montados no Windows (WSL2/Docker Desktop).

---

## 2. Backends

### 2.1 core-api — NestJS + TypeORM (PostgreSQL)

#### Bootstrap e Swagger (`src/main.ts`)

```typescript
// services/core-api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseTimeInterceptor } from './response-time.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ exposedHeaders: ['X-Response-Time'] });
  app.useGlobalInterceptors(new ResponseTimeInterceptor());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Fleet-Log Core API')
    .setDescription('API de gerenciamento de veículos e motoristas')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log('Core API running on http://localhost:3000');
  console.log('Swagger docs on http://localhost:3000/api/docs');
}
bootstrap();
```

> Swagger UI disponível em `http://localhost:3000/api/docs`. O header `X-Response-Time` é injetado pelo `ResponseTimeInterceptor` global e exposto via CORS para leitura pelo frontend.

#### Entidades TypeORM — Persistência no PostgreSQL

```typescript
// services/core-api/src/vehicles/vehicle.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  plate: string;        // Formato Mercosul ou antigo — validado no DTO

  @Column()
  model: string;

  @Column()
  brand: string;

  @Column({ default: 0 })
  year: number;

  @Column({ type: 'float', default: 0 })
  mileage: number;      // km

  @Column({ default: 'active' })
  status: string;       // 'active' | 'inactive'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

```typescript
// services/core-api/src/drivers/driver.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  cnh: string;          // 11 dígitos, único por motorista

  @Column()
  cnhCategory: string;  // A/B/C/D/E/AB/AC/AD/AE

  @Column()
  phone: string;        // DDD + número (10-11 dígitos)

  @Column({ default: 'active' })
  status: string;       // 'active' | 'inactive'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### 2.2 telemetry-api — FastAPI + Motor (MongoDB)

#### Bootstrap, OpenAPI e Middleware (`app/main.py`)

```python
# services/telemetry-api/app/main.py
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from app.config import settings
from app.seed import run_seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Conexão com MongoDB via Motor (driver async)
    app.state.mongo_client = AsyncIOMotorClient(settings.MONGO_URL)
    app.state.db = app.state.mongo_client[settings.MONGO_DB]

    # Índices compostos para queries de dashboard (vehicle_id + timestamp desc)
    await app.state.db["telemetry"].create_index([("vehicle_id", 1), ("timestamp", -1)])
    await app.state.db["logs"].create_index([("vehicle_id", 1), ("timestamp", -1)])
    await app.state.db["logs"].create_index([("severity", 1)])

    await run_seed_if_empty(app.state.db)
    yield
    app.state.mongo_client.close()


app = FastAPI(
    title="Fleet-Log Telemetry API",
    version="1.0",
    description="API de telemetria e logs de eventos de frota (MongoDB).",
    docs_url="/docs",      # Swagger UI
    redoc_url="/redoc",    # ReDoc
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Response-Time"],
)

@app.middleware("http")
async def add_response_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{elapsed_ms:.2f}ms"
    return response

from app.routers import telemetry, logs, simulate

app.include_router(telemetry.router, prefix="/api/telemetry", tags=["Telemetry"])
app.include_router(logs.router,      prefix="/api/logs",      tags=["Logs"])
app.include_router(simulate.router,  prefix="/api/simulate",  tags=["Simulate"])
```

> Swagger UI disponível em `http://localhost:8000/docs`. Os índices são criados no `lifespan` para garantir performance nas queries de dashboard (filtragem por `vehicle_id` + ordenação por `timestamp`).

#### Modelos Pydantic — Coleções MongoDB

```python
# services/telemetry-api/app/models/telemetry.py
class TelemetryData(BaseModel):
    vehicle_id:  str
    latitude:    float   # GPS: -90 a 90
    longitude:   float   # GPS: -180 a 180
    speed:       float = 0          # km/h (0-400)
    fuel_level:  Optional[float]    # % (0-100)
    engine_temp: Optional[float]    # °C (-40 a 200)
    timestamp:   datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# services/telemetry-api/app/models/log.py
class LogEntry(BaseModel):
    vehicle_id:  str
    driver_id:   Optional[str] = None   # soft ref → drivers.id (PostgreSQL)
    event_type:  EventType              # ignition_on/off | speeding | geofence | maintenance | fuel_low
    description: str                    # max 500 chars
    severity:    Severity = Severity.INFO  # info | warning | critical
    timestamp:   datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

#### Rota com lógica de enriquecimento (`GET /api/telemetry/latest`)

```python
# services/telemetry-api/app/routers/telemetry.py
@router.get("/latest", response_model=List[TelemetryLatestResponse])
async def latest_telemetry(request: Request, limit: int = 5, vehicle_id: Optional[str] = None):
    """
    Retorna os N registros mais recentes, enriquecidos com:
    - event: string legível (velocidade, combustível, temperatura)
    - status: 'normal' | 'warning' | 'critical' derivado dos thresholds dos sensores
    """
    query = {"vehicle_id": vehicle_id} if vehicle_id else {}
    cursor = request.app.state.db["telemetry"].find(query).sort("timestamp", -1).limit(limit)

    results = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        speed, fuel, temp = doc.get("speed", 0), doc.get("fuel_level"), doc.get("engine_temp")

        parts = [f"Velocidade: {speed} km/h"]
        if fuel  is not None: parts.append(f"Combustível: {fuel}%")
        if temp  is not None: parts.append(f"Temp. motor: {temp}°C")
        doc["event"] = " · ".join(parts)

        if speed > 100 or (fuel is not None and fuel < 15):
            doc["status"] = "critical"
        elif speed > 80 or (fuel is not None and fuel < 25):
            doc["status"] = "warning"
        else:
            doc["status"] = "normal"

        results.append(doc)
    return results
```

---

## 3. Frontend — Module Federation (Angular 17)

A federação de módulos é configurada via `@angular-architects/module-federation`. O **Shell** é o Host; **admin-mf** e **dash-mf** são Remotes que expõem seus módulos Angular de forma independente.

### 3.1 Shell — Host (`apps/shell/webpack.config.js`)

```javascript
// apps/shell/webpack.config.js
const { shareAll, withModuleFederationPlugin } = require("@angular-architects/module-federation/webpack");

module.exports = withModuleFederationPlugin({
  // Declara os Remotes disponíveis e suas URLs de entry point
  remotes: {
    adminMf: "adminMf@http://localhost:4201/remoteEntry.js",
    dashMf:  "dashMf@http://localhost:4202/remoteEntry.js",
  },
  shared: {
    ...shareAll({
      singleton: true,      // uma única instância de cada lib compartilhada
      strictVersion: true,
      requiredVersion: "auto",
    }),
  },
});
```

### 3.2 admin-mf — Remote (`apps/admin-mf/webpack.config.js`)

```javascript
// apps/admin-mf/webpack.config.js
module.exports = withModuleFederationPlugin({
  name: "adminMf",
  filename: "remoteEntry.js",       // manifesto carregado pelo Shell em runtime
  exposes: {
    "./Module": "./src/app/admin/admin.module.ts",  // NgModule exposto
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: "auto" }),
  },
});
```

### 3.3 dash-mf — Remote (`apps/dash-mf/webpack.config.js`)

```javascript
// apps/dash-mf/webpack.config.js
module.exports = withModuleFederationPlugin({
  name: "dashMf",
  filename: "remoteEntry.js",
  exposes: {
    "./Module": "./src/app/dash/dash.module.ts",
  },
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: "auto" }),
  },
});
```

### 3.4 Lazy-loading dos Remotes no Router do Shell

```typescript
// apps/shell/src/app/app-routing.module.ts
import { loadRemoteModule } from '@angular-architects/module-federation';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  {
    path: 'admin',
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4201/remoteEntry.js',
        exposedModule: './Module',
      })
        .then((m) => m.AdminModule)
        .catch(() => {
          // Graceful degradation: se o MF estiver indisponível, redireciona ao Home
          console.error('Admin MF unavailable');
          return import('./home/home.component').then((m) => ({
            default: RouterModule.forChild([{ path: '**', component: m.HomeComponent }]),
          }));
        }),
  },
  {
    path: 'dash',
    loadChildren: () =>
      loadRemoteModule({
        type: 'module',
        remoteEntry: 'http://localhost:4202/remoteEntry.js',
        exposedModule: './Module',
      })
        .then((m) => m.DashModule)
        .catch(() => {
          console.error('Dash MF unavailable');
          return import('./home/home.component').then((m) => ({
            default: RouterModule.forChild([{ path: '**', component: m.HomeComponent }]),
          }));
        }),
  },
];
```

> O bloco `.catch()` implementa **graceful degradation**: se um Remote estiver fora do ar, o usuário é redirecionado ao Home em vez de ver uma tela de erro.

---

## 4. Testes de Carga — K6

### Configuração do cenário (`load-test/k6-script.js`)

```javascript
// load-test/k6-script.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const CORE_API_URL  = __ENV.CORE_API_URL  || 'http://localhost:3000';
const TELEMETRY_URL = __ENV.TELEMETRY_URL || 'http://localhost:8000';

// IDs dos veículos de seed disponíveis na telemetry-api
const VEHICLE_IDS = ['VH-001', 'VH-002', 'VH-003', 'VH-004', 'VH-005'];

// Métricas customizadas por endpoint
const telemetryErrors   = new Counter('telemetry_errors');
const vehicleErrors     = new Counter('vehicle_errors');
const telemetryDuration = new Trend('telemetry_duration', true);
const vehicleDuration   = new Trend('vehicle_duration',   true);

// ── Opções do teste ────────────────────────────────────────────────────────
export const options = {
  vus:      50,        // 50 usuários virtuais simultâneos
  duration: '30s',

  thresholds: {
    http_req_failed:    ['rate<0.05'],   // taxa de erro global < 5%
    http_req_duration:  ['p(95)<2000'],  // p95 global < 2 s
    telemetry_duration: ['p(95)<1500'],  // p95 POST telemetria < 1,5 s
    vehicle_duration:   ['p(95)<1000'],  // p95 GET veículos < 1 s
  },
};

// ── Cenário por VU ─────────────────────────────────────────────────────────
export default function () {
  const vehicleId = VEHICLE_IDS[Math.floor(Math.random() * VEHICLE_IDS.length)];

  // 1. POST Telemetria → FastAPI (simula sensor de veículo)
  const payload = JSON.stringify({
    vehicle_id:  vehicleId,
    latitude:    -23.5505 + (Math.random() - 0.5) * 0.1,
    longitude:   -46.6333 + (Math.random() - 0.5) * 0.1,
    speed:       parseFloat((Math.random() * 120).toFixed(1)),
    fuel_level:  parseFloat((20 + Math.random() * 80).toFixed(1)),
    engine_temp: parseFloat((70 + Math.random() * 40).toFixed(1)),
    timestamp:   new Date().toISOString(),
  });

  const telRes = http.post(
    `${TELEMETRY_URL}/api/telemetry`,
    payload,
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'PostTelemetry' } },
  );
  telemetryDuration.add(telRes.timings.duration);
  if (!check(telRes, { 'telemetry: status 201': (r) => r.status === 201 }))
    telemetryErrors.add(1);

  // 2. GET Veículos → NestJS (simula dashboard consultando frota)
  const vehRes = http.get(`${CORE_API_URL}/api/vehicles`, { tags: { name: 'GetVehicles' } });
  vehicleDuration.add(vehRes.timings.duration);
  if (!check(vehRes, { 'vehicles: status 200': (r) => r.status === 200 }))
    vehicleErrors.add(1);

  sleep(0.5);
}

// ── Saída de relatórios ────────────────────────────────────────────────────
export function handleSummary(data) {
  return {
    'results/k6-summary.json': JSON.stringify(data, null, 2),
    'results/k6-report.html':  buildHtmlReport(data),   // relatório Chart.js
    stdout: buildTextSummary(data),
  };
}
```

### Como executar

```bash
# Dentro do container ou com k6 instalado localmente
k6 run load-test/k6-script.js

# Sobrescrevendo as URLs (ex: CI/CD apontando para containers)
k6 run \
  -e CORE_API_URL=http://localhost:3000 \
  -e TELEMETRY_URL=http://localhost:8000 \
  load-test/k6-script.js
```

> Os relatórios são salvos automaticamente em `load-test/results/`:
> - `k6-summary.json` — métricas agregadas em JSON  
> - `k6-report.html` — relatório visual com Chart.js (abrir no browser)

---

## Sumário de Endpoints

### core-api (`http://localhost:3000`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/vehicles` | Listar todos os veículos |
| POST | `/api/vehicles` | Cadastrar veículo |
| PUT | `/api/vehicles/:id` | Atualizar veículo |
| DELETE | `/api/vehicles/:id` | Remover veículo |
| GET | `/api/drivers` | Listar todos os motoristas |
| POST | `/api/drivers` | Cadastrar motorista |
| PUT | `/api/drivers/:id` | Atualizar motorista |
| DELETE | `/api/drivers/:id` | Remover motorista |
| GET | `/api/health` | Health check |
| GET | `/api/docs` | Swagger UI |

### telemetry-api (`http://localhost:8000`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/telemetry` | Registrar dados de telemetria |
| GET | `/api/telemetry` | Listar registros (filtros: vehicle_id, limit) |
| GET | `/api/telemetry/latest` | Últimos registros enriquecidos (status + event) |
| GET | `/api/telemetry/count` | Total de registros (opcional: ?today=true) |
| GET | `/api/logs` | Listar logs de eventos |
| POST | `/api/logs` | Registrar log de evento |
| POST | `/api/simulate` | Simular dados fake de telemetria |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |

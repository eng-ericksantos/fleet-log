# REGRAS.md — Fleet-Log

## Arquitetura do Projeto

```
fleet-log/
├── apps/
│   ├── shell/           → Angular Host (porta 4200) — Layout e Roteamento
│   ├── admin-mf/        → Angular Remote (porta 4201) — Gestão de Veículos/Motoristas
│   └── dash-mf/         → Angular Remote (porta 4202) — Telemetria e Logs
├── services/
│   ├── core-api/        → NestJS + PostgreSQL (porta 3000) — CRUD principal
│   └── telemetry-api/   → FastAPI + MongoDB (porta 8000) — Dados de telemetria
├── docker-compose.yml
├── .env
└── REGRAS.md
```

---

## Como Iniciar o Projeto

```bash
# Na raiz do projeto
docker-compose up --build
```

### URLs de Acesso

| Serviço          | URL                          |
|------------------|------------------------------|
| Shell (Frontend) | http://localhost:4200         |
| Admin MF         | http://localhost:4201         |
| Dash MF          | http://localhost:4202         |
| Core API         | http://localhost:3000/api     |
| Telemetry API    | http://localhost:8000/api     |
| PostgreSQL       | localhost:5432                |
| MongoDB          | localhost:27017               |

---

## Como Adicionar Novas Rotas / Componentes

### 1. Adicionar Componente no Admin MF (exemplo: Manutenção)

```bash
# 1. Crie o arquivo do componente:
# apps/admin-mf/src/app/admin/maintenance/maintenance.component.ts
# apps/admin-mf/src/app/admin/maintenance/maintenance.component.html
```

```typescript
// 2. Declare no AdminModule (apps/admin-mf/src/app/admin/admin.module.ts):
import { MaintenanceComponent } from './maintenance/maintenance.component';

@NgModule({
  declarations: [..., MaintenanceComponent],
  // ...
})
```

```typescript
// 3. Adicione a rota no AdminRoutingModule (apps/admin-mf/src/app/admin/admin-routing.module.ts):
{ path: 'maintenance', component: MaintenanceComponent }
```

### 2. Adicionar Componente no Dash MF

Mesmo processo, dentro de `apps/dash-mf/src/app/dash/`.

### 3. Adicionar Novo Microfrontend (exemplo: Reports MF)

1. Copie a pasta `apps/dash-mf` como `apps/reports-mf`
2. Altere no `package.json`: nome para `reports-mf`
3. Altere no `angular.json`: nome do projeto e portas
4. Altere no `webpack.config.js`:
   ```js
   name: "reportsMf",
   exposes: { "./Module": "./src/app/reports/reports.module.ts" }
   ```
5. Altere no `Dockerfile`: porta par a new a (ex: 4203)
6. No **Shell** (`apps/shell/webpack.config.js`):
   ```js
   remotes: {
     // ... existentes
     reportsMf: "reportsMf@http://localhost:4203/remoteEntry.js"
   }
   ```
7. No **Shell** (`apps/shell/src/decl.d.ts`):
   ```typescript
   declare module 'reportsMf/Module';
   ```
8. No **Shell** (`apps/shell/src/app/app-routing.module.ts`):
   ```typescript
   { path: 'reports', loadChildren: () => import('reportsMf/Module').then(m => m.ReportsModule) }
   ```
9. Adicione no `docker-compose.yml` o novo serviço com porta 4203.

---

## Como Adicionar Endpoints no Backend

### Core API (NestJS)

```bash
# 1. Crie pasta do módulo:
# services/core-api/src/nome-modulo/

# 2. Crie os arquivos:
#   - nome.entity.ts       → Entidade TypeORM
#   - nome.module.ts        → NestJS Module
#   - nome.controller.ts    → Endpoints REST
#   - nome.service.ts       → Lógica de negócio
#   - dto/create-nome.dto.ts → DTO de criação
```

```typescript
// 3. Importe no AppModule (services/core-api/src/app.module.ts):
import { NomeModule } from './nome-modulo/nome.module';

@Module({
  imports: [..., NomeModule],
})
```

### Telemetry API (FastAPI)

```bash
# 1. Crie modelo: services/telemetry-api/app/models/nome.py
# 2. Crie router: services/telemetry-api/app/routers/nome.py
```

```python
# 3. Registre no main.py (services/telemetry-api/app/main.py):
from app.routers import nome
app.include_router(nome.router, prefix="/api/nome", tags=["nome"])
```

---

## Regras de Desenvolvimento

### Hot-Reload
- **Angular**: O `--poll 2000` no Dockerfile garante Hot-Reload no Windows/Docker.
- **NestJS**: `CHOKIDAR_USEPOLLING=true` é definido no docker-compose.
- **FastAPI**: `WATCHFILES_FORCE_POLLING=true` e `--reload` no uvicorn.

### node_modules Isolado
Os volumes anônimos (`/app/node_modules`) no docker-compose garantem que o `node_modules` do container não conflite com o do host.

**Se adicionar uma nova dependência:**
```bash
docker-compose down
docker-compose up --build
```

### Module Federation
- O **Shell** é o Host e carrega os Remotes (Admin/Dash) via `loadChildren` + webpack.
- Cada Remote expõe um `NgModule` via `webpack.config.js` → `exposes`.
- Bibliotecas compartilhadas (`@angular/*`, `rxjs`, etc.) são singletons via `shareAll`.

### Banco de Dados
- **PostgreSQL**: Dados relacionais (veículos, motoristas). `synchronize: true` cria tabelas automaticamente (apenas dev).
- **MongoDB**: Dados de telemetria e logs. Schema-less, ideal para dados de séries temporais.

### Estilização
- **Tailwind CSS** está configurado em todos os projetos Angular.
- Use classes utilitárias do Tailwind nos templates HTML.
- Cores customizadas podem ser adicionadas no `tailwind.config.js` de cada app.

---

## Parar/Reiniciar

```bash
# Parar todos os containers
docker-compose down

# Reiniciar com rebuild
docker-compose up --build

# Ver logs de um serviço específico
docker-compose logs -f core-api

# Acessar terminal de um container
docker-compose exec core-api sh
```

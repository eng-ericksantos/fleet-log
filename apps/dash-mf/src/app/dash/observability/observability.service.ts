import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, interval, Subscription, forkJoin, Observable, defer } from 'rxjs';
import { catchError, map, of, switchMap, timeout } from 'rxjs';

const CORE_API      = 'http://localhost:3000';
const TELEMETRY_API = 'http://localhost:8000';
const MAX_READINGS  = 5;

export type NodeStatus   = 'online' | 'offline' | 'checking';
export type LatencyLevel = 'green'  | 'yellow'  | 'red'    | 'checking';

export interface ApiLatency {
  name:         string;
  label:        string;
  badge:        string;
  readings:     number[];
  avgMs:        number;
  lastMs:       number;
  lastServerMs: number | null;
  level:        LatencyLevel;
}

export interface HealthNode {
  id:       string;
  label:    string;
  sublabel: string;
  type:     'service' | 'database';
  status:   NodeStatus;
}

export type TimelineSource = 'PostgreSQL' | 'MongoDB';

export interface TimelineEntry {
  id:          string;
  timestamp:   string;
  source:      TimelineSource;
  vehicle_id:  string;
  event_type:  string;
  description: string;
  severity?:   'info' | 'warning' | 'critical';
}

@Injectable({ providedIn: 'root' })
export class ObservabilityService implements OnDestroy {

  private coreReadings:      number[] = [];
  private telReadings:       number[] = [];
  private coreLastServerMs:  number | null = null;
  private telLastServerMs:   number | null = null;

  private _latencies$ = new BehaviorSubject<ApiLatency[]>([]);
  readonly latencies$  = this._latencies$.asObservable();

  private _health$ = new BehaviorSubject<HealthNode[]>([
    { id: 'core-api',      label: 'Core API',      sublabel: 'NestJS · :3000',              type: 'service',  status: 'checking' },
    { id: 'postgres',      label: 'PostgreSQL',     sublabel: 'Banco de dados relacional',    type: 'database', status: 'checking' },
    { id: 'telemetry-api', label: 'Telemetry API',  sublabel: 'FastAPI · :8000',              type: 'service',  status: 'checking' },
    { id: 'mongodb',       label: 'MongoDB',        sublabel: 'Banco de dados de documentos', type: 'database', status: 'checking' },
  ]);
  readonly health$ = this._health$.asObservable();

  private subs = new Subscription();

  constructor(private http: HttpClient) {
    this.startLatencyPolling();
    this.startHealthPolling();
  }

  private startLatencyPolling(): void {
    this.subs.add(
      interval(5_000).pipe(switchMap(() => this.probeAll())).subscribe(),
    );
    this.probeAll().subscribe();
  }

  private probeAll(): Observable<void> {
    return forkJoin({
      core:      this.probeEndpoint(`${CORE_API}/api/vehicles/count`),
      telemetry: this.probeEndpoint(`${TELEMETRY_API}/api/telemetry/count`),
    }).pipe(
      map(({ core, telemetry }) => {
        this.pushReading(this.coreReadings, core.clientMs);
        this.coreLastServerMs = core.serverMs;

        this.pushReading(this.telReadings, telemetry.clientMs);
        this.telLastServerMs = telemetry.serverMs;

        this._latencies$.next([
          this.buildApiLatency('core-api',      'Core API',      'NestJS',  this.coreReadings, this.coreLastServerMs),
          this.buildApiLatency('telemetry-api', 'Telemetry API', 'FastAPI', this.telReadings,  this.telLastServerMs),
        ]);
      }),
    );
  }

  private probeEndpoint(url: string): Observable<{ clientMs: number; serverMs: number | null }> {
    return defer(() => {
      const t0 = performance.now();
      return this.http.get(url, { observe: 'response' }).pipe(
        timeout(5_000),
        map((resp) => ({
          clientMs: Math.round(performance.now() - t0),
          serverMs: resp.headers.get('X-Response-Time')
            ? parseFloat(resp.headers.get('X-Response-Time')!)
            : null,
        })),
        catchError(() => of({ clientMs: Math.round(performance.now() - t0), serverMs: null })),
      );
    });
  }

  private pushReading(arr: number[], value: number): void {
    arr.push(value);
    if (arr.length > MAX_READINGS) arr.shift();
  }

  private buildApiLatency(
    name: string, label: string, badge: string,
    readings: number[], lastServerMs: number | null,
  ): ApiLatency {
    const avgMs  = readings.length
      ? Math.round(readings.reduce((a, b) => a + b, 0) / readings.length)
      : 0;
    const lastMs = readings[readings.length - 1] ?? 0;
    let level: LatencyLevel = 'checking';
    if (readings.length > 0) {
      if (avgMs < 100)       level = 'green';
      else if (avgMs <= 500) level = 'yellow';
      else                   level = 'red';
    }
    return { name, label, badge, readings: [...readings], avgMs, lastMs, lastServerMs, level };
  }

  private startHealthPolling(): void {
    this.subs.add(
      interval(10_000).pipe(switchMap(() => this.checkHealth())).subscribe(),
    );
    this.checkHealth().subscribe();
  }

  private checkHealth(): Observable<void> {
    const core$ = this.http.get<any>(`${CORE_API}/api/health`).pipe(
      timeout(4_000),
      catchError((err: any) =>
        err?.status >= 500 && err?.error && typeof err.error === 'object'
          ? of(err.error)
          : of(null),
      ),
    );
    const tel$ = this.http.get<any>(`${TELEMETRY_API}/health`).pipe(
      timeout(4_000),
      catchError((err: any) =>
        err?.status >= 500 && err?.error && typeof err.error === 'object'
          ? of(err.error)
          : of(null),
      ),
    );

    return forkJoin({ core: core$, telemetry: tel$ }).pipe(
      map(({ core, telemetry }) => {
        const nodes = [...this._health$.value];

        const coreAlive = core !== null;
        const pgUp      = core?.info?.postgres?.status === 'up'
                       || core?.details?.postgres?.status === 'up';
        nodes[0] = { ...nodes[0], status: coreAlive ? 'online' : 'offline' };
        nodes[1] = { ...nodes[1], status: coreAlive ? (pgUp ? 'online' : 'offline') : 'offline' };

        const telAlive = telemetry !== null;
        const mongoOk  = telemetry?.mongo === 'connected';
        nodes[2] = { ...nodes[2], status: telAlive ? 'online' : 'offline' };
        nodes[3] = { ...nodes[3], status: telAlive ? (mongoOk ? 'online' : 'offline') : 'offline' };

        this._health$.next(nodes);
      }),
    );
  }

  loadTimeline(): Observable<TimelineEntry[]> {
    const logs$     = this.http.get<any[]>(`${TELEMETRY_API}/api/logs?limit=25`).pipe(catchError(() => of([])));
    const latest$   = this.http.get<any[]>(`${TELEMETRY_API}/api/telemetry/latest?limit=10`).pipe(catchError(() => of([])));
    const vehicles$ = this.http.get<any[]>(`${CORE_API}/api/vehicles`).pipe(catchError(() => of([])));

    return forkJoin({ logs: logs$, latest: latest$, vehicles: vehicles$ }).pipe(
      map(({ logs, latest, vehicles }) => {
        const entries: TimelineEntry[] = [];

        for (const log of logs) {
          entries.push({
            id:          `log-${log.id}`,
            timestamp:   log.timestamp,
            source:      'MongoDB',
            vehicle_id:  log.vehicle_id,
            event_type:  log.event_type,
            description: log.description,
            severity:    log.severity,
          });
        }

        for (const t of latest) {
          entries.push({
            id:          `tel-${t.id}`,
            timestamp:   t.timestamp,
            source:      'MongoDB',
            vehicle_id:  t.vehicle_id,
            event_type:  'telemetry_capture',
            description: t.event ?? `Velocidade: ${t.speed} km/h`,
            severity:    t.status === 'critical' ? 'critical'
                       : t.status === 'warning'  ? 'warning' : 'info',
          });
        }

        for (const v of vehicles) {
          if (v.createdAt) {
            entries.push({
              id:          `veh-${v.id}`,
              timestamp:   v.createdAt,
              source:      'PostgreSQL',
              vehicle_id:  v.plate,
              event_type:  'vehicle_registered',
              description: `${v.plate} — ${v.brand} ${v.model} (${v.year}) · status: ${v.status === 'active' ? 'ativo' : 'inativo'}`,
            });
          }
        }

        return entries
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, 40);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}

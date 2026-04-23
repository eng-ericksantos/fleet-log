import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Stats {
  vehicles: number | null;
  drivers: number | null;
  telemetryToday: number | null;
  alerts: number | null;
}

const CORE_API = 'http://localhost:3000/api';
const TELEMETRY_API = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private http: HttpClient) {}

  getStats(): Observable<Stats> {
    const vehicles$ = this.http
      .get<{ total: number }>(`${CORE_API}/vehicles/count`)
      .pipe(catchError(() => of(null)));

    const drivers$ = this.http
      .get<{ total: number }>(`${CORE_API}/drivers/count`)
      .pipe(catchError(() => of(null)));

    const telemetry$ = this.http
      .get<{ total: number }>(`${TELEMETRY_API}/telemetry/count?today=true`)
      .pipe(catchError(() => of(null)));

    const alerts$ = this.http
      .get<{ total: number }>(`${TELEMETRY_API}/logs/count`)
      .pipe(catchError(() => of(null)));

    return forkJoin([vehicles$, drivers$, telemetry$, alerts$]).pipe(
      map(([v, d, t, a]) => ({
        vehicles: v?.total ?? null,
        drivers: d?.total ?? null,
        telemetryToday: t?.total ?? null,
        alerts: a?.total ?? null,
      }))
    );
  }
}

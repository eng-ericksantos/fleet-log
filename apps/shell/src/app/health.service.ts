import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, forkJoin, timer } from 'rxjs';
import { catchError, of, switchMap } from 'rxjs';

export type ServiceStatus = 'online' | 'offline' | 'checking';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly CORE_URL = 'http://localhost:3000/api/health';
  private readonly TELEMETRY_URL = 'http://localhost:8000/health';

  private core$ = new BehaviorSubject<ServiceStatus>('checking');
  private telemetry$ = new BehaviorSubject<ServiceStatus>('checking');

  readonly coreStatus$ = this.core$.asObservable();
  readonly telemetryStatus$ = this.telemetry$.asObservable();

  constructor(private http: HttpClient) {
    // Check immediately, then re-check every 30 seconds
    timer(0, 30_000)
      .pipe(
        switchMap(() =>
          forkJoin({
            core: this.http.get(this.CORE_URL).pipe(catchError(() => of(null))),
            telemetry: this.http.get(this.TELEMETRY_URL).pipe(catchError(() => of(null))),
          }),
        ),
      )
      .subscribe(({ core, telemetry }) => {
        this.core$.next(core ? 'online' : 'offline');
        this.telemetry$.next(telemetry ? 'online' : 'offline');
      });
  }
}

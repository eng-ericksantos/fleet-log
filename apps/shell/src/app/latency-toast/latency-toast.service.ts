import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LatencyEntry {
  id: number;
  service: string;
  url: string;
  serverMs: number | null;
  clientMs: number;
}

@Injectable({ providedIn: 'root' })
export class LatencyToastService {
  private _toasts$ = new BehaviorSubject<LatencyEntry[]>([]);
  readonly toasts$ = this._toasts$.asObservable();

  private shown = new Set<string>();

  show(url: string, serverHeader: string | null, clientMs: number): void {
    const id = Date.now() + Math.random();
    const service = this.detectService(url);
    const serverMs = serverHeader ? parseFloat(serverHeader) : null;

    console.log(
      `%c[Latência TCC]`,
      'color:#6366f1;font-weight:bold',
      `| serviço: ${service}`,
      `| rota: ${this.shortPath(url)}`,
      `| servidor: ${serverMs != null ? serverMs.toFixed(2) + 'ms' : 'N/A'}`,
      `| cliente: ${clientMs}ms`,
    );

    const path = this.shortPath(url);
    if (this.shown.has(path)) return;
    this.shown.add(path);

    const entry: LatencyEntry = { id, service, url, serverMs, clientMs };
    this._toasts$.next([...this._toasts$.value, entry]);

    setTimeout(() => {
      this._toasts$.next(this._toasts$.value.filter((t) => t.id !== id));
    }, 4000);
  }

  private detectService(url: string): string {
    if (url.includes(':3000')) return 'core-api';
    if (url.includes(':8000')) return 'telemetry-api';
    if (url.includes(':4201')) return 'admin-mf';
    if (url.includes(':4202')) return 'dash-mf';
    return 'shell';
  }

  private shortPath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
}

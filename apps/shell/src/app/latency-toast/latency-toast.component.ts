import { Component } from '@angular/core';
import { LatencyEntry, LatencyToastService } from './latency-toast.service';

@Component({
  selector: 'app-latency-toast',
  templateUrl: './latency-toast.component.html',
})
export class LatencyToastComponent {
  readonly toasts$ = this.toastService.toasts$;

  constructor(private toastService: LatencyToastService) {}

  dotClass(entry: LatencyEntry): string {
    const ms = entry.serverMs ?? entry.clientMs;
    if (ms < 100) return 'bg-green-400';
    if (ms < 500) return 'bg-amber-400';
    return 'bg-red-400';
  }

  timeClass(entry: LatencyEntry): string {
    const ms = entry.serverMs ?? entry.clientMs;
    if (ms < 100) return 'text-green-400';
    if (ms < 500) return 'text-amber-400';
    return 'text-red-400';
  }

  displayMs(entry: LatencyEntry): string {
    return entry.serverMs != null
      ? `${entry.serverMs.toFixed(0)}ms`
      : `~${entry.clientMs}ms`;
  }

  shortPath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ObservabilityService,
  ApiLatency,
  HealthNode,
  TimelineEntry,
} from './observability.service';

@Component({
  selector: 'app-observability',
  templateUrl: './observability.component.html',
})
export class ObservabilityComponent implements OnInit, OnDestroy {
  latencies: ApiLatency[] = [];
  health: HealthNode[] = [];
  timeline: TimelineEntry[] = [];

  timelineLoading = false;
  timelineError   = false;

  lastProbeTime = '—';
  lastHealthTime = '—';

  private subs = new Subscription();

  constructor(private obs: ObservabilityService) {}

  ngOnInit(): void {
    this.subs.add(
      this.obs.latencies$.subscribe((data) => {
        this.latencies = data;
        this.lastProbeTime = new Date().toLocaleTimeString('pt-BR');
      }),
    );
    this.subs.add(
      this.obs.health$.subscribe((data) => {
        this.health = data;
        this.lastHealthTime = new Date().toLocaleTimeString('pt-BR');
      }),
    );
    this.loadTimeline();
  }

  loadTimeline(): void {
    this.timelineLoading = true;
    this.timelineError   = false;
    this.subs.add(
      this.obs.loadTimeline().subscribe({
        next: (entries) => {
          this.timeline = entries;
          this.timelineLoading = false;
        },
        error: () => {
          this.timelineError   = true;
          this.timelineLoading = false;
        },
      }),
    );
  }


  sparkBars(readings: number[]): Array<{ x: number; y: number; h: number; fill: string }> {
    const BAR_W = 10, GAP = 4, MAX_H = 38;
    const maxVal = Math.max(...readings, 1);
    return readings.map((v, i) => {
      const h = Math.max(3, Math.round((v / maxVal) * MAX_H));
      return {
        x:    i * (BAR_W + GAP),
        y:    MAX_H - h,
        h,
        fill: v < 100 ? '#22c55e' : v <= 500 ? '#f59e0b' : '#ef4444',
      };
    });
  }

  sparkWidth(readings: number[]): number {
    return readings.length * 14;
  }

  ledColor(level: ApiLatency['level']): string {
    return { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', checking: '#94a3b8' }[level];
  }

  ledBg(level: ApiLatency['level']): string {
    return {
      green:    'bg-emerald-500 shadow-emerald-500/50',
      yellow:   'bg-amber-400 shadow-amber-400/50',
      red:      'bg-red-500 shadow-red-500/50',
      checking: 'bg-slate-400',
    }[level];
  }

  levelLabel(level: ApiLatency['level']): string {
    return { green: '< 100ms', yellow: '100–500ms', red: '> 500ms', checking: 'Verificando…' }[level];
  }

  minVal(arr: number[]): number { return arr.length ? Math.min(...arr) : 0; }
  maxVal(arr: number[]): number { return arr.length ? Math.max(...arr) : 0; }

  get allOnline(): boolean {
    return this.health.length > 0 && this.health.every((n) => n.status === 'online');
  }

  get anyOffline(): boolean {
    return this.health.some((n) => n.status === 'offline');
  }

  get ecosystemBadgeClass(): string {
    if (this.allOnline)  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (this.anyOffline) return 'bg-red-50 text-red-600 border border-red-200';
    return 'bg-slate-100 text-slate-500';
  }

  get ecosystemDotClass(): string {
    if (this.allOnline)  return 'bg-emerald-500';
    if (this.anyOffline) return 'bg-red-500';
    return 'bg-slate-400';
  }

  get ecosystemLabel(): string {
    if (this.allOnline)  return 'Ecossistema saudável';
    if (this.anyOffline) return 'Degradação detectada';
    return 'Verificando…';
  }

  nodeStatusClass(status: HealthNode['status']): string {
    return {
      online:   'bg-emerald-500 shadow-emerald-500/50 shadow-md',
      offline:  'bg-red-500 shadow-red-500/50 shadow-md',
      checking: 'bg-slate-300 animate-pulse',
    }[status];
  }

  nodeStatusLabel(status: HealthNode['status']): string {
    return { online: 'Online', offline: 'Offline', checking: 'Verificando' }[status];
  }

  nodeStatusTextClass(status: HealthNode['status']): string {
    return { online: 'text-emerald-600', offline: 'text-red-500', checking: 'text-slate-400' }[status];
  }

  nodeBorderClass(status: HealthNode['status']): string {
    return {
      online:   'border-emerald-200 bg-white',
      offline:  'border-red-200 bg-red-50',
      checking: 'border-slate-200 bg-white',
    }[status];
  }

  timelineMarkerClass(entry: TimelineEntry): string {
    if (entry.source === 'PostgreSQL') return 'bg-indigo-500 ring-indigo-100';
    if (entry.severity === 'critical') return 'bg-red-500 ring-red-100';
    if (entry.severity === 'warning')  return 'bg-amber-400 ring-amber-100';
    return 'bg-emerald-500 ring-emerald-100';
  }

  sourceBadgeClass(source: TimelineEntry['source']): string {
    return source === 'PostgreSQL'
      ? 'bg-indigo-100 text-indigo-700'
      : 'bg-emerald-100 text-emerald-700';
  }

  severityBadgeClass(severity?: string): string {
    return {
      critical: 'bg-red-100 text-red-700',
      warning:  'bg-amber-100 text-amber-700',
      info:     'bg-sky-100 text-sky-700',
    }[severity ?? 'info'] ?? 'bg-slate-100 text-slate-600';
  }

  eventTypeLabel(type: string): string {
    const map: Record<string, string> = {
      speeding:           'Excesso de velocidade',
      fuel_low:           'Combustível baixo',
      ignition_on:        'Ignição ligada',
      ignition_off:       'Ignição desligada',
      geofence:           'Geofence',
      maintenance:        'Manutenção',
      telemetry_capture:  'Captura de telemetria',
      vehicle_registered: 'Veículo registrado',
      vehicle_updated:    'Veículo atualizado',
    };
    return map[type] ?? type;
  }

  formatTime(ts: string): string {
    try { return new Date(ts).toLocaleTimeString('pt-BR'); } catch { return ts; }
  }

  formatDate(ts: string): string {
    try {
      return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch { return ''; }
  }

  relativeTime(ts: string): string {
    try {
      const diff = (Date.now() - new Date(ts).getTime()) / 1000;
      if (diff < 60)   return `${Math.round(diff)}s atrás`;
      if (diff < 3600) return `${Math.round(diff / 60)}min atrás`;
      return `${Math.round(diff / 3600)}h atrás`;
    } catch { return ''; }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}

import { Component, OnInit } from '@angular/core';
import { LogsService, LogEntry } from '../services/logs.service';
import { TelemetryService, TelemetryEvent } from '../services/telemetry.service';
import { VehiclesService, Vehicle } from '../services/vehicles.service';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
})
export class LogsComponent implements OnInit {
  logs: LogEntry[] = [];
  telemetryEvents: TelemetryEvent[] = [];
  vehicles: Vehicle[] = [];
  loading = false;
  loadingTelemetry = false;
  filterSeverity = '';
  filterVehicle = '';

  constructor(
    private logsService: LogsService,
    private telemetryService: TelemetryService,
    private vehiclesService: VehiclesService,
  ) {}

  ngOnInit() {
    this.vehiclesService.getAll().subscribe((v) => (this.vehicles = v));
    this.load();
  }

  load() {
    this.loadAlerts();
    this.loadTelemetryAudit();
  }

  loadAlerts() {
    this.loading = true;
    this.logsService
      .getAll(this.filterVehicle || undefined, this.filterSeverity || undefined)
      .subscribe({
        next: (data) => {
          this.logs = data;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
  }

  loadTelemetryAudit() {
    this.loadingTelemetry = true;
    this.telemetryService.getLatest(5, this.filterVehicle || undefined).subscribe({
      next: (data) => {
        this.telemetryEvents = data;
        this.loadingTelemetry = false;
      },
      error: () => (this.loadingTelemetry = false),
    });
  }

  onVehicleChange() {
    this.load();
  }

  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning':  return 'bg-yellow-100 text-yellow-800';
      default:         return 'bg-blue-100 text-blue-800';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'warning':  return 'bg-yellow-100 text-yellow-700';
      default:         return 'bg-green-100 text-green-700';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'critical': return '🔴 Crítico';
      case 'warning':  return '🟡 Alerta';
      default:         return '🟢 Normal';
    }
  }
}

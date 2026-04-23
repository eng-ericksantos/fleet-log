import { Component, OnInit } from '@angular/core';
import { TelemetryService, TelemetryData } from '../services/telemetry.service';
import { VehiclesService, Vehicle } from '../services/vehicles.service';

@Component({
  selector: 'app-telemetry',
  templateUrl: './telemetry.component.html',
})
export class TelemetryComponent implements OnInit {
  telemetryData: TelemetryData[] = [];
  vehicles: Vehicle[] = [];
  loading = false;
  filterVehicle = '';

  constructor(
    private telemetryService: TelemetryService,
    private vehiclesService: VehiclesService,
  ) {}

  ngOnInit() {
    this.vehiclesService.getAll().subscribe((v) => (this.vehicles = v));
    this.load();
  }

  load() {
    this.loading = true;
    this.telemetryService.getAll(this.filterVehicle || undefined).subscribe({
      next: (data) => {
        this.telemetryData = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}

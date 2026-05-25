import { Component, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { forkJoin } from 'rxjs';
import { TelemetryService, TelemetryData, FleetStatus } from '../services/telemetry.service';
import { VehiclesService } from '../services/vehicles.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  loading = false;
  seeding = false;
  seedMessage = '';

  lineChartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
      y: { beginAtZero: true, title: { display: true, text: 'km/h' }, grid: { color: '#f1f5f9' } },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
  };

  doughnutChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
    },
    cutout: '65%',
  };

  totalVehicles = 0;

  constructor(
    private telemetryService: TelemetryService,
    private vehiclesService: VehiclesService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.telemetryService.getAll().subscribe({
      next: (data) => {
        this.buildLineChart(data);
        this.buildDoughnutChart(this.telemetryService.deriveFleetStatus(data));
      },
      error: () => (this.loading = false),
    });
  }

  seed(): void {
    this.seeding = true;
    this.seedMessage = '';
    this.vehiclesService.getAll().subscribe({
      next: (vehicles) => {
        const plates = vehicles.map((v) => v.plate);
        this.telemetryService.seed(10, true, plates.length ? plates : undefined).subscribe({
          next: (res) => {
            this.seeding = false;
            const source = plates.length ? 'veículos do Postgres' : 'veículos de demonstração';
            this.seedMessage = `${res.inserted} registros gerados para ${res.vehicles.join(', ')} (${source})`;
            this.load();
          },
          error: () => {
            this.seeding = false;
            this.seedMessage = 'Erro ao gerar dados — verifique se a API está rodando.';
          },
        });
      },
      error: () => {
        this.telemetryService.seed(10, true).subscribe({
          next: (res) => {
            this.seeding = false;
            this.seedMessage = `${res.inserted} registros gerados para ${res.vehicles.join(', ')} (veículos de demonstração)`;
            this.load();
          },
          error: () => {
            this.seeding = false;
            this.seedMessage = 'Erro ao gerar dados — verifique se a API está rodando.';
          },
        });
      },
    });
  }

  private buildLineChart(data: TelemetryData[]): void {
    const grouped = new Map<string, TelemetryData[]>();
    data.forEach((d) => {
      const list = grouped.get(d.vehicle_id) || [];
      list.push(d);
      grouped.set(d.vehicle_id, list);
    });

    const colors = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ef4444'];
    const allTimestamps = [...new Set(data.map((d) => d.timestamp))].sort();
    const labels = allTimestamps.map((t) =>
      new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );

    let colorIdx = 0;
    const datasets = Array.from(grouped.entries()).map(([vehicleId, entries]) => {
      const color = colors[colorIdx++ % colors.length];
      const speedMap = new Map(entries.map((e) => [e.timestamp, e.speed]));
      return {
        label: vehicleId,
        data: allTimestamps.map((t) => speedMap.get(t) ?? null) as (number | null)[],
        borderColor: color,
        backgroundColor: color + '1a',
        pointBackgroundColor: color,
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      };
    });

    this.lineChartData = { labels, datasets };
    this.loading = false;
  }

  private buildDoughnutChart(status: FleetStatus[]): void {
    this.totalVehicles = status.reduce((sum, s) => sum + s.count, 0);
    this.doughnutChartData = {
      labels: status.map((s) => s.label),
      datasets: [
        {
          data: status.map((s) => s.count),
          backgroundColor: ['#3b82f6', '#94a3b8', '#f97316'],
          hoverBackgroundColor: ['#2563eb', '#64748b', '#ea580c'],
          borderWidth: 0,
        },
      ],
    };
  }
}

import { Component, OnInit } from '@angular/core';
import { StatsService, Stats } from './stats.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  stats: Stats = { vehicles: null, drivers: null, telemetryToday: null, alerts: null };
  loading = true;

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.statsService.getStats().subscribe({
      next: (s) => {
        this.stats = s;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}

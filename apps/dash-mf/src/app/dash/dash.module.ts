import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { DashRoutingModule } from './dash-routing.module';
import { DashComponent } from './dash.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TelemetryComponent } from './telemetry/telemetry.component';
import { LogsComponent } from './logs/logs.component';

@NgModule({
  declarations: [DashComponent, DashboardComponent, TelemetryComponent, LogsComponent],
  imports: [CommonModule, FormsModule, BaseChartDirective, DashRoutingModule],
  providers: [provideCharts(withDefaultRegisterables())],
})
export class DashModule {}

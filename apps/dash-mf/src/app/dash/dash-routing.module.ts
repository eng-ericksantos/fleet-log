import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashComponent } from './dash.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TelemetryComponent } from './telemetry/telemetry.component';
import { LogsComponent } from './logs/logs.component';
import { ObservabilityComponent } from './observability/observability.component';

const routes: Routes = [
  {
    path: '',
    component: DashComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'telemetry', component: TelemetryComponent },
      { path: 'logs', component: LogsComponent },
      { path: 'observability', component: ObservabilityComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashRoutingModule {}

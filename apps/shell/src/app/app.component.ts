import { Component, HostListener } from '@angular/core';
import { HealthService, ServiceStatus } from './health.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent {
  title = 'Fleet-Log';
  sidebarOpen = true;
  mobileMenuOpen = false;

  readonly coreStatus$ = this.healthService.coreStatus$;
  readonly telemetryStatus$ = this.healthService.telemetryStatus$;

  constructor(private healthService: HealthService) {}

  ledClass(status: ServiceStatus): string {
    switch (status) {
      case 'online':   return 'bg-green-500';
      case 'offline':  return 'bg-red-500';
      default:         return 'bg-amber-400 animate-pulse';
    }
  }

  ledLabel(status: ServiceStatus): string {
    switch (status) {
      case 'online':  return 'On';
      case 'offline': return 'Off';
      default:        return '...';
    }
  }

  ledTextClass(status: ServiceStatus): string {
    switch (status) {
      case 'online':  return 'text-green-600';
      case 'offline': return 'text-red-500';
      default:        return 'text-amber-500';
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  openMobileMenu() {
    this.mobileMenuOpen = true;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 1024) {
      this.mobileMenuOpen = false;
    }
  }
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminComponent } from './admin.component';
import { VehiclesComponent } from './vehicles/vehicles.component';
import { DriversComponent } from './drivers/drivers.component';

@NgModule({
  declarations: [AdminComponent, VehiclesComponent, DriversComponent],
  imports: [CommonModule, ReactiveFormsModule, AdminRoutingModule],
})
export class AdminModule {}

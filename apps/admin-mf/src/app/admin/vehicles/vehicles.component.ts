import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VehiclesService, Vehicle } from '../services/vehicles.service';

@Component({
  selector: 'app-vehicles',
  templateUrl: './vehicles.component.html',
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];
  form: FormGroup;
  showForm = false;
  loading = false;
  saving = false;

  constructor(private vehiclesService: VehiclesService, private fb: FormBuilder) {
    this.form = this.fb.group({
      plate: ['', Validators.required],
      model: ['', Validators.required],
      brand: ['', Validators.required],
      year: [2024],
      mileage: [0],
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.vehiclesService.getAll().subscribe({
      next: (data) => {
        this.vehicles = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    this.vehiclesService.create(this.form.value).subscribe({
      next: () => {
        this.form.reset({ year: 2024, mileage: 0 });
        this.showForm = false;
        this.saving = false;
        this.load();
      },
      error: () => (this.saving = false),
    });
  }

  remove(id: string) {
    if (confirm('Deseja remover este veículo?')) {
      this.vehiclesService.delete(id).subscribe(() => this.load());
    }
  }
}

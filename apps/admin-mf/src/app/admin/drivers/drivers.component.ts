import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DriversService, Driver } from '../services/drivers.service';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.component.html',
})
export class DriversComponent implements OnInit {
  drivers: Driver[] = [];
  form: FormGroup;
  showForm = false;
  loading = false;
  saving = false;

  constructor(private driversService: DriversService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      cnh: ['', Validators.required],
      cnhCategory: ['B', Validators.required],
      phone: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.driversService.getAll().subscribe({
      next: (data) => {
        this.drivers = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    this.driversService.create(this.form.value).subscribe({
      next: () => {
        this.form.reset({ cnhCategory: 'B' });
        this.showForm = false;
        this.saving = false;
        this.load();
      },
      error: () => (this.saving = false),
    });
  }

  remove(id: string) {
    if (confirm('Deseja remover este motorista?')) {
      this.driversService.delete(id).subscribe(() => this.load());
    }
  }
}

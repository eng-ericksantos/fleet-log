import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VehiclesService, Vehicle } from '../services/vehicles.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-vehicles',
  templateUrl: './vehicles.component.html',
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];
  count = 0;
  form: FormGroup;
  showForm = false;
  loading = false;
  saving = false;
  editingId: string | null = null;
  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  constructor(private vehiclesService: VehiclesService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      plate: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}-\d[A-Z0-9]\d{2}$/)]],
      model: ['', Validators.required],
      brand: ['', Validators.required],
      year: [2024, [Validators.min(1990), Validators.max(2030)]],
      mileage: [0, [Validators.min(0)]],
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
        this.count = data.length;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  formatPlate(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    const formatted = raw.length > 3 ? raw.slice(0, 3) + '-' + raw.slice(3) : raw;
    input.value = formatted;
    this.form.get('plate')!.setValue(formatted, { emitEvent: false });
    this.form.get('plate')!.markAsTouched();
  }

  openCreate() {
    this.editingId = null;
    this.form.reset({ year: 2024, mileage: 0 });
    this.showForm = true;
  }

  openEdit(v: Vehicle) {
    this.editingId = v.id;
    this.form.reset({ plate: v.plate, model: v.model, brand: v.brand, year: v.year, mileage: v.mileage });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
    this.form.reset({ year: 2024, mileage: 0 });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const action = this.editingId
      ? this.vehiclesService.update(this.editingId, this.form.value)
      : this.vehiclesService.create(this.form.value);

    action.subscribe({
      next: () => {
        this.toast.success(this.editingId ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado com sucesso!');
        this.closeForm();
        this.saving = false;
        this.load();
      },
      error: () => {
        this.toast.error('Erro ao salvar veículo. Verifique os dados e tente novamente.');
        this.saving = false;
      },
    });
  }

  toggleStatus(v: Vehicle) {
    const newStatus = v.status === 'active' ? 'inactive' : 'active';
    this.vehiclesService.update(v.id, { status: newStatus }).subscribe({
      next: () => {
        this.toast.success(`Status de ${v.model} alterado para ${newStatus === 'active' ? 'Ativo' : 'Inativo'}.`);
        this.load();
      },
      error: () => this.toast.error('Erro ao alterar status do veículo.'),
    });
  }

  openConfirm(message: string, action: () => void) {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirm = true;
  }

  executeConfirm() {
    if (this.confirmAction) this.confirmAction();
    this.showConfirm = false;
    this.confirmAction = null;
  }

  cancelConfirm() {
    this.showConfirm = false;
    this.confirmAction = null;
  }

  remove(v: Vehicle) {
    this.openConfirm(
      `Remover o veículo <strong>${v.plate} — ${v.model}</strong>? Esta ação não pode ser desfeita.`,
      () => this.vehiclesService.delete(v.id).subscribe({
        next: () => { this.toast.success(`Veículo ${v.plate} removido.`); this.load(); },
        error: () => this.toast.error('Erro ao remover veículo.'),
      })
    );
  }
}

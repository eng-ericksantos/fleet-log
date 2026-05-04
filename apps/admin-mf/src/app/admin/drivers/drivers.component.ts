import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { DriversService, Driver } from '../services/drivers.service';
import { ToastService } from '../services/toast.service';
import { cnhValidator } from '../validators/cnh.validator';

function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const digits = (control.value || '').replace(/\D/g, '');
    if (digits.length === 0) return null;
    if (digits.length < 10 || digits.length > 11) return { phoneInvalid: true };
    return null;
  };
}

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.component.html',
})
export class DriversComponent implements OnInit {
  drivers: Driver[] = [];
  count = 0;
  form: FormGroup;
  showForm = false;
  loading = false;
  saving = false;
  editingId: string | null = null;
  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  constructor(private driversService: DriversService, private fb: FormBuilder, private toast: ToastService) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\u00C0-\u024F\s]+$/)]],
      cnh: ['', [Validators.required, cnhValidator()]],
      cnhCategory: ['B', Validators.required],
      phone: ['', [Validators.required, phoneValidator()]],
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
        this.count = data.length;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private formatPhone(digits: string): string {
    const d = digits.replace(/\D/g, '');
    if (d.length === 0) return '';
    if (d.length <= 2)  return `(${d}`;
    if (d.length <= 6)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  onNameInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/[^a-zA-Z\u00C0-\u024F\s]/g, '');
    input.value = val;
    this.form.get('name')!.setValue(val, { emitEvent: false });
  }

  onCnhInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/\D/g, '').slice(0, 11);
    input.value = val;
    this.form.get('cnh')!.setValue(val, { emitEvent: false });
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const formatted = this.formatPhone(digits);
    input.value = formatted;
    this.form.get('phone')!.setValue(formatted, { emitEvent: false });
    this.form.get('phone')!.markAsTouched();
  }

  openCreate() {
    this.editingId = null;
    this.form.reset({ cnhCategory: 'B' });
    this.showForm = true;
  }

  openEdit(d: Driver) {
    this.editingId = d.id;
    this.form.reset({ name: d.name, cnh: d.cnh, cnhCategory: d.cnhCategory, phone: this.formatPhone(d.phone) });
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
    this.form.reset({ cnhCategory: 'B' });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = { ...this.form.value, phone: this.form.value.phone.replace(/\D/g, '') };
    const action = this.editingId
      ? this.driversService.update(this.editingId, payload)
      : this.driversService.create(payload);

    action.subscribe({
      next: () => {
        this.toast.success(this.editingId ? 'Motorista atualizado com sucesso!' : 'Motorista cadastrado com sucesso!');
        this.closeForm();
        this.saving = false;
        this.load();
      },
      error: () => {
        this.toast.error('Erro ao salvar motorista. Verifique os dados e tente novamente.');
        this.saving = false;
      },
    });
  }

  toggleStatus(d: Driver) {
    const newStatus = d.status === 'active' ? 'inactive' : 'active';
    this.driversService.update(d.id, { status: newStatus }).subscribe({
      next: () => {
        this.toast.success(`Status de ${d.name} alterado para ${newStatus === 'active' ? 'Ativo' : 'Inativo'}.`);
        this.load();
      },
      error: () => this.toast.error('Erro ao alterar status do motorista.'),
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

  remove(d: Driver) {
    this.openConfirm(
      `Remover o motorista <strong>${d.name}</strong>? Esta ação não pode ser desfeita.`,
      () => this.driversService.delete(d.id).subscribe({
        next: () => { this.toast.success(`Motorista ${d.name} removido.`); this.load(); },
        error: () => this.toast.error('Erro ao remover motorista.'),
      })
    );
  }
}

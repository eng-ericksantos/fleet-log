import { Component } from '@angular/core';
import { ToastService, Toast } from './services/toast.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  constructor(public toastService: ToastService) {}
}

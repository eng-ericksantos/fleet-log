import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private _toasts = new BehaviorSubject<Toast[]>([]);
  toasts$ = this._toasts.asObservable();

  private add(type: Toast['type'], message: string) {
    const id = ++this.counter;
    const current = this._toasts.getValue();
    this._toasts.next([...current, { id, type, message }]);
    setTimeout(() => this.remove(id), 4000);
  }

  success(message: string) { this.add('success', message); }
  error(message: string)   { this.add('error', message); }
  info(message: string)    { this.add('info', message); }

  remove(id: number) {
    this._toasts.next(this._toasts.getValue().filter(t => t.id !== id));
  }
}

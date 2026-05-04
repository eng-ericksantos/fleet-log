import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Driver {
  id: string;
  name: string;
  cnh: string;
  cnhCategory: string;
  phone: string;
  status: string;
  createdAt: string;
}

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class DriversService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<Driver[]> {
    return this.http.get<Driver[]>(`${API_URL}/drivers`);
  }

  getCount(): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${API_URL}/drivers/count`);
  }

  create(data: Partial<Driver>): Observable<Driver> {
    return this.http.post<Driver>(`${API_URL}/drivers`, data);
  }

  update(id: string, data: Partial<Driver>): Observable<Driver> {
    return this.http.put<Driver>(`${API_URL}/drivers/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/drivers/${id}`);
  }
}

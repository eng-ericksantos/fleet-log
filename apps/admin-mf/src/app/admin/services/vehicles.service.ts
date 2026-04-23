import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  mileage: number;
  status: string;
  createdAt: string;
}

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class VehiclesService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${API_URL}/vehicles`);
  }

  create(data: Partial<Vehicle>): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${API_URL}/vehicles`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/vehicles/${id}`);
  }
}

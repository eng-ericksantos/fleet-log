import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  year: number;
  mileage: number;
  status: string;
}

const CORE_API = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class VehiclesService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<Vehicle[]> {
    return this.http
      .get<Vehicle[]>(`${CORE_API}/vehicles`)
      .pipe(catchError(() => of([])));
  }
}

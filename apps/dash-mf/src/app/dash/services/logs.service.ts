import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LogEntry {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  event_type: string;
  description: string;
  severity: string;
  timestamp: string;
}

const API_URL = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class LogsService {
  constructor(private http: HttpClient) {}

  getAll(vehicleId?: string, severity?: string): Observable<LogEntry[]> {
    const params = new URLSearchParams();
    if (vehicleId) params.set('vehicle_id', vehicleId);
    if (severity) params.set('severity', severity);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.http.get<LogEntry[]>(`${API_URL}/logs${query}`);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';

export interface TelemetryData {
  id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  fuel_level: number | null;
  engine_temp: number | null;
  timestamp: string;
}

export interface TelemetryEvent extends TelemetryData {
  event: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface FleetStatus {
  label: string;
  count: number;
}

const API_URL = 'http://localhost:8000/api';

const MOCK_TELEMETRY: TelemetryData[] = [
  { id: '1', vehicle_id: 'VH-001', latitude: -23.5505, longitude: -46.6333, speed: 72, fuel_level: 85, engine_temp: 88, timestamp: '2026-04-21T08:00:00Z' },
  { id: '2', vehicle_id: 'VH-001', latitude: -23.5510, longitude: -46.6340, speed: 65, fuel_level: 82, engine_temp: 90, timestamp: '2026-04-21T08:15:00Z' },
  { id: '3', vehicle_id: 'VH-001', latitude: -23.5520, longitude: -46.6350, speed: 80, fuel_level: 78, engine_temp: 92, timestamp: '2026-04-21T08:30:00Z' },
  { id: '4', vehicle_id: 'VH-001', latitude: -23.5530, longitude: -46.6360, speed: 55, fuel_level: 75, engine_temp: 87, timestamp: '2026-04-21T08:45:00Z' },
  { id: '5', vehicle_id: 'VH-001', latitude: -23.5540, longitude: -46.6370, speed: 90, fuel_level: 70, engine_temp: 95, timestamp: '2026-04-21T09:00:00Z' },
  { id: '6', vehicle_id: 'VH-002', latitude: -22.9068, longitude: -43.1729, speed: 0,  fuel_level: 60, engine_temp: 45, timestamp: '2026-04-21T08:00:00Z' },
  { id: '7', vehicle_id: 'VH-002', latitude: -22.9068, longitude: -43.1729, speed: 0,  fuel_level: 60, engine_temp: 44, timestamp: '2026-04-21T08:15:00Z' },
  { id: '8', vehicle_id: 'VH-002', latitude: -22.9075, longitude: -43.1735, speed: 40, fuel_level: 58, engine_temp: 70, timestamp: '2026-04-21T08:30:00Z' },
  { id: '9', vehicle_id: 'VH-002', latitude: -22.9085, longitude: -43.1745, speed: 68, fuel_level: 55, engine_temp: 82, timestamp: '2026-04-21T08:45:00Z' },
  { id: '10', vehicle_id: 'VH-002', latitude: -22.9095, longitude: -43.1755, speed: 75, fuel_level: 52, engine_temp: 85, timestamp: '2026-04-21T09:00:00Z' },
  { id: '11', vehicle_id: 'VH-003', latitude: -19.9167, longitude: -43.9345, speed: 45, fuel_level: 92, engine_temp: 78, timestamp: '2026-04-21T08:00:00Z' },
  { id: '12', vehicle_id: 'VH-003', latitude: -19.9175, longitude: -43.9350, speed: 58, fuel_level: 90, engine_temp: 80, timestamp: '2026-04-21T08:15:00Z' },
  { id: '13', vehicle_id: 'VH-003', latitude: -19.9180, longitude: -43.9355, speed: 62, fuel_level: 87, engine_temp: 83, timestamp: '2026-04-21T08:30:00Z' },
  { id: '14', vehicle_id: 'VH-003', latitude: -19.9185, longitude: -43.9360, speed: 0,  fuel_level: 85, engine_temp: 60, timestamp: '2026-04-21T08:45:00Z' },
  { id: '15', vehicle_id: 'VH-003', latitude: -19.9185, longitude: -43.9360, speed: 0,  fuel_level: 85, engine_temp: 55, timestamp: '2026-04-21T09:00:00Z' },
];

@Injectable({ providedIn: 'root' })
export class TelemetryService {
  constructor(private http: HttpClient) {}

  getAll(vehicleId?: string, limit = 100): Observable<TelemetryData[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (vehicleId) params.set('vehicle_id', vehicleId);
    return this.http
      .get<TelemetryData[]>(`${API_URL}/telemetry?${params}`)
      .pipe(catchError(() => of(MOCK_TELEMETRY)));
  }

  deriveFleetStatus(data: TelemetryData[]): FleetStatus[] {
    const latest = new Map<string, TelemetryData>();
    for (const d of data) {
      const prev = latest.get(d.vehicle_id);
      if (!prev || d.timestamp > prev.timestamp) {
        latest.set(d.vehicle_id, d);
      }
    }
    let moving = 0;
    let stopped = 0;
    for (const entry of latest.values()) {
      if (entry.speed > 0) moving++;
      else stopped++;
    }
    const result: FleetStatus[] = [];
    if (moving > 0) result.push({ label: 'Em movimento', count: moving });
    if (stopped > 0) result.push({ label: 'Parado', count: stopped });
    return result;
  }

  getLatest(limit = 5, vehicleId?: string): Observable<TelemetryEvent[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (vehicleId) params.set('vehicle_id', vehicleId);
    return this.http
      .get<TelemetryEvent[]>(`${API_URL}/telemetry/latest?${params}`)
      .pipe(catchError(() => of([])));
  }

  seed(count = 10, clear = false, vehiclePlates?: string[]): Observable<{ inserted: number; vehicles: string[]; records_per_vehicle: number }> {
    const params = new URLSearchParams({ count: String(count), clear: String(clear) });
    if (vehiclePlates?.length) {
      vehiclePlates.forEach((p) => params.append('vehicle_ids', p));
    }
    return this.http.post<{ inserted: number; vehicles: string[]; records_per_vehicle: number }>(
      `${API_URL}/simulate/seed?${params}`,
      {}
    );
  }
}


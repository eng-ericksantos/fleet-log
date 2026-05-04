import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicles/vehicle.entity';
import { Driver } from './drivers/driver.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Vehicle) private vehiclesRepo: Repository<Vehicle>,
    @InjectRepository(Driver) private driversRepo: Repository<Driver>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedVehicles();
    await this.seedDrivers();
  }

  private async seedVehicles() {
    const count = await this.vehiclesRepo.count();
    if (count > 0) return;

    const vehicles = [
      { plate: 'ABC-1D23', model: 'Sprinter 415', brand: 'Mercedes-Benz', year: 2023, mileage: 18500, status: 'active' },
      { plate: 'DEF-2E34', model: 'Daily 35S14', brand: 'Iveco', year: 2022, mileage: 42300, status: 'active' },
      { plate: 'GHI-3F45', model: 'Strada Endurance', brand: 'Fiat', year: 2024, mileage: 5200, status: 'active' },
      { plate: 'JKL-4G56', model: 'Ranger XLS', brand: 'Ford', year: 2021, mileage: 78900, status: 'inactive' },
      { plate: 'MNO-5H67', model: 'S10 LTZ', brand: 'Chevrolet', year: 2023, mileage: 31400, status: 'active' },
    ];

    await this.vehiclesRepo.save(vehicles);
    this.logger.log(`Seeded ${vehicles.length} vehicles`);
  }

  private async seedDrivers() {
    const count = await this.driversRepo.count();
    if (count > 0) return;

    const drivers = [
      { name: 'Carlos Eduardo Silva', cnh: '12345678901', cnhCategory: 'D', phone: '11987654321', status: 'active' },
      { name: 'Ana Paula Souza', cnh: '23456789012', cnhCategory: 'B', phone: '21976543210', status: 'active' },
      { name: 'Roberto Oliveira', cnh: '34567890123', cnhCategory: 'E', phone: '31965432109', status: 'active' },
      { name: 'Fernanda Lima', cnh: '45678901234', cnhCategory: 'B', phone: '41954321098', status: 'inactive' },
      { name: 'Marcos Pereira', cnh: '56789012345', cnhCategory: 'C', phone: '51943210987', status: 'active' },
    ];

    await this.driversRepo.save(drivers);
    this.logger.log(`Seeded ${drivers.length} drivers`);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly repo: Repository<Vehicle>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  count() {
    return this.repo.count();
  }

  async findOne(id: string) {
    const vehicle = await this.repo.findOneBy({ id });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    return vehicle;
  }

  create(dto: CreateVehicleDto) {
    const vehicle = this.repo.create(dto);
    return this.repo.save(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
    return { deleted: true };
  }
}

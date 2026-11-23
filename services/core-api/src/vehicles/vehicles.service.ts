import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { rethrowUniqueViolation } from '../common/db-errors';
import { Vehicle } from './vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly repo: Repository<Vehicle>,
    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.repo.find({ order: { status: 'ASC', model: 'ASC' } });
  }

  count() {
    return this.repo.count();
  }

  async findOne(id: string) {
    const vehicle = await this.repo.findOneBy({ id });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    return vehicle;
  }

  async create(dto: CreateVehicleDto) {
    try {
      return await this.repo.save(this.repo.create(dto));
    } catch (err) {
      rethrowUniqueViolation(err, 'Já existe um veículo com esta placa');
    }
  }

  // Leitura, escrita e releitura na mesma transação, com lock de linha para evitar corrida entre requisições.
  async update(id: string, dto: UpdateVehicleDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Vehicle);
        await this.lockOrFail(repo, id);
        await repo.update(id, dto);
        return repo.findOneByOrFail({ id });
      });
    } catch (err) {
      rethrowUniqueViolation(err, 'Já existe um veículo com esta placa');
    }
  }

  async remove(id: string) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Vehicle);
      await this.lockOrFail(repo, id);
      await repo.delete(id);
    });
    return { deleted: true };
  }

  private async lockOrFail(repo: Repository<Vehicle>, id: string) {
    const vehicle = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!vehicle) throw new NotFoundException('Veículo não encontrado');
    return vehicle;
  }
}

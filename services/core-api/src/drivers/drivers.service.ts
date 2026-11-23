import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { rethrowUniqueViolation } from '../common/db-errors';
import { Driver } from './driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly repo: Repository<Driver>,
    private readonly dataSource: DataSource,
  ) {}

  findAll() {
    return this.repo.find({ order: { status: 'ASC', name: 'ASC' } });
  }

  count() {
    return this.repo.count();
  }

  async findOne(id: string) {
    const driver = await this.repo.findOneBy({ id });
    if (!driver) throw new NotFoundException('Motorista não encontrado');
    return driver;
  }

  async create(dto: CreateDriverDto) {
    try {
      return await this.repo.save(this.repo.create(dto));
    } catch (err) {
      rethrowUniqueViolation(err, 'Já existe um motorista com esta CNH');
    }
  }

  // Leitura, escrita e releitura na mesma transação, com lock de linha para evitar corrida entre requisições.
  async update(id: string, dto: UpdateDriverDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Driver);
        await this.lockOrFail(repo, id);
        await repo.update(id, dto);
        return repo.findOneByOrFail({ id });
      });
    } catch (err) {
      rethrowUniqueViolation(err, 'Já existe um motorista com esta CNH');
    }
  }

  async remove(id: string) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Driver);
      await this.lockOrFail(repo, id);
      await repo.delete(id);
    });
    return { deleted: true };
  }

  private async lockOrFail(repo: Repository<Driver>, id: string) {
    const driver = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!driver) throw new NotFoundException('Motorista não encontrado');
    return driver;
  }
}

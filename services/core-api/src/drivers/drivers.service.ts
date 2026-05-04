import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly repo: Repository<Driver>,
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

  create(dto: CreateDriverDto) {
    const driver = this.repo.create(dto);
    return this.repo.save(driver);
  }

  async update(id: string, dto: UpdateDriverDto) {
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

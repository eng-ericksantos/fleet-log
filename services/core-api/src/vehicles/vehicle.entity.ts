import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('vehicles')
export class Vehicle {
  @ApiProperty({ description: 'UUID do veículo', example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'ABC-1D23', description: 'Placa do veículo (formato Mercosul ou antigo)' })
  @Column({ unique: true })
  plate: string;

  @ApiProperty({ example: 'Sprinter 415', description: 'Modelo do veículo' })
  @Column()
  model: string;

  @ApiProperty({ example: 'Mercedes-Benz', description: 'Fabricante do veículo' })
  @Column()
  brand: string;

  @ApiProperty({ example: 2024, description: 'Ano de fabricação', default: 0 })
  @Column({ default: 0 })
  year: number;

  @ApiProperty({ example: 15200.5, description: 'Quilometragem atual (km)', default: 0 })
  @Column({ type: 'float', default: 0 })
  mileage: number;

  @ApiProperty({ example: 'active', description: 'Status do veículo', enum: ['active', 'inactive'], default: 'active' })
  @Column({ default: 'active' })
  status: string;

  @ApiProperty({ description: 'Data de criação do registro' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  @UpdateDateColumn()
  updatedAt: Date;
}

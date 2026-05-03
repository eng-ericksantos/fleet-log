import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('drivers')
export class Driver {
  @ApiProperty({ description: 'UUID do motorista', example: '550e8400-e29b-41d4-a716-446655440001' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'João da Silva', description: 'Nome completo do motorista' })
  @Column()
  name: string;

  @ApiProperty({ example: '12345678900', description: 'Número da CNH (11 dígitos)' })
  @Column({ unique: true })
  cnh: string;

  @ApiProperty({ example: 'AE', description: 'Categoria da CNH', enum: ['A','B','C','D','E','AB','AC','AD','AE'] })
  @Column()
  cnhCategory: string;

  @ApiProperty({ example: '11999998888', description: 'Telefone com DDD (10 ou 11 dígitos)' })
  @Column()
  phone: string;

  @ApiProperty({ example: 'active', description: 'Status do motorista', enum: ['active', 'inactive'], default: 'active' })
  @Column({ default: 'active' })
  status: string;

  @ApiProperty({ description: 'Data de criação do registro' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  @UpdateDateColumn()
  updatedAt: Date;
}

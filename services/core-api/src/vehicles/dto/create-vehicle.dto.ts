import { IsString, IsNumber, IsOptional, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC-1D23', description: 'Placa do veículo (formato Mercosul ou antigo)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/, {
    message: 'Placa deve estar no formato ABC-1234 ou ABC-1D23 (Mercosul)',
  })
  plate: string;

  @ApiProperty({ example: 'Sprinter 415' })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 'Mercedes-Benz' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiPropertyOptional({ example: 2024 })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: 15200.5 })
  @IsNumber()
  @IsOptional()
  mileage?: number;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsOptional()
  status?: string;
}

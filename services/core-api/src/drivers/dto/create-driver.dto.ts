import { IsString, IsNotEmpty, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '12345678900', description: 'Número da CNH (11 dígitos)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'CNH deve conter exatamente 11 dígitos' })
  cnh: string;

  @ApiProperty({ example: 'AE', description: 'Categoria da CNH (A, B, C, D, E ou combinações)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(A|B|C|D|E|AB|AC|AD|AE)$/, {
    message: 'Categoria da CNH inválida. Valores aceitos: A, B, C, D, E, AB, AC, AD, AE',
  })
  cnhCategory: string;

  @ApiProperty({ example: '11999998888', description: 'Telefone com DDD (10 ou 11 dígitos)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve conter 10 ou 11 dígitos numéricos' })
  phone: string;
}

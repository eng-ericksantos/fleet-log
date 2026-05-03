import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './driver.entity';

@ApiTags('Drivers')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @ApiOperation({ summary: 'Listar todos os motoristas' })
  @ApiResponse({ status: 200, description: 'Lista de motoristas', type: [Driver] })
  @Get()
  findAll() {
    return this.driversService.findAll();
  }

  @ApiOperation({ summary: 'Total de motoristas cadastrados' })
  @ApiResponse({ status: 200, description: 'Contagem de motoristas', schema: { example: { total: 3 } } })
  @Get('count')
  count() {
    return this.driversService.count().then((total) => ({ total }));
  }

  @ApiOperation({ summary: 'Buscar motorista por ID' })
  @ApiParam({ name: 'id', description: 'UUID do motorista', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Motorista encontrado', type: Driver })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findOne(id);
  }

  @ApiOperation({ summary: 'Cadastrar novo motorista' })
  @ApiResponse({ status: 201, description: 'Motorista criado com sucesso', type: Driver })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @Post()
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @ApiOperation({ summary: 'Atualizar motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Motorista atualizado', type: Driver })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDriverDto) {
    return this.driversService.update(id, dto);
  }

  @ApiOperation({ summary: 'Remover motorista' })
  @ApiParam({ name: 'id', description: 'UUID do motorista', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Motorista removido', schema: { example: { deleted: true } } })
  @ApiResponse({ status: 404, description: 'Motorista não encontrado' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.remove(id);
  }
}

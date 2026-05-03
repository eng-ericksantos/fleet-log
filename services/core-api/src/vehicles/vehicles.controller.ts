import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './vehicle.entity';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @ApiOperation({ summary: 'Listar todos os veículos' })
  @ApiResponse({ status: 200, description: 'Lista de veículos', type: [Vehicle] })
  @Get()
  findAll() {
    return this.vehiclesService.findAll();
  }

  @ApiOperation({ summary: 'Total de veículos cadastrados' })
  @ApiResponse({ status: 200, description: 'Contagem de veículos', schema: { example: { total: 5 } } })
  @Get('count')
  count() {
    return this.vehiclesService.count().then((total) => ({ total }));
  }

  @ApiOperation({ summary: 'Buscar veículo por ID' })
  @ApiParam({ name: 'id', description: 'UUID do veículo', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Veículo encontrado', type: Vehicle })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @ApiOperation({ summary: 'Cadastrar novo veículo' })
  @ApiResponse({ status: 201, description: 'Veículo criado com sucesso', type: Vehicle })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @ApiOperation({ summary: 'Atualizar veículo' })
  @ApiParam({ name: 'id', description: 'UUID do veículo', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Veículo atualizado', type: Vehicle })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Remover veículo' })
  @ApiParam({ name: 'id', description: 'UUID do veículo', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Veículo removido', schema: { example: { deleted: true } } })
  @ApiResponse({ status: 404, description: 'Veículo não encontrado' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.remove(id);
  }
}

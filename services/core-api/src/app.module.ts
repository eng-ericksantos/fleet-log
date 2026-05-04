import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriversModule } from './drivers/drivers.module';
import { HealthModule } from './health/health.module';
import { SeedService } from './seed.service';
import { Vehicle } from './vehicles/vehicle.entity';
import { Driver } from './drivers/driver.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'postgres'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'fleet'),
        password: config.get('DB_PASS', 'fleet123'),
        database: config.get('DB_NAME', 'fleetlog'),
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNC', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([Vehicle, Driver]),
    VehiclesModule,
    DriversModule,
    HealthModule,
  ],
  providers: [SeedService],
})
export class AppModule {}

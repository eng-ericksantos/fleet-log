import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriversModule } from './drivers/drivers.module';
import { HealthModule } from './health/health.module';

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
    VehiclesModule,
    DriversModule,
    HealthModule,
  ],
})
export class AppModule {}

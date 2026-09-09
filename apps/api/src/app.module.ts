import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { InvestorModule } from './investor/investor.module';

@Module({
  imports: [
    AdminModule,
    InvestorModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

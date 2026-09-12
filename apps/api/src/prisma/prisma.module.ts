import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() so any feature module can inject PrismaService without
// importing PrismaModule itself — it's registered once here, in AppModule.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

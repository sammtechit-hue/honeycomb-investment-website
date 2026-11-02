import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { KycFilesService } from './kyc-files.service';

@Module({
  controllers: [FilesController],
  providers: [KycFilesService],
  exports: [KycFilesService],
})
export class FilesModule {}

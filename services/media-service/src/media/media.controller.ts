import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Query('tenantId') tenantId: string,
    @Query('uploadedBy') uploadedBy: string,
    @Query('category') category?: string,
  ) {
    return this.mediaService.uploadFile(tenantId, uploadedBy, file, category);
  }

  @Get(':id/url')
  async getPresignedUrl(@Param('id') id: string) {
    return this.mediaService.getPresignedUrl(id);
  }

  @Get('recordings/:interactionId')
  async getRecordings(@Param('interactionId') interactionId: string) {
    return this.mediaService.getRecordingsByInteraction(interactionId);
  }

  @Get('recordings/:id/stream')
  async getRecordingStream(@Param('id') id: string) {
    return this.mediaService.getRecordingStreamUrl(id);
  }
}

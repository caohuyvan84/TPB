import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaFile, CallRecording } from '../entities';
import * as crypto from 'crypto';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaFile)
    private mediaRepo: Repository<MediaFile>,
    @InjectRepository(CallRecording)
    private recordingRepo: Repository<CallRecording>,
  ) {}

  async uploadFile(
    tenantId: string,
    uploadedBy: string,
    file: any,
    category?: string,
  ) {
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${file.originalname}`;
    const storagePath = `/uploads/${tenantId}/${fileName}`;

    const mediaFile = this.mediaRepo.create({
      tenantId,
      uploadedBy,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath,
      storageBucket: 'media',
      category,
      metadata: {},
    });

    return this.mediaRepo.save(mediaFile);
  }

  async getPresignedUrl(fileId: string) {
    const file = await this.mediaRepo.findOne({ where: { id: fileId } });
    if (!file) throw new Error('File not found');

    // Mock presigned URL (in production, use SeaweedFS S3 API)
    const url = `http://localhost:8333/media/${file.storagePath}?expires=3600`;
    return { url, expiresIn: 3600 };
  }

  async getRecordingsByInteraction(interactionId: string) {
    const recordings = await this.recordingRepo.find({
      where: { interactionId },
      order: { recordingStart: 'ASC' },
    });

    return recordings.map((r) => ({
      id: r.id,
      interactionId: r.interactionId,
      duration: r.duration,
      recordingStart: r.recordingStart.toISOString(),
      recordingEnd: r.recordingEnd.toISOString(),
      streamUrl: `http://localhost:3010/api/v1/media/recordings/${r.id}/stream`,
    }));
  }

  async getRecordingStreamUrl(recordingId: string) {
    const recording = await this.recordingRepo.findOne({ where: { id: recordingId } });
    if (!recording) throw new Error('Recording not found');

    const file = await this.mediaRepo.findOne({ where: { id: recording.mediaFileId } });
    if (!file) throw new Error('Media file not found');

    // Mock stream URL (in production, use SeaweedFS streaming)
    return { url: `http://localhost:8333/stream/${file.storagePath}`, expiresIn: 3600 };
  }
}

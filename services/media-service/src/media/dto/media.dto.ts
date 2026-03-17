export class UploadFileDto {
  file!: any;
  category?: string;
  metadata?: Record<string, any>;
}

export class MediaFileResponseDto {
  id!: string;
  fileName!: string;
  originalName!: string;
  mimeType!: string;
  fileSize!: number;
  category?: string;
  uploadedBy!: string;
  createdAt!: string;
}

export class PresignedUrlDto {
  url!: string;
  expiresIn!: number;
}

export class CallRecordingDto {
  id!: string;
  interactionId!: string;
  duration!: number;
  recordingStart!: string;
  recordingEnd!: string;
  streamUrl?: string;
}

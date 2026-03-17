import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MediaService } from './media.service';
import { MediaFile, CallRecording } from '../entities';

describe('MediaService', () => {
  let service: MediaService;
  let mediaRepo: any;
  let recordingRepo: any;

  beforeEach(async () => {
    mediaRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'file-1', ...data })),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    recordingRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: getRepositoryToken(MediaFile), useValue: mediaRepo },
        { provide: getRepositoryToken(CallRecording), useValue: recordingRepo },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  it('should upload file', async () => {
    const file = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    } as any;

    const result = await service.uploadFile('tenant-1', 'user-1', file, 'document');
    expect(result.id).toBe('file-1');
    expect(mediaRepo.save).toHaveBeenCalled();
  });

  it('should get presigned URL', async () => {
    mediaRepo.findOne.mockResolvedValue({
      id: 'file-1',
      storagePath: '/uploads/test.pdf',
    });

    const result = await service.getPresignedUrl('file-1');
    expect(result.url).toContain('localhost:8333');
    expect(result.expiresIn).toBe(3600);
  });

  it('should get recordings by interaction', async () => {
    recordingRepo.find.mockResolvedValue([
      {
        id: 'rec-1',
        interactionId: 'int-1',
        duration: 120,
        recordingStart: new Date('2026-01-01T10:00:00Z'),
        recordingEnd: new Date('2026-01-01T10:02:00Z'),
      },
    ]);

    const result = await service.getRecordingsByInteraction('int-1');
    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe(120);
  });

  it('should get recording stream URL', async () => {
    recordingRepo.findOne.mockResolvedValue({
      id: 'rec-1',
      mediaFileId: 'file-1',
    });
    mediaRepo.findOne.mockResolvedValue({
      id: 'file-1',
      storagePath: '/recordings/call.wav',
    });

    const result = await service.getRecordingStreamUrl('rec-1');
    expect(result.url).toContain('localhost:8333');
  });
});

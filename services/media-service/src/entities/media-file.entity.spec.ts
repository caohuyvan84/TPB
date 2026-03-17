import { testDataSource } from './test-data-source';
import { MediaFile } from './media-file.entity';

describe('MediaFile Entity', () => {
  beforeAll(async () => {
    if (!testDataSource.isInitialized) await testDataSource.initialize();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) await testDataSource.destroy();
  });

  it('should create media file', async () => {
    const repo = testDataSource.getRepository(MediaFile);
    const file = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      uploadedBy: '123e4567-e89b-12d3-a456-426614174001',
      fileName: 'test.pdf',
      originalName: 'document.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      storagePath: '/uploads/test.pdf',
      storageBucket: 'media',
    });
    const saved = await repo.save(file);
    expect(saved.id).toBeDefined();
    expect(saved.fileName).toBe('test.pdf');
  });
});

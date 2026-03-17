import { testDataSource } from './test-data-source';
import { CallRecording } from './call-recording.entity';

describe('CallRecording Entity', () => {
  beforeAll(async () => {
    if (!testDataSource.isInitialized) await testDataSource.initialize();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) await testDataSource.destroy();
  });

  it('should create call recording', async () => {
    const repo = testDataSource.getRepository(CallRecording);
    const recording = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      interactionId: '123e4567-e89b-12d3-a456-426614174002',
      mediaFileId: '123e4567-e89b-12d3-a456-426614174003',
      callDirection: 'inbound',
      duration: 120,
      recordingStart: new Date(),
      recordingEnd: new Date(),
    });
    const saved = await repo.save(recording);
    expect(saved.id).toBeDefined();
    expect(saved.duration).toBe(120);
  });
});

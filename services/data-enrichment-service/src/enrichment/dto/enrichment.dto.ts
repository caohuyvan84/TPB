export class CreateEnrichmentSourceDto {
  name!: string;
  type!: string;
  endpoint!: string;
  authConfig!: object;
  fieldMappings!: object;
  timeoutMs?: number;
  cacheTtlSeconds?: number;
}

export class RequestEnrichmentDto {
  objectType!: string;
  objectId!: string;
  sourceIds?: string[];
}

export class EnrichmentResultDto {
  requestId!: string;
  status!: string;
  data?: object;
  error?: string;
}

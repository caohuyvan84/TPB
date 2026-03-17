import { IsString, IsOptional, Length } from 'class-validator';

export class SuggestDto {
  @IsString()
  @Length(1, 5000)
  context!: string;

  @IsOptional()
  @IsString()
  interactionId?: string;
}

export class SummarizeDto {
  @IsString()
  @Length(1, 10000)
  text!: string;
}

export class SentimentDto {
  @IsString()
  @Length(1, 5000)
  text!: string;
}

export class ClassifyDto {
  @IsString()
  @Length(1, 5000)
  text!: string;
}

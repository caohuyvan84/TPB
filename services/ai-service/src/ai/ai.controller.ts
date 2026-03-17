import { Controller, Post, Body } from '@nestjs/common';
import { AIService } from './ai.service';
import { SuggestDto, SummarizeDto, SentimentDto, ClassifyDto } from './dto/ai.dto';

@Controller('api/v1/ai')
export class AIController {
  constructor(private aiService: AIService) {}

  @Post('suggest')
  suggest(@Body() dto: SuggestDto) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000'; // Mock
    const userId = '123e4567-e89b-12d3-a456-426614174001'; // Mock
    return this.aiService.suggest(dto.context, tenantId, userId);
  }

  @Post('summarize')
  summarize(@Body() dto: SummarizeDto) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000'; // Mock
    const userId = '123e4567-e89b-12d3-a456-426614174001'; // Mock
    return this.aiService.summarize(dto.text, tenantId, userId);
  }

  @Post('sentiment')
  analyzeSentiment(@Body() dto: SentimentDto) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000'; // Mock
    const userId = '123e4567-e89b-12d3-a456-426614174001'; // Mock
    return this.aiService.analyzeSentiment(dto.text, tenantId, userId);
  }

  @Post('classify')
  classify(@Body() dto: ClassifyDto) {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000'; // Mock
    const userId = '123e4567-e89b-12d3-a456-426614174001'; // Mock
    return this.aiService.classify(dto.text, tenantId, userId);
  }
}

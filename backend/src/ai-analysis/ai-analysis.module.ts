import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiAnalysisService } from './ai-analysis.service';

@Module({
  imports: [HttpModule],
  providers: [AiAnalysisService],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}

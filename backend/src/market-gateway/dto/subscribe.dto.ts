import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class SubscribeDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  symbols: string[];
}

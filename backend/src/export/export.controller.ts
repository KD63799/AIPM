import { Body, Controller, Get, Header, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { LibraryDto } from './dto/library.dto';
import type { ImportResult } from './export.service';
import { ExportService } from './export.service';

@Controller()
export class ExportController {
  constructor(private readonly exporter: ExportService) {}

  @Get('export')
  exportLibrary(@CurrentUser() userId: string): Promise<LibraryDto> {
    return this.exporter.exportLibrary(userId);
  }

  @Get('export/markdown')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  exportMarkdown(@CurrentUser() userId: string): Promise<string> {
    return this.exporter.exportMarkdown(userId);
  }

  @Post('import')
  importLibrary(@CurrentUser() userId: string, @Body() library: LibraryDto): Promise<ImportResult> {
    return this.exporter.importLibrary(userId, library);
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FoldersService } from '../../folders/services/folders.service';
import { PromptsService } from '../../prompts/services/prompts.service';
import { TagsService } from '../../tags/services/tags.service';

export type ImportResult = { folders: number; tags: number; prompts: number };

function download(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

const today = (): string => new Date().toISOString().slice(0, 10);

/** The whole library, in and out. */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly http = inject(HttpClient);
  private readonly prompts = inject(PromptsService);
  private readonly folders = inject(FoldersService);
  private readonly tags = inject(TagsService);

  async exportJson(): Promise<void> {
    const library = await firstValueFrom(this.http.get<unknown>('/api/export'));
    download(JSON.stringify(library, null, 2), `prompts-${today()}.json`, 'application/json');
  }

  async exportMarkdown(): Promise<void> {
    const markdown = await firstValueFrom(
      this.http.get('/api/export/markdown', { responseType: 'text' }),
    );
    download(markdown, `prompts-${today()}.md`, 'text/markdown');
  }

  /** Throws a `SyntaxError` when the file is not JSON. */
  async import(file: File): Promise<ImportResult> {
    const library: unknown = JSON.parse(await file.text());
    const result = await firstValueFrom(this.http.post<ImportResult>('/api/import', library));
    this.prompts.reload();
    this.folders.reload();
    this.tags.reload();
    return result;
  }
}

import type { HttpResourceRef } from '@angular/common/http';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import type { Signal } from '@angular/core';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { FoldersService } from '../../folders/services/folders.service';
import { TagsService } from '../../tags/services/tags.service';
import type { Prompt, PromptInput, PromptQuery, PromptVersion } from '../models/prompt';

function toParams(query: PromptQuery): HttpParams {
  let params = new HttpParams();
  if (query.q) params = params.set('q', query.q);
  if (query.folderId) params = params.set('folderId', query.folderId);
  if (query.tagId) params = params.set('tagId', query.tagId);
  if (query.favorite) params = params.set('favorite', 'true');
  if (query.sort) params = params.set('sort', query.sort);
  return params;
}

@Injectable({ providedIn: 'root' })
export class PromptsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly folders = inject(FoldersService);
  private readonly tags = inject(TagsService);
  private readonly currentQuery = signal<PromptQuery>({});
  private readonly list = httpResource<Prompt[]>(
    () =>
      this.auth.userId()
        ? { url: '/api/prompts', params: toParams(this.currentQuery()) }
        : undefined,
    { defaultValue: [] },
  );

  readonly query = this.currentQuery.asReadonly();
  readonly prompts = computed(() => (this.list.hasValue() ? this.list.value() : []));
  readonly loading = this.list.isLoading;
  readonly failed = computed(() => this.list.error() !== undefined);

  setQuery(query: PromptQuery): void {
    this.currentQuery.set(query);
  }

  reload(): void {
    this.list.reload();
  }

  /** Must be called from an injection context: the resource lives as long as its caller. */
  detail(id: Signal<string | undefined>): HttpResourceRef<Prompt | undefined> {
    return httpResource<Prompt>(() => {
      const promptId = id();
      return promptId ? `/api/prompts/${promptId}` : undefined;
    });
  }

  /** Must be called from an injection context: the resource lives as long as its caller. */
  versions(id: Signal<string>): HttpResourceRef<PromptVersion[]> {
    return httpResource<PromptVersion[]>(() => `/api/prompts/${id()}/versions`, {
      defaultValue: [],
    });
  }

  create(input: PromptInput): Promise<Prompt> {
    return this.mutate(this.http.post<Prompt>('/api/prompts', input));
  }

  update(id: string, changes: Partial<PromptInput>): Promise<Prompt> {
    return this.mutate(this.http.patch<Prompt>(`/api/prompts/${id}`, changes));
  }

  duplicate(id: string): Promise<Prompt> {
    return this.mutate(this.http.post<Prompt>(`/api/prompts/${id}/duplicate`, null));
  }

  restore(id: string, versionNumber: number): Promise<Prompt> {
    return this.mutate(
      this.http.post<Prompt>(`/api/prompts/${id}/versions/${versionNumber}/restore`, null),
    );
  }

  async remove(id: string): Promise<void> {
    await this.mutate(this.http.delete<void>(`/api/prompts/${id}`));
  }

  async use(id: string): Promise<Prompt> {
    const prompt = await firstValueFrom(this.http.post<Prompt>(`/api/prompts/${id}/use`, null));
    this.list.reload();
    return prompt;
  }

  /** Counts per folder and tag move with every change, so they reload too. */
  private async mutate<T>(request: Observable<T>): Promise<T> {
    const result = await firstValueFrom(request);
    this.list.reload();
    this.folders.reload();
    this.tags.reload();
    return result;
  }
}

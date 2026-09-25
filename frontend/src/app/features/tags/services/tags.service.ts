import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import type { Tag } from '../models/tag';

@Injectable({ providedIn: 'root' })
export class TagsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly list = httpResource<Tag[]>(
    () => (this.auth.userId() ? '/api/tags' : undefined),
    { defaultValue: [] },
  );

  readonly tags = computed(() => (this.list.hasValue() ? this.list.value() : []));
  readonly loading = this.list.isLoading;
  readonly failed = computed(() => this.list.error() !== undefined);

  reload(): void {
    this.list.reload();
  }

  async create(name: string, color: string): Promise<Tag> {
    const tag = await firstValueFrom(this.http.post<Tag>('/api/tags', { name, color }));
    this.list.reload();
    return tag;
  }

  async update(id: string, changes: { name?: string; color?: string }): Promise<void> {
    await firstValueFrom(this.http.patch<Tag>(`/api/tags/${id}`, changes));
    this.list.reload();
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`/api/tags/${id}`));
    this.list.reload();
  }
}

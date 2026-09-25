import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import type { Folder } from '../models/folder';
import { buildFolderTree } from '../models/folder';

@Injectable({ providedIn: 'root' })
export class FoldersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly list = httpResource<Folder[]>(
    () => (this.auth.userId() ? '/api/folders' : undefined),
    { defaultValue: [] },
  );

  readonly folders = computed(() => (this.list.hasValue() ? this.list.value() : []));
  readonly tree = computed(() => buildFolderTree(this.folders()));
  readonly loading = this.list.isLoading;
  readonly failed = computed(() => this.list.error() !== undefined);

  reload(): void {
    this.list.reload();
  }

  async create(name: string, parentId: string | null): Promise<Folder> {
    const folder = await firstValueFrom(this.http.post<Folder>('/api/folders', { name, parentId }));
    this.list.reload();
    return folder;
  }

  async update(id: string, changes: { name?: string; parentId?: string | null }): Promise<void> {
    await firstValueFrom(this.http.patch<Folder>(`/api/folders/${id}`, changes));
    this.list.reload();
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`/api/folders/${id}`));
    this.list.reload();
  }
}

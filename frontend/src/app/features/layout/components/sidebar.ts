import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import {
  LucideLibrary,
  LucideLogOut,
  LucidePlus,
  LucideSettings,
  LucideStar,
} from '@lucide/angular';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { BrandMark } from '../../../shared/brand-mark';
import { FolderTree } from '../../folders/components/folder-tree';
import { TagList } from '../../tags/components/tag-list';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    BrandMark,
    FolderTree,
    TagList,
    LucideLibrary,
    LucideLogOut,
    LucidePlus,
    LucideSettings,
    LucideStar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex-col' },
  template: `
    <div class="flex h-14 shrink-0 items-center px-4">
      <a routerLink="/prompts" aria-label="Prompt Manager, accueil"><app-brand-mark /></a>
    </div>

    <div class="px-3">
      <a
        routerLink="/prompts/new"
        queryParamsHandling="preserve"
        class="btn h-9 w-full justify-between"
      >
        <span class="flex items-center gap-2">
          <svg lucidePlus class="size-4"></svg>
          Nouveau prompt
        </span>
        <kbd class="kbd max-lg:hidden">N</kbd>
      </a>
    </div>

    <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Bibliothèque">
      <ul class="space-y-0.5">
        <li>
          <a
            class="nav-item"
            routerLink="/prompts"
            [attr.aria-current]="scope() === 'all' ? 'page' : null"
          >
            <svg lucideLibrary class="size-4"></svg>
            Tous les prompts
          </a>
        </li>
        <li>
          <a
            class="nav-item"
            routerLink="/prompts"
            [queryParams]="{ favorites: 1 }"
            [attr.aria-current]="scope() === 'favorites' ? 'page' : null"
          >
            <svg lucideStar class="size-4"></svg>
            Favoris
          </a>
        </li>
      </ul>
      <app-folder-tree [activeId]="query().get('folder')" />
      <app-tag-list [activeId]="query().get('tag')" />
    </nav>

    <div class="flex h-14 shrink-0 items-center gap-1 border-t border-line pr-2 pl-4">
      <p class="min-w-0 flex-1 truncate text-[13px] text-muted" [title]="auth.user()?.email">
        {{ auth.user()?.email }}
      </p>
      <a
        routerLink="/settings"
        class="btn btn-ghost btn-icon"
        aria-label="Paramètres"
        title="Paramètres"
        [attr.aria-current]="scope() === 'settings' ? 'page' : null"
      >
        <svg lucideSettings class="size-4"></svg>
      </a>
      <button
        type="button"
        class="btn btn-ghost btn-icon"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        (click)="auth.logout()"
      >
        <svg lucideLogOut class="size-4"></svg>
      </button>
    </div>
  `,
})
export class Sidebar {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly query = computed(() => this.router.parseUrl(this.url()).queryParamMap);
  protected readonly scope = computed(() => {
    if (this.url().startsWith('/settings')) return 'settings';
    const query = this.query();
    if (query.has('folder') || query.has('tag')) return 'filtered';
    return query.has('favorites') ? 'favorites' : 'all';
  });
}

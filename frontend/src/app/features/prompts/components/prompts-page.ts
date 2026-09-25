import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LucideMenu, LucideSearch, LucideX } from '@lucide/angular';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';
import { FoldersService } from '../../folders/services/folders.service';
import { LayoutService } from '../../layout/services/layout.service';
import { TagsService } from '../../tags/services/tags.service';
import type { PromptSort } from '../models/prompt';
import { PROMPT_SORTS } from '../models/prompt';
import { PromptsService } from '../services/prompts.service';
import { PromptList } from './prompt-list';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** List pane + detail outlet. Filters live in the URL so every view can be linked. */
@Component({
  selector: 'app-prompts-page',
  imports: [ReactiveFormsModule, RouterOutlet, PromptList, LucideMenu, LucideSearch, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full', '(document:keydown)': 'onKeydown($event)' },
  template: `
    <section
      class="h-full w-full flex-col border-r border-line lg:flex lg:w-[22rem] xl:w-96"
      [class.hidden]="detailOpen()"
      [class.flex]="!detailOpen()"
      aria-labelledby="list-title"
    >
      <header class="shrink-0 space-y-3 border-b border-line px-4 pt-3 pb-3">
        <div class="flex h-8 items-center gap-2">
          <button
            type="button"
            class="btn btn-ghost btn-icon -ml-2 lg:hidden"
            aria-label="Ouvrir la navigation"
            (click)="layout.openNav()"
          >
            <svg lucideMenu class="size-4"></svg>
          </button>
          <h1 id="list-title" class="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {{ scopeTitle() }}
          </h1>
          <span class="text-xs text-muted tabular-nums">
            {{ prompts.loading() ? '' : prompts.prompts().length }}
          </span>
        </div>

        <div class="relative">
          <svg
            lucideSearch
            class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted"
          ></svg>
          <input
            #search
            type="search"
            class="field pr-14 pl-8"
            placeholder="Rechercher"
            aria-label="Rechercher dans les prompts"
            [formControl]="searchControl"
            (keydown.escape)="searchControl.setValue(''); search.blur()"
          />
          @if (searchControl.value) {
            <button
              type="button"
              class="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
              aria-label="Effacer la recherche"
              (click)="searchControl.setValue('')"
            >
              <svg lucideX class="size-3.5"></svg>
            </button>
          } @else {
            <kbd class="kbd absolute top-1/2 right-2 -translate-y-1/2 max-lg:hidden">/</kbd>
          }
        </div>

        <label class="flex items-center gap-2 text-xs text-muted">
          Trier
          <select
            class="h-7 rounded-md border border-line bg-canvas px-2 text-xs text-ink"
            [value]="sort() ?? 'recent'"
            (change)="setSort($event)"
          >
            @for (option of sorts; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      </header>

      <app-prompt-list class="min-h-0 flex-1" [filtered]="isFiltered()" />
    </section>

    <section class="h-full min-w-0 flex-1 lg:block" [class.hidden]="!detailOpen()">
      <router-outlet />
    </section>
  `,
})
export class PromptsPage {
  protected readonly prompts = inject(PromptsService);
  protected readonly layout = inject(LayoutService);
  private readonly folders = inject(FoldersService);
  private readonly tags = inject(TagsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('search');

  /** Query parameters, bound by the router. */
  readonly q = input<string>();
  readonly folder = input<string>();
  readonly tag = input<string>();
  readonly favorites = input<string>();
  readonly sort = input<PromptSort>();

  protected readonly sorts = PROMPT_SORTS;
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly isFiltered = computed(
    () => !!(this.q() || this.folder() || this.tag() || this.favorites()),
  );
  protected readonly scopeTitle = computed(() => {
    const folder = this.folders.folders().find((f) => f.id === this.folder());
    const tag = this.tags.tags().find((t) => t.id === this.tag());
    if (folder) return folder.name;
    if (tag) return `Tag ${tag.name}`;
    return this.favorites() ? 'Favoris' : 'Tous les prompts';
  });
  /** On narrow screens the list and the detail take turns. */
  protected readonly detailOpen = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.hasDetail()),
    ),
    { initialValue: this.hasDetail() },
  );

  constructor() {
    effect(() =>
      this.prompts.setQuery({
        q: this.q(),
        folderId: this.folder(),
        tagId: this.tag(),
        favorite: !!this.favorites(),
        sort: this.sort(),
      }),
    );
    effect(() => this.searchControl.setValue(this.q() ?? '', { emitEvent: false }));
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => this.navigate({ q: q.trim() || null }));
  }

  protected setSort(event: Event): void {
    const sort = (event.target as HTMLSelectElement).value;
    this.navigate({ sort: sort === 'recent' ? null : sort });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    if (event.key === '/') {
      event.preventDefault();
      this.searchInput().nativeElement.focus();
    } else if (event.key === 'n') {
      event.preventDefault();
      void this.router.navigate(['/prompts/new'], { queryParamsHandling: 'preserve' });
    }
  }

  private hasDetail(): boolean {
    const child = this.route.firstChild;
    return !!child && child.snapshot.url.length > 0;
  }

  private navigate(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route.firstChild ?? this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

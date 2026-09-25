import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideRotateCcw } from '@lucide/angular';
import { errorMessage } from '../../../core/http/error-message';
import { ToastService } from '../../../core/toast/toast.service';
import { formatDateTime } from '../../../shared/format';
import { PromptsService } from '../services/prompts.service';
import { TemplatePreview } from './template-preview';

@Component({
  selector: 'app-version-history',
  imports: [RouterLink, TemplatePreview, LucideArrowLeft, LucideRotateCcw],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <header class="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-8">
      <a
        [routerLink]="['/prompts', id()]"
        queryParamsHandling="preserve"
        class="btn btn-ghost btn-icon -ml-2"
        aria-label="Retour au prompt"
      >
        <svg lucideArrowLeft class="size-4"></svg>
      </a>
      <h1 class="min-w-0 flex-1 truncate text-[15px] font-semibold">Historique des versions</h1>
    </header>

    @if (versions.error()) {
      <div class="p-8 text-sm" role="alert">
        <p class="text-danger">L’historique n’a pas pu être chargé.</p>
        <button type="button" class="btn mt-3" (click)="versions.reload()">Réessayer</button>
      </div>
    } @else if (versions.isLoading() && !list().length) {
      <div class="space-y-2 p-8" aria-busy="true" aria-label="Chargement de l’historique">
        <div class="h-10 w-64 animate-pulse rounded bg-raised"></div>
        <div class="h-10 w-64 animate-pulse rounded bg-raised/70"></div>
      </div>
    } @else {
      <div class="grid min-h-0 flex-1 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav
          class="overflow-y-auto border-b border-line p-3 lg:border-r lg:border-b-0"
          aria-label="Versions"
        >
          <ul class="flex gap-1 overflow-x-auto lg:flex-col">
            @for (version of list(); track version.versionNumber; let first = $first) {
              <li class="shrink-0">
                <button
                  type="button"
                  class="w-full rounded-md px-3 py-2 text-left hover:bg-raised aria-[current=true]:bg-raised"
                  [attr.aria-current]="version === selected()"
                  (click)="selectedNumber.set(version.versionNumber)"
                >
                  <span class="flex items-center gap-2 text-sm font-medium">
                    Version {{ version.versionNumber }}
                    @if (first) {
                      <span class="rounded-full bg-accent-soft px-1.5 text-[11px] text-accent-text"
                        >actuelle</span
                      >
                    }
                  </span>
                  <span class="block text-xs text-muted">{{
                    formatDateTime(version.createdAt)
                  }}</span>
                </button>
              </li>
            }
          </ul>
        </nav>

        @if (selected(); as version) {
          <article class="min-h-0 overflow-y-auto px-4 py-6 sm:px-8">
            <div class="mx-auto max-w-3xl">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold">{{ version.title }}</h2>
                  <p class="text-xs text-muted">
                    Version {{ version.versionNumber }}, {{ formatDateTime(version.createdAt) }}
                  </p>
                </div>
                @if (version.versionNumber !== latest()) {
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="restoring()"
                    (click)="restore(version.versionNumber)"
                  >
                    <svg lucideRotateCcw class="size-4"></svg>
                    Restaurer cette version
                  </button>
                }
              </div>
              <app-template-preview
                class="mt-5 rounded-lg border border-line bg-surface p-4"
                [content]="version.content"
              />
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class VersionHistory {
  private readonly prompts = inject(PromptsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Route parameter. */
  readonly id = input.required<string>();

  protected readonly versions = this.prompts.versions(this.id);
  protected readonly list = computed(() => (this.versions.hasValue() ? this.versions.value() : []));
  protected readonly latest = computed(() => this.list()[0]?.versionNumber);
  protected readonly selectedNumber = signal<number | null>(null);
  protected readonly selected = computed(
    () => this.list().find((v) => v.versionNumber === this.selectedNumber()) ?? this.list()[0],
  );
  protected readonly restoring = signal(false);
  protected readonly formatDateTime = formatDateTime;

  protected async restore(versionNumber: number): Promise<void> {
    this.restoring.set(true);
    try {
      const prompt = await this.prompts.restore(this.id(), versionNumber);
      this.toast.success(
        `Version ${versionNumber} restaurée : elle devient la version ${prompt.version}.`,
      );
      await this.router.navigate(['/prompts', prompt.id], { queryParamsHandling: 'preserve' });
    } catch (error) {
      this.toast.error(errorMessage(error, 'La version n’a pas pu être restaurée.'));
    } finally {
      this.restoring.set(false);
    }
  }
}

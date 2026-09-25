import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCheck,
  LucideClock,
  LucideCopy,
  LucideCopyPlus,
  LucideFolder,
  LucidePencil,
  LucideStar,
  LucideTrash,
} from '@lucide/angular';
import { startWith } from 'rxjs';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { errorMessage } from '../../../core/http/error-message';
import { ToastService } from '../../../core/toast/toast.service';
import { formatDate, plural } from '../../../shared/format';
import { folderPath } from '../../folders/models/folder';
import { FoldersService } from '../../folders/services/folders.service';
import type { Prompt } from '../models/prompt';
import { renderTemplate } from '../models/prompt-template';
import { PromptsService } from '../services/prompts.service';
import { TemplatePreview } from './template-preview';

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);

@Component({
  selector: 'app-prompt-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TemplatePreview,
    LucideArrowLeft,
    LucideCheck,
    LucideClock,
    LucideCopy,
    LucideCopyPlus,
    LucideFolder,
    LucidePencil,
    LucideStar,
    LucideTrash,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col', '(document:keydown)': 'onKeydown($event)' },
  template: `
    @if (resource.error(); as error) {
      <div class="flex h-full flex-col items-center justify-center p-8 text-center" role="alert">
        <p class="font-medium">
          {{
            notFound(error)
              ? 'Ce prompt n’existe pas ou a été supprimé.'
              : 'Le prompt n’a pas pu être chargé.'
          }}
        </p>
        <div class="mt-4 flex gap-2">
          <a routerLink="/prompts" queryParamsHandling="preserve" class="btn">Retour à la liste</a>
          @if (!notFound(error)) {
            <button type="button" class="btn" (click)="resource.reload()">Réessayer</button>
          }
        </div>
      </div>
    } @else if (prompt(); as prompt) {
      <header class="shrink-0 border-b border-line px-4 py-4 sm:px-8">
        <div class="flex flex-wrap items-start gap-x-3 gap-y-2">
          <a
            routerLink="/prompts"
            queryParamsHandling="preserve"
            class="btn btn-ghost btn-icon -ml-2 lg:hidden"
            aria-label="Retour à la liste"
          >
            <svg lucideArrowLeft class="size-4"></svg>
          </a>
          <div class="order-last min-w-0 basis-full sm:order-none sm:basis-0 sm:grow">
            <h1 class="text-xl font-semibold tracking-tight text-balance">{{ prompt.title }}</h1>
            @if (prompt.description) {
              <p class="mt-1 text-sm text-muted">{{ prompt.description }}</p>
            }
          </div>
          <div class="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              [attr.aria-pressed]="prompt.isFavorite"
              [attr.aria-label]="prompt.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
              [title]="prompt.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
              (click)="toggleFavorite(prompt)"
            >
              <svg
                lucideStar
                [class]="prompt.isFavorite ? 'size-4 fill-accent text-accent' : 'size-4'"
              ></svg>
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-icon"
              aria-label="Dupliquer"
              title="Dupliquer"
              (click)="duplicate(prompt)"
            >
              <svg lucideCopyPlus class="size-4"></svg>
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-icon hover:text-danger"
              aria-label="Supprimer"
              title="Supprimer"
              (click)="remove(prompt)"
            >
              <svg lucideTrash class="size-4"></svg>
            </button>
            <a
              routerLink="history"
              queryParamsHandling="preserve"
              class="btn btn-ghost hidden sm:inline-flex"
              title="Historique des versions"
            >
              <svg lucideClock class="size-4"></svg>
              v{{ prompt.version }}
            </a>
            <a routerLink="edit" queryParamsHandling="preserve" class="btn">
              <svg lucidePencil class="size-4"></svg>
              Modifier
            </a>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          @if (path().length) {
            <a
              routerLink="/prompts"
              [queryParams]="{ folder: prompt.folderId }"
              class="flex items-center gap-1.5 hover:text-ink"
            >
              <svg lucideFolder class="size-3.5"></svg>
              {{ pathLabel() }}
            </a>
          }
          @for (tag of prompt.tags; track tag.id) {
            <a
              routerLink="/prompts"
              [queryParams]="{ tag: tag.id }"
              class="flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 hover:text-ink"
            >
              <span class="size-1.5 rounded-full" [style.background]="tag.color"></span>
              {{ tag.name }}
            </a>
          }
          <span>{{ usageLabel() }}</span>
          <span>Modifié le {{ updatedAt() }}</span>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div
          [class]="
            prompt.variables.length
              ? 'mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]'
              : 'mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-8'
          "
        >
          @if (prompt.variables.length) {
            <form [formGroup]="variables" aria-labelledby="variables-title" class="space-y-4">
              <h2 id="variables-title" class="section-title">Variables</h2>
              @for (variable of prompt.variables; track variable.name) {
                <div>
                  <label class="label font-mono text-accent-text" [for]="'var-' + variable.name">
                    {{ variable.name }}
                  </label>
                  <textarea
                    class="field h-auto max-h-48 min-h-9 resize-y py-1.5 [field-sizing:content]"
                    rows="1"
                    [id]="'var-' + variable.name"
                    [formControlName]="variable.name"
                    [attr.aria-describedby]="
                      variable.description ? 'var-hint-' + variable.name : null
                    "
                  ></textarea>
                  @if (variable.description) {
                    <p class="hint" [id]="'var-hint-' + variable.name">
                      {{ variable.description }}
                    </p>
                  }
                </div>
              }
            </form>
          }

          <section
            class="min-w-0 rounded-lg border border-line bg-surface"
            aria-labelledby="preview-title"
          >
            <div
              class="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-xs"
            >
              <h2 id="preview-title" class="font-semibold text-muted">Aperçu</h2>
              @if (missing().length) {
                <button
                  type="button"
                  class="text-accent-text hover:underline"
                  (click)="focusVariable(missing()[0])"
                >
                  {{ plural(missing().length, 'variable vide', 'variables vides') }}
                </button>
              } @else if (prompt.variables.length) {
                <span class="flex items-center gap-1 text-success">
                  <svg lucideCheck class="size-3.5"></svg>
                  Toutes les variables sont remplies
                </span>
              }
            </div>
            <app-template-preview
              class="p-4"
              [content]="prompt.content"
              [values]="filledValues()"
              [interactive]="true"
              (slotClick)="focusVariable($event)"
            />
            <div class="flex items-center justify-end gap-3 border-t border-line px-4 py-3">
              <span class="hidden text-xs text-muted sm:inline">
                <kbd class="kbd">{{ modifierKey }}</kbd> <kbd class="kbd">Entrée</kbd>
              </span>
              <button type="button" class="btn btn-primary h-9" (click)="copy(prompt)">
                @if (justCopied()) {
                  <svg lucideCheck class="size-4"></svg>
                  Copié
                } @else {
                  <svg lucideCopy class="size-4"></svg>
                  Copier le prompt
                }
              </button>
            </div>
          </section>
        </div>
      </div>
    } @else {
      <div class="space-y-3 px-4 py-5 sm:px-8" aria-busy="true" aria-label="Chargement du prompt">
        <div class="h-6 w-1/2 animate-pulse rounded bg-raised"></div>
        <div class="h-4 w-1/3 animate-pulse rounded bg-raised/70"></div>
        <div class="mt-8 h-48 animate-pulse rounded-lg bg-raised/50"></div>
      </div>
    }
  `,
})
export class PromptDetail {
  private readonly prompts = inject(PromptsService);
  private readonly folders = inject(FoldersService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Route parameter. */
  readonly id = input.required<string>();

  protected readonly resource = this.prompts.detail(this.id);
  protected readonly prompt = computed(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );
  protected readonly variables = new FormRecord<FormControl<string>>({});
  private readonly variableValues = toSignal(this.variables.valueChanges.pipe(startWith({})), {
    initialValue: {},
  });
  protected readonly filledValues = computed(() => {
    this.variableValues();
    return Object.fromEntries(
      Object.entries(this.variables.getRawValue()).filter(([, value]) => value !== ''),
    );
  });
  protected readonly missing = computed(() =>
    (this.prompt()?.variables ?? [])
      .map((v) => v.name)
      .filter((name) => !this.filledValues()[name]),
  );
  protected readonly path = computed(() =>
    folderPath(this.folders.folders(), this.prompt()?.folderId ?? null),
  );
  protected readonly pathLabel = computed(() =>
    this.path()
      .map((f) => f.name)
      .join(' / '),
  );
  protected readonly usageLabel = computed(() => {
    const count = this.prompt()?.usageCount ?? 0;
    return count ? `Copié ${plural(count, 'fois', 'fois')}` : 'Jamais copié';
  });
  protected readonly updatedAt = computed(() => {
    const prompt = this.prompt();
    return prompt ? formatDate(prompt.updatedAt) : '';
  });
  protected readonly justCopied = signal(false);
  protected readonly modifierKey = IS_MAC ? '⌘' : 'Ctrl';
  protected readonly plural = plural;

  constructor() {
    // Fresh fields for each prompt (or when its variables change), prefilled with defaults.
    const variablesKey = computed(() => {
      const prompt = this.prompt();
      return prompt ? JSON.stringify([prompt.id, prompt.variables]) : '';
    });
    effect(() => {
      variablesKey();
      untracked(() => this.resetVariables(this.prompt()));
    });
  }

  protected notFound(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  protected focusVariable(name: string): void {
    document.getElementById(`var-${name}`)?.focus();
  }

  protected async copy(prompt: Prompt): Promise<void> {
    const text = renderTemplate(prompt.content, this.filledValues());
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      this.toast.error('Le presse-papiers est inaccessible. Autorisez-le dans votre navigateur.');
      return;
    }
    const empty = this.missing().length;
    this.toast.success(
      empty
        ? `Prompt copié, avec ${plural(empty, 'variable vide', 'variables vides')}.`
        : 'Prompt copié.',
    );
    this.justCopied.set(true);
    setTimeout(() => this.justCopied.set(false), 2000);
    try {
      this.resource.set(await this.prompts.use(prompt.id));
    } catch {
      // The copy happened; only the usage counter is behind.
    }
  }

  protected async toggleFavorite(prompt: Prompt): Promise<void> {
    try {
      this.resource.set(await this.prompts.update(prompt.id, { isFavorite: !prompt.isFavorite }));
      this.toast.success(prompt.isFavorite ? 'Retiré des favoris.' : 'Ajouté aux favoris.');
    } catch (error) {
      this.toast.error(errorMessage(error, 'Les favoris n’ont pas pu être mis à jour.'));
    }
  }

  protected async duplicate(prompt: Prompt): Promise<void> {
    try {
      const copy = await this.prompts.duplicate(prompt.id);
      this.toast.success('Prompt dupliqué.');
      await this.router.navigate(['/prompts', copy.id], { queryParamsHandling: 'preserve' });
    } catch (error) {
      this.toast.error(errorMessage(error, 'Le prompt n’a pas pu être dupliqué.'));
    }
  }

  protected async remove(prompt: Prompt): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `Supprimer « ${prompt.title} » ?`,
      message: 'Le prompt et tout son historique de versions seront supprimés définitivement.',
      confirmLabel: 'Supprimer le prompt',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await this.prompts.remove(prompt.id);
      this.toast.success('Prompt supprimé.');
      await this.router.navigate(['/prompts'], { queryParamsHandling: 'preserve' });
    } catch (error) {
      this.toast.error(errorMessage(error, 'Le prompt n’a pas pu être supprimé.'));
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const prompt = this.prompt();
    if (prompt && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void this.copy(prompt);
    }
  }

  private resetVariables(prompt: Prompt | undefined): void {
    for (const name of Object.keys(this.variables.controls)) {
      this.variables.removeControl(name, { emitEvent: false });
    }
    for (const variable of prompt?.variables ?? []) {
      this.variables.addControl(
        variable.name,
        new FormControl(variable.defaultValue ?? '', { nonNullable: true }),
        { emitEvent: false },
      );
    }
    this.variables.updateValueAndValidity();
  }
}

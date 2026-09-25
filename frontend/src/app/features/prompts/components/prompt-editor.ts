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
import {
  FormControl,
  FormGroup,
  FormRecord,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideLoaderCircle } from '@lucide/angular';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { errorMessage } from '../../../core/http/error-message';
import { ToastService } from '../../../core/toast/toast.service';
import { flattenTree } from '../../folders/models/folder';
import { FoldersService } from '../../folders/services/folders.service';
import { TagPicker } from '../../tags/components/tag-picker';
import type { Prompt, PromptInput, Variable } from '../models/prompt';
import { parseVariableNames } from '../models/prompt-template';
import { PromptsService } from '../services/prompts.service';
import { TemplateEditor } from './template-editor';

type VariableForm = FormGroup<{
  defaultValue: FormControl<string>;
  description: FormControl<string>;
}>;

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);

@Component({
  selector: 'app-prompt-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TemplateEditor,
    TagPicker,
    LucideArrowLeft,
    LucideLoaderCircle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col', '(document:keydown)': 'onKeydown($event)' },
  template: `
    <form class="flex h-full flex-col" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <header class="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-8">
        <a
          [routerLink]="backLink()"
          queryParamsHandling="preserve"
          class="btn btn-ghost btn-icon -ml-2"
          aria-label="Annuler et revenir"
        >
          <svg lucideArrowLeft class="size-4"></svg>
        </a>
        <h1 class="min-w-0 flex-1 truncate text-[15px] font-semibold">
          {{ id() ? 'Modifier le prompt' : 'Nouveau prompt' }}
        </h1>
        <span class="hidden text-xs text-muted sm:inline">
          <kbd class="kbd">{{ modifierKey }}</kbd> <kbd class="kbd">S</kbd>
        </span>
        <a [routerLink]="backLink()" queryParamsHandling="preserve" class="btn">Annuler</a>
        <button type="submit" class="btn btn-primary" [disabled]="saving() || loading()">
          @if (saving()) {
            <svg lucideLoaderCircle class="size-4 animate-spin"></svg>
          }
          Enregistrer
        </button>
      </header>

      @if (existing.error()) {
        <p class="p-8 text-sm text-danger" role="alert">Ce prompt n’a pas pu être chargé.</p>
      } @else {
        <div class="min-h-0 flex-1 overflow-y-auto" [attr.aria-busy]="loading()">
          <div
            class="mx-auto grid max-w-5xl gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem]"
          >
            <div class="min-w-0 space-y-5">
              <div>
                <label class="label" for="title">Titre</label>
                <input
                  id="title"
                  class="field h-10 text-base font-medium"
                  formControlName="title"
                  maxlength="200"
                  autocomplete="off"
                  [attr.aria-invalid]="showError('title')"
                />
                @if (showError('title')) {
                  <p class="field-error">Donnez un titre au prompt.</p>
                }
              </div>

              <div>
                <label class="label" for="description">
                  Description <span class="font-normal text-muted">(facultative)</span>
                </label>
                <input
                  id="description"
                  class="field"
                  formControlName="description"
                  maxlength="500"
                  autocomplete="off"
                  placeholder="À quoi sert ce prompt, en une phrase"
                />
              </div>

              <div>
                <label class="label" for="content">Contenu</label>
                <app-template-editor
                  formControlName="content"
                  inputId="content"
                  describedBy="content-hint"
                  [placeholder]="contentPlaceholder"
                  [attr.aria-invalid]="showError('content')"
                />
                <p id="content-hint" class="hint" [class.text-danger]="showError('content')">
                  @if (showError('content')) {
                    Le contenu ne peut pas être vide.
                  } @else {
                    Écrivez <code class="font-mono text-accent-text">{{ '{{nom}}' }}</code> pour
                    créer une variable, à remplir au moment de copier.
                  }
                </p>
              </div>
            </div>

            <aside class="space-y-6">
              <div>
                <label class="label" for="folder">Dossier</label>
                <select id="folder" class="field" formControlName="folderId">
                  <option [ngValue]="null">Aucun dossier</option>
                  @for (folder of folderOptions(); track folder.id) {
                    <option [ngValue]="folder.id">
                      {{ indent(folder.depth) }}{{ folder.name }}
                    </option>
                  }
                </select>
              </div>

              <div>
                <span class="label" id="tags-label">Tags</span>
                <app-tag-picker formControlName="tagIds" aria-labelledby="tags-label" />
              </div>

              <section aria-labelledby="editor-variables-title">
                <h2 id="editor-variables-title" class="label">Variables</h2>
                @if (!variableNames().length) {
                  <p class="text-xs text-muted">
                    Aucune variable pour l’instant. Elles apparaissent ici dès que le contenu en
                    contient.
                  </p>
                }
                <div class="space-y-3" formGroupName="variables">
                  @for (name of variableNames(); track name) {
                    <fieldset class="rounded-md border border-line p-3" [formGroupName]="name">
                      <legend class="px-1 font-mono text-xs text-accent-text">{{ name }}</legend>
                      <label class="sr-only" [for]="'default-' + name"
                        >Valeur par défaut de {{ name }}</label
                      >
                      <input
                        class="field h-8"
                        formControlName="defaultValue"
                        placeholder="Valeur par défaut"
                        [id]="'default-' + name"
                      />
                      <label class="sr-only" [for]="'description-' + name"
                        >Aide pour {{ name }}</label
                      >
                      <input
                        class="field mt-2 h-8"
                        formControlName="description"
                        placeholder="Aide affichée sous le champ"
                        maxlength="500"
                        [id]="'description-' + name"
                      />
                    </fieldset>
                  }
                </div>
              </section>

              @if (willCreateVersion()) {
                <p class="rounded-md border border-line bg-surface px-3 py-2 text-xs text-muted">
                  Enregistrer créera la version {{ nextVersion() }}. Les précédentes restent dans
                  l’historique.
                </p>
              }
            </aside>
          </div>
        </div>
      }
    </form>
  `,
})
export class PromptEditor {
  private readonly prompts = inject(PromptsService);
  private readonly folders = inject(FoldersService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Route parameter, absent when creating. */
  readonly id = input<string>();
  /** Query parameters: a new prompt starts in the folder or tag being browsed. */
  readonly folder = input<string>();
  readonly tag = input<string>();

  protected readonly existing = this.prompts.detail(this.id);
  protected readonly loading = computed(() => !!this.id() && this.existing.isLoading());
  private readonly variables = new FormRecord<VariableForm>({});
  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    content: ['', Validators.required],
    folderId: new FormControl<string | null>(null),
    tagIds: [[] as string[]],
    variables: this.variables,
  });
  private readonly content = toSignal(this.form.controls.content.valueChanges, {
    initialValue: '',
  });
  private readonly title = toSignal(this.form.controls.title.valueChanges, { initialValue: '' });
  protected readonly variableNames = computed(() => parseVariableNames(this.content()));
  protected readonly folderOptions = computed(() => flattenTree(this.folders.tree()));
  private readonly loaded = computed(() =>
    this.existing.hasValue() ? this.existing.value() : undefined,
  );
  protected readonly willCreateVersion = computed(() => {
    const prompt = this.loaded();
    return !!prompt && (prompt.content !== this.content() || prompt.title !== this.title().trim());
  });
  protected readonly nextVersion = computed(() => (this.loaded()?.version ?? 0) + 1);
  protected readonly backLink = computed(() =>
    this.id() ? ['/prompts', this.id()] : ['/prompts'],
  );
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly modifierKey = IS_MAC ? '⌘' : 'Ctrl';
  protected readonly contentPlaceholder = 'Tu es un expert en {{domaine}}. Explique…';
  /** Defaults and descriptions known for each name, so retyping a variable restores them. */
  private readonly knownVariables = new Map<string, Variable>();
  private saved = false;

  constructor() {
    effect(() => {
      const tag = this.tag();
      const folderId = this.folder() ?? null;
      if (!this.id()) untracked(() => this.form.reset({ folderId, tagIds: tag ? [tag] : [] }));
    });
    effect(() => {
      const prompt = this.loaded();
      if (prompt) untracked(() => this.load(prompt));
    });
    effect(() => {
      const names = this.variableNames();
      untracked(() => this.syncVariables(names));
    });
  }

  canLeave(): boolean | Promise<boolean> {
    if (this.saved || !this.form.dirty) return true;
    return this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      message: 'Vos modifications de ce prompt seront perdues.',
      confirmLabel: 'Quitter sans enregistrer',
      danger: true,
    });
  }

  protected showError(control: 'title' | 'content'): boolean {
    const { invalid, touched } = this.form.controls[control];
    return invalid && (touched || this.submitted());
  }

  protected indent(depth: number): string {
    return '   '.repeat(depth);
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    const raw = this.form.getRawValue();
    if (this.form.invalid || !raw.title.trim() || this.saving()) return;
    const input: PromptInput = {
      title: raw.title.trim(),
      content: raw.content,
      description: raw.description.trim() || null,
      folderId: raw.folderId,
      tagIds: raw.tagIds,
      isFavorite: this.loaded()?.isFavorite ?? false,
      variables: this.variableNames().map((name) => {
        const { defaultValue, description } = this.variables.controls[name].getRawValue();
        return {
          name,
          defaultValue: defaultValue || null,
          description: description.trim() || null,
        };
      }),
    };
    this.saving.set(true);
    try {
      const id = this.id();
      const prompt = id ? await this.prompts.update(id, input) : await this.prompts.create(input);
      this.saved = true;
      this.toast.success(id ? 'Modifications enregistrées.' : 'Prompt créé.');
      await this.router.navigate(['/prompts', prompt.id], { queryParamsHandling: 'preserve' });
    } catch (error) {
      this.toast.error(errorMessage(error, 'Le prompt n’a pas pu être enregistré.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void this.save();
    }
  }

  private load(prompt: Prompt): void {
    for (const variable of prompt.variables) this.knownVariables.set(variable.name, variable);
    this.form.reset({
      title: prompt.title,
      description: prompt.description ?? '',
      content: prompt.content,
      folderId: prompt.folderId,
      tagIds: prompt.tags.map((t) => t.id),
    });
    this.syncVariables(parseVariableNames(prompt.content), true);
  }

  private syncVariables(names: string[], reset = false): void {
    for (const name of Object.keys(this.variables.controls)) {
      if (reset || !names.includes(name)) this.variables.removeControl(name, { emitEvent: false });
    }
    for (const name of names) {
      if (this.variables.contains(name)) continue;
      const known = this.knownVariables.get(name);
      this.variables.addControl(
        name,
        new FormGroup({
          defaultValue: new FormControl(known?.defaultValue ?? '', { nonNullable: true }),
          description: new FormControl(known?.description ?? '', { nonNullable: true }),
        }),
        { emitEvent: false },
      );
    }
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideCheck } from '@lucide/angular';
import { errorMessage } from '../../../core/http/error-message';
import { ToastService } from '../../../core/toast/toast.service';
import { PromptsService } from '../../prompts/services/prompts.service';
import type { Tag } from '../models/tag';
import { TAG_COLORS } from '../models/tag';
import { TagsService } from '../services/tags.service';

@Component({
  selector: 'app-tag-dialog',
  imports: [ReactiveFormsModule, LucideCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl shadow-black/40"
      aria-labelledby="tag-dialog-title"
    >
      <form [formGroup]="form" (ngSubmit)="save()" novalidate>
        <h2 id="tag-dialog-title" class="text-base font-semibold">
          {{ editing() ? 'Modifier le tag' : 'Nouveau tag' }}
        </h2>

        <label class="label mt-4" for="tag-name">Nom</label>
        <input
          id="tag-name"
          class="field"
          formControlName="name"
          maxlength="40"
          autocomplete="off"
        />
        @if (submitted() && form.controls.name.invalid) {
          <p class="field-error">Donnez un nom au tag.</p>
        }

        <fieldset class="mt-4">
          <legend class="label">Couleur</legend>
          <div class="flex flex-wrap gap-2">
            @for (color of colors; track color) {
              <label class="relative cursor-pointer">
                <input
                  type="radio"
                  class="peer sr-only"
                  formControlName="color"
                  [value]="color"
                  [attr.aria-label]="'Couleur ' + ($index + 1)"
                />
                <span
                  class="flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                  [style.background]="color"
                >
                  @if (form.controls.color.value === color) {
                    <svg lucideCheck class="size-4 text-black/70"></svg>
                  }
                </span>
              </label>
            }
          </div>
        </fieldset>

        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="btn" (click)="dialog.close()">Annuler</button>
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ editing() ? 'Enregistrer' : 'Créer le tag' }}
          </button>
        </div>
      </form>
    </dialog>
  `,
})
export class TagDialog {
  private readonly tags = inject(TagsService);
  private readonly prompts = inject(PromptsService);
  private readonly toast = inject(ToastService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly colors = TAG_COLORS;
  protected readonly editing = signal<Tag | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(40)]],
    color: [TAG_COLORS[0] as string],
  });

  open(tag?: Tag): void {
    this.editing.set(tag ?? null);
    this.submitted.set(false);
    this.form.reset({
      name: tag?.name ?? '',
      color: tag?.color ?? TAG_COLORS[this.tags.tags().length % TAG_COLORS.length],
    });
    this.dialog().nativeElement.showModal();
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    const name = this.form.controls.name.value.trim();
    if (!name) return;
    const tag = this.editing();
    this.saving.set(true);
    try {
      const { color } = this.form.getRawValue();
      if (tag) {
        await this.tags.update(tag.id, { name, color });
        this.prompts.reload();
      } else {
        await this.tags.create(name, color);
      }
      this.toast.success(tag ? 'Tag modifié.' : 'Tag créé.');
      this.dialog().nativeElement.close();
    } catch (error) {
      this.toast.error(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'Un tag porte déjà ce nom.'
          : errorMessage(error, 'Le tag n’a pas pu être enregistré.'),
      );
    } finally {
      this.saving.set(false);
    }
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, forwardRef, inject, signal } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { LucideCheck, LucidePlus } from '@lucide/angular';
import { errorMessage } from '../../../core/http/error-message';
import { ToastService } from '../../../core/toast/toast.service';
import { TAG_COLORS } from '../models/tag';
import { TagsService } from '../services/tags.service';

/** Toggles the tags of a prompt; a tag can be created on the spot. Value: tag ids. */
@Component({
  selector: 'app-tag-picker',
  imports: [ReactiveFormsModule, LucideCheck, LucidePlus],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TagPicker), multi: true },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap gap-1.5" role="group" aria-label="Tags du prompt">
      @for (tag of tags.tags(); track tag.id) {
        <button
          type="button"
          class="flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors duration-150"
          [class]="
            selected().includes(tag.id)
              ? 'border-transparent bg-raised text-ink'
              : 'border-line text-muted hover:text-ink'
          "
          [attr.aria-pressed]="selected().includes(tag.id)"
          [disabled]="disabled()"
          (click)="toggle(tag.id)"
        >
          <span class="size-2 rounded-full" [style.background]="tag.color"></span>
          {{ tag.name }}
          @if (selected().includes(tag.id)) {
            <svg lucideCheck class="size-3"></svg>
          }
        </button>
      }
      <div class="relative">
        <svg
          lucidePlus
          class="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted"
        ></svg>
        <input
          class="h-7 w-32 rounded-full border border-dashed border-line bg-transparent pr-2.5 pl-6 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="Nouveau tag"
          aria-label="Créer un tag et l’ajouter"
          maxlength="40"
          [formControl]="newTag"
          (keydown.enter)="$event.preventDefault(); create()"
        />
      </div>
    </div>
  `,
})
export class TagPicker implements ControlValueAccessor {
  protected readonly tags = inject(TagsService);
  private readonly toast = inject(ToastService);

  protected readonly selected = signal<string[]>([]);
  protected readonly disabled = signal(false);
  protected readonly newTag = new FormControl('', { nonNullable: true });
  private onChange: (ids: string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(ids: string[] | null): void {
    this.selected.set(ids ?? []);
  }

  registerOnChange(fn: (ids: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected toggle(id: string): void {
    const ids = this.selected();
    this.set(ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);
  }

  protected async create(): Promise<void> {
    const name = this.newTag.value.trim();
    if (!name) return;
    const existing = this.tags.tags().find((t) => t.name.toLowerCase() === name.toLowerCase());
    try {
      const tag =
        existing ??
        (await this.tags.create(name, TAG_COLORS[this.tags.tags().length % TAG_COLORS.length]));
      if (!this.selected().includes(tag.id)) this.set([...this.selected(), tag.id]);
      this.newTag.reset();
    } catch (error) {
      this.toast.error(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'Un tag porte déjà ce nom.'
          : errorMessage(error, 'Le tag n’a pas pu être créé.'),
      );
    }
  }

  private set(ids: string[]): void {
    this.selected.set(ids);
    this.onChange(ids);
    this.onTouched();
  }
}

import { ChangeDetectionStrategy, Component, inject, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEllipsis, LucidePencil, LucidePlus, LucideTrash } from '@lucide/angular';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { errorMessage } from '../../../core/http/error-message';
import { ToastService } from '../../../core/toast/toast.service';
import { PromptsService } from '../../prompts/services/prompts.service';
import type { Tag } from '../models/tag';
import { TagsService } from '../services/tags.service';
import { TagDialog } from './tag-dialog';

@Component({
  selector: 'app-tag-list',
  imports: [RouterLink, TagDialog, LucideEllipsis, LucidePencil, LucidePlus, LucideTrash],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="tags-title">
      <div class="mb-1 flex h-7 items-center justify-between pr-1 pl-2.5">
        <h2 id="tags-title" class="section-title">Tags</h2>
        <button
          type="button"
          class="btn btn-ghost size-6 px-0"
          aria-label="Nouveau tag"
          title="Nouveau tag"
          (click)="dialog().open()"
        >
          <svg lucidePlus class="size-3.5"></svg>
        </button>
      </div>

      @if (tags.failed()) {
        <p class="px-2.5 text-xs text-danger">
          Tags indisponibles.
          <button type="button" class="underline" (click)="tags.reload()">Réessayer</button>
        </p>
      } @else if (!tags.tags().length && !tags.loading()) {
        <p class="px-2.5 text-xs text-muted">Aucun tag pour l’instant.</p>
      }

      <ul>
        @for (tag of tags.tags(); track tag.id) {
          <li
            class="group flex h-8 items-center gap-1 rounded-md pr-1 hover:bg-raised"
            [class.bg-raised]="tag.id === activeId()"
          >
            <a
              class="flex h-full min-w-0 flex-1 items-center gap-2.5 pl-2.5 text-[13px]"
              [class.text-muted]="tag.id !== activeId()"
              routerLink="/prompts"
              [queryParams]="{ tag: tag.id }"
              [attr.aria-current]="tag.id === activeId() ? 'page' : null"
            >
              <span class="size-2 shrink-0 rounded-full" [style.background]="tag.color"></span>
              <span class="truncate">{{ tag.name }}</span>
            </a>
            <span class="text-xs text-muted tabular-nums">{{ tag.promptCount || '' }}</span>
            <button
              type="button"
              class="reveal btn btn-ghost size-6 px-0"
              [attr.popovertarget]="'tag-menu-' + tag.id"
              [style.anchor-name]="'--tag-' + tag.id"
              [attr.aria-label]="'Actions pour le tag ' + tag.name"
            >
              <svg lucideEllipsis class="size-3.5"></svg>
            </button>
            <div
              #menu
              popover
              class="menu"
              [id]="'tag-menu-' + tag.id"
              [style.position-anchor]="'--tag-' + tag.id"
            >
              <button
                type="button"
                class="menu-item"
                (click)="menu.hidePopover(); dialog().open(tag)"
              >
                <svg lucidePencil class="size-4 text-muted"></svg>
                Modifier
              </button>
              <button
                type="button"
                class="menu-item text-danger"
                (click)="menu.hidePopover(); remove(tag)"
              >
                <svg lucideTrash class="size-4"></svg>
                Supprimer
              </button>
            </div>
          </li>
        }
      </ul>
    </section>

    <app-tag-dialog />
  `,
})
export class TagList {
  protected readonly tags = inject(TagsService);
  private readonly prompts = inject(PromptsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly activeId = input<string | null>(null);

  protected readonly dialog = viewChild.required(TagDialog);

  protected async remove(tag: Tag): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `Supprimer le tag « ${tag.name} » ?`,
      message: 'Il est retiré des prompts qui le portent. Les prompts eux-mêmes sont conservés.',
      confirmLabel: 'Supprimer le tag',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await this.tags.remove(tag.id);
      this.prompts.reload();
      this.toast.success('Tag supprimé.');
    } catch (error) {
      this.toast.error(errorMessage(error, 'Le tag n’a pas pu être supprimé.'));
    }
  }
}

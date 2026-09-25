import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideChevronRight,
  LucideEllipsis,
  LucideFolder,
  LucideFolderOpen,
  LucideFolderPlus,
  LucidePencil,
  LucidePlus,
  LucideTrash,
} from '@lucide/angular';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { errorMessage } from '../../../core/http/error-message';
import { ToastService } from '../../../core/toast/toast.service';
import { Autofocus } from '../../../shared/autofocus';
import { PromptsService } from '../../prompts/services/prompts.service';
import type { FolderNode } from '../models/folder';
import { FoldersService } from '../services/folders.service';

/** `undefined`: not creating. `null`: creating at the root. Otherwise the parent id. */
type CreateTarget = string | null | undefined;

@Component({
  selector: 'app-folder-tree',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    Autofocus,
    LucideChevronRight,
    LucideEllipsis,
    LucideFolder,
    LucideFolderOpen,
    LucideFolderPlus,
    LucidePencil,
    LucidePlus,
    LucideTrash,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="folders-title">
      <div class="mb-1 flex h-7 items-center justify-between pr-1 pl-2.5">
        <h2 id="folders-title" class="section-title">Dossiers</h2>
        <button
          type="button"
          class="btn btn-ghost size-6 px-0"
          aria-label="Nouveau dossier"
          title="Nouveau dossier"
          (click)="startCreate(null)"
        >
          <svg lucidePlus class="size-3.5"></svg>
        </button>
      </div>

      @if (folders.failed()) {
        <p class="px-2.5 text-xs text-danger">
          Dossiers indisponibles.
          <button type="button" class="underline" (click)="folders.reload()">Réessayer</button>
        </p>
      } @else if (!folders.tree().length && creatingIn() === undefined && !folders.loading()) {
        <p class="px-2.5 text-xs text-muted">Aucun dossier pour l’instant.</p>
      }

      <ul>
        @if (creatingIn() === null) {
          <ng-container
            [ngTemplateOutlet]="newFolderRow"
            [ngTemplateOutletContext]="{ $implicit: 0 }"
          />
        }
        <ng-container
          [ngTemplateOutlet]="branch"
          [ngTemplateOutletContext]="{ $implicit: folders.tree() }"
        />
      </ul>
    </section>

    <ng-template #branch let-nodes>
      @for (node of asNodes(nodes); track node.id) {
        <li>
          <div
            class="group flex h-8 items-center gap-1 rounded-md pr-1 hover:bg-raised"
            [class.bg-raised]="node.id === activeId()"
            [style.padding-left.px]="4 + node.depth * 14"
          >
            @if (node.children.length) {
              <button
                type="button"
                class="flex size-5 shrink-0 items-center justify-center rounded text-muted hover:text-ink"
                [attr.aria-expanded]="!collapsed().has(node.id)"
                [attr.aria-label]="(collapsed().has(node.id) ? 'Déplier ' : 'Replier ') + node.name"
                (click)="toggle(node.id)"
              >
                <span
                  class="inline-flex transition-transform duration-150"
                  [class.rotate-90]="!collapsed().has(node.id)"
                >
                  <svg lucideChevronRight class="size-3.5"></svg>
                </span>
              </button>
            } @else {
              <span class="w-5 shrink-0"></span>
            }

            @if (renamingId() === node.id) {
              <input
                appAutofocus
                class="field h-7 px-2 text-[13px]"
                aria-label="Nom du dossier"
                maxlength="100"
                [formControl]="nameControl"
                (keydown.enter)="saveRename(node)"
                (keydown.escape)="stopEditing()"
                (blur)="saveRename(node)"
              />
            } @else {
              <a
                class="flex h-full min-w-0 flex-1 items-center gap-2 text-[13px]"
                [class.text-muted]="node.id !== activeId()"
                routerLink="/prompts"
                [queryParams]="{ folder: node.id }"
                [attr.aria-current]="node.id === activeId() ? 'page' : null"
              >
                @if (node.id === activeId()) {
                  <svg lucideFolderOpen class="size-4 shrink-0 text-accent-text"></svg>
                } @else {
                  <svg lucideFolder class="size-4 shrink-0"></svg>
                }
                <span class="truncate">{{ node.name }}</span>
              </a>
              <span class="text-xs text-muted tabular-nums">{{ node.promptCount || '' }}</span>
              <button
                type="button"
                class="reveal btn btn-ghost size-6 px-0"
                [attr.popovertarget]="'folder-menu-' + node.id"
                [style.anchor-name]="'--folder-' + node.id"
                [attr.aria-label]="'Actions pour le dossier ' + node.name"
              >
                <svg lucideEllipsis class="size-3.5"></svg>
              </button>
              <div
                #menu
                popover
                class="menu"
                [id]="'folder-menu-' + node.id"
                [style.position-anchor]="'--folder-' + node.id"
              >
                <button
                  type="button"
                  class="menu-item"
                  (click)="menu.hidePopover(); startCreate(node.id)"
                >
                  <svg lucideFolderPlus class="size-4 text-muted"></svg>
                  Nouveau sous-dossier
                </button>
                <button
                  type="button"
                  class="menu-item"
                  (click)="menu.hidePopover(); startRename(node)"
                >
                  <svg lucidePencil class="size-4 text-muted"></svg>
                  Renommer
                </button>
                <button
                  type="button"
                  class="menu-item text-danger"
                  (click)="menu.hidePopover(); remove(node)"
                >
                  <svg lucideTrash class="size-4"></svg>
                  Supprimer
                </button>
              </div>
            }
          </div>

          @if (creatingIn() === node.id || (node.children.length && !collapsed().has(node.id))) {
            <ul>
              @if (creatingIn() === node.id) {
                <ng-container
                  [ngTemplateOutlet]="newFolderRow"
                  [ngTemplateOutletContext]="{ $implicit: node.depth + 1 }"
                />
              }
              <ng-container
                [ngTemplateOutlet]="branch"
                [ngTemplateOutletContext]="{ $implicit: node.children }"
              />
            </ul>
          }
        </li>
      }
    </ng-template>

    <ng-template #newFolderRow let-depth>
      <li class="flex h-8 items-center gap-1 pr-1" [style.padding-left.px]="24 + depth * 14">
        <input
          appAutofocus
          class="field h-7 px-2 text-[13px]"
          placeholder="Nom du dossier"
          aria-label="Nom du nouveau dossier"
          maxlength="100"
          [formControl]="nameControl"
          (keydown.enter)="saveCreate()"
          (keydown.escape)="stopEditing()"
          (blur)="saveCreate()"
        />
      </li>
    </ng-template>
  `,
})
export class FolderTree {
  protected readonly folders = inject(FoldersService);
  private readonly prompts = inject(PromptsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly activeId = input<string | null>(null);

  protected readonly collapsed = signal(new Set<string>());
  protected readonly creatingIn = signal<CreateTarget>(undefined);
  protected readonly renamingId = signal<string | null>(null);
  protected readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  private saving = false;

  /** Template contexts are untyped; the tree only ever passes folder nodes. */
  protected asNodes(nodes: unknown): FolderNode[] {
    return nodes as FolderNode[];
  }

  protected toggle(id: string): void {
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected startCreate(parentId: string | null): void {
    this.renamingId.set(null);
    this.nameControl.reset();
    if (parentId) this.collapsed.update((set) => new Set([...set].filter((id) => id !== parentId)));
    this.creatingIn.set(parentId);
  }

  protected startRename(node: FolderNode): void {
    this.creatingIn.set(undefined);
    this.nameControl.setValue(node.name);
    this.renamingId.set(node.id);
  }

  protected stopEditing(): void {
    this.creatingIn.set(undefined);
    this.renamingId.set(null);
  }

  protected async saveCreate(): Promise<void> {
    const parentId = this.creatingIn();
    const name = this.nameControl.value.trim();
    if (parentId === undefined || this.saving) return;
    if (!name) return this.stopEditing();
    await this.save(() => this.folders.create(name, parentId), 'Dossier créé.');
  }

  protected async saveRename(node: FolderNode): Promise<void> {
    const name = this.nameControl.value.trim();
    if (this.renamingId() !== node.id || this.saving) return;
    if (!name || name === node.name) return this.stopEditing();
    await this.save(() => this.folders.update(node.id, { name }), 'Dossier renommé.');
  }

  protected async remove(node: FolderNode): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `Supprimer « ${node.name} » ?`,
      message:
        'Ses sous-dossiers et ses prompts ne sont pas supprimés : ils remontent dans le dossier parent.',
      confirmLabel: 'Supprimer le dossier',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await this.folders.remove(node.id);
      this.prompts.reload();
      this.toast.success('Dossier supprimé.');
    } catch (error) {
      this.toast.error(errorMessage(error, 'Le dossier n’a pas pu être supprimé.'));
    }
  }

  private async save(action: () => Promise<unknown>, success: string): Promise<void> {
    this.saving = true;
    try {
      await action();
      this.toast.success(success);
      this.stopEditing();
    } catch (error) {
      this.toast.error(errorMessage(error, 'Le dossier n’a pas pu être enregistré.'));
    } finally {
      this.saving = false;
    }
  }
}

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideBraces, LucideCopy, LucidePlus, LucideStar } from '@lucide/angular';
import type { Prompt } from '../models/prompt';
import { PromptsService } from '../services/prompts.service';

@Component({
  selector: 'app-prompt-list',
  imports: [RouterLink, RouterLinkActive, LucideBraces, LucideCopy, LucidePlus, LucideStar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative flex flex-col' },
  template: `
    @if (prompts.loading() && prompts.prompts().length) {
      <div
        class="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-accent/70"
        role="presentation"
      ></div>
    }

    @if (prompts.failed()) {
      <div class="p-6 text-sm" role="alert">
        <p class="text-danger">Les prompts n’ont pas pu être chargés.</p>
        <button type="button" class="btn mt-3" (click)="prompts.reload()">Réessayer</button>
      </div>
    } @else if (prompts.loading() && !prompts.prompts().length) {
      <ul class="divide-y divide-line" aria-busy="true" aria-label="Chargement des prompts">
        @for (row of skeletonRows; track row) {
          <li class="space-y-2 px-4 py-3.5">
            <div class="h-3.5 w-2/3 animate-pulse rounded bg-raised"></div>
            <div class="h-3 w-full animate-pulse rounded bg-raised/70"></div>
            <div class="h-3 w-1/3 animate-pulse rounded bg-raised/50"></div>
          </li>
        }
      </ul>
    } @else if (!prompts.prompts().length) {
      <div class="px-6 py-12 text-center">
        @if (filtered()) {
          <p class="font-medium">Aucun prompt ne correspond.</p>
          <p class="mt-1 text-sm text-muted">Essayez d’autres mots, ou retirez un filtre.</p>
          <a routerLink="/prompts" class="btn mt-4">Voir tous les prompts</a>
        } @else {
          <p class="font-medium">Votre bibliothèque est vide.</p>
          <p class="mt-1 text-sm text-muted">
            Enregistrez un prompt que vous réutilisez souvent, avec ses variables.
          </p>
          <a routerLink="/prompts/new" class="btn btn-primary mt-4">
            <svg lucidePlus class="size-4"></svg>
            Créer un prompt
          </a>
        }
      </div>
    } @else {
      <ul class="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        @for (prompt of prompts.prompts(); track prompt.id) {
          <li>
            <a
              class="block px-4 py-3 transition-colors duration-150 hover:bg-surface aria-[current=page]:bg-raised"
              [routerLink]="['/prompts', prompt.id]"
              queryParamsHandling="preserve"
              routerLinkActive
              #active="routerLinkActive"
              [attr.aria-current]="active.isActive ? 'page' : null"
            >
              <div class="flex items-center gap-2">
                <h2 class="min-w-0 flex-1 truncate text-sm font-medium">{{ prompt.title }}</h2>
                @if (prompt.isFavorite) {
                  <svg
                    lucideStar
                    class="size-3.5 shrink-0 fill-accent text-accent"
                    title="Favori"
                  ></svg>
                }
              </div>
              <p class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">
                {{ prompt.description || excerpt(prompt) }}
              </p>
              <div class="mt-2 flex items-center gap-3 text-xs text-muted">
                @for (tag of prompt.tags.slice(0, 3); track tag.id) {
                  <span class="flex min-w-0 items-center gap-1.5">
                    <span
                      class="size-1.5 shrink-0 rounded-full"
                      [style.background]="tag.color"
                    ></span>
                    <span class="truncate">{{ tag.name }}</span>
                  </span>
                }
                @if (prompt.tags.length > 3) {
                  <span>+{{ prompt.tags.length - 3 }}</span>
                }
                <span class="ml-auto flex shrink-0 items-center gap-3 tabular-nums">
                  @if (prompt.variables.length) {
                    <span
                      class="flex items-center gap-1"
                      [title]="prompt.variables.length + ' variables'"
                    >
                      <svg lucideBraces class="size-3.5"></svg>
                      {{ prompt.variables.length }}
                    </span>
                  }
                  @if (prompt.usageCount) {
                    <span
                      class="flex items-center gap-1"
                      [title]="'Copié ' + prompt.usageCount + ' fois'"
                    >
                      <svg lucideCopy class="size-3.5"></svg>
                      {{ prompt.usageCount }}
                    </span>
                  }
                </span>
              </div>
            </a>
          </li>
        }
      </ul>
    }
  `,
})
export class PromptList {
  protected readonly prompts = inject(PromptsService);

  readonly filtered = input(false);

  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  protected excerpt(prompt: Prompt): string {
    return prompt.content.replace(/\s+/g, ' ').slice(0, 180);
  }
}

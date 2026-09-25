import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideBraces } from '@lucide/angular';

@Component({
  selector: 'app-prompt-placeholder',
  imports: [LucideBraces],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full items-center justify-center p-8' },
  template: `
    <div class="max-w-xs text-center">
      <svg lucideBraces class="mx-auto size-8 text-accent-text"></svg>
      <p class="mt-4 text-[15px] font-medium">Choisissez un prompt dans la liste</p>
      <p class="mt-1 text-sm text-muted">Remplissez ses variables, puis copiez-le en un geste.</p>
      <dl
        class="mt-8 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-left text-xs text-muted"
      >
        <dt><kbd class="kbd">N</kbd></dt>
        <dd>Nouveau prompt</dd>
        <dt><kbd class="kbd">/</kbd></dt>
        <dd>Rechercher</dd>
        <dt><kbd class="kbd">Ctrl</kbd> <kbd class="kbd">Entrée</kbd></dt>
        <dd>Copier le prompt ouvert</dd>
      </dl>
    </div>
  `,
})
export class PromptPlaceholder {}

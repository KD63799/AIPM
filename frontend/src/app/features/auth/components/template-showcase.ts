import type { OnDestroy } from '@angular/core';
import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { LucideBraces } from '@lucide/angular';

type Part = { text: string; slot?: string; order?: number };

const PARTS: Part[] = [
  { text: 'Tu es relecteur senior en ' },
  { slot: '{{langage}}', text: 'TypeScript', order: 0 },
  { text: '. Relis ce code et signale uniquement les problèmes ' },
  { slot: '{{niveau}}', text: 'bloquants', order: 1 },
  { text: ', sous forme de ' },
  { slot: '{{format}}', text: 'liste courte', order: 2 },
  { text: '.' },
];

/** The login page's one moment: a prompt whose blanks get filled in, one by one. */
@Component({
  selector: 'app-template-showcase',
  imports: [LucideBraces],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // prettier-ignore
  template: `
    <figure class="max-w-lg">
      <div class="rounded-xl border border-line bg-canvas p-6 shadow-2xl shadow-black/25">
        <p class="mb-4 flex items-center gap-2 text-xs text-muted">
          <svg lucideBraces class="size-3.5"></svg>
          Revue de code
        </p>
        <p class="font-mono text-[15px] leading-8 text-ink">
          <!-- One line on purpose: template whitespace would show between the parts. -->
          @for (part of parts; track $index) {@if (part.order === undefined) {<span>{{ part.text }}</span>} @else if (part.order < filledCount()) {<mark class="var-filled animate-[highlight_420ms_var(--ease-out-soft)]">{{ part.text }}</mark>} @else {<span class="var-slot">{{ part.slot }}</span>}}
        </p>
      </div>
      <figcaption class="mt-6 max-w-md text-lg leading-snug text-ink">
        Écrivez un prompt une fois. Remplissez ses variables au moment de l’utiliser.
      </figcaption>
    </figure>
  `,
  styles: `
    @keyframes highlight {
      from {
        background-size: 0% 100%;
      }
    }
    mark {
      background-image: linear-gradient(var(--accent-soft), var(--accent-soft));
      background-repeat: no-repeat;
      background-size: 100% 100%;
      background-color: transparent;
    }
  `,
})
export class TemplateShowcase implements OnDestroy {
  protected readonly parts = PARTS;
  protected readonly filledCount = signal(0);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.filledCount.set(Infinity);
        return;
      }
      this.timer = setInterval(() => {
        this.filledCount.update((count) => count + 1);
        if (this.filledCount() >= 3) clearInterval(this.timer);
      }, 900);
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}

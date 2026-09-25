import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2.5' },
  template: `
    <svg viewBox="0 0 32 32" class="size-7" aria-hidden="true">
      <rect width="32" height="32" rx="7" class="fill-raised" />
      <path
        d="M12 8c-2.2 0-3 1-3 3v2.2c0 1.2-.7 2-2 2.3v1c1.3.3 2 1.1 2 2.3V21c0 2 .8 3 3 3M20 8c2.2 0 3 1 3 3v2.2c0 1.2.7 2 2 2.3v1c-1.3.3-2 1.1-2 2.3V21c0 2-.8 3-3 3"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2.2"
        stroke-linecap="round"
      />
      <rect x="13.5" y="14.5" width="5" height="3" rx="1" fill="var(--accent)" />
    </svg>
    <span class="text-[15px] font-semibold tracking-tight">Prompt Manager</span>
  `,
})
export class BrandMark {}

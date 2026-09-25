import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { segmentTemplate } from '../models/prompt-template';

/**
 * A prompt as it will be copied: filled variables highlighted, empty ones as dashed slots.
 * Kept free of template whitespace between segments: it would show up in the text.
 */
@Component({
  selector: 'app-template-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block font-mono text-[13px] leading-6 break-words whitespace-pre-wrap text-ink' },
  // prettier-ignore
  template: `@for (part of parts(); track $index) {@if (!part.variable) {<span>{{ part.text }}</span>} @else if (part.value) {<mark class="var-filled">{{ part.value }}</mark>} @else if (interactive()) {<button type="button" class="var-slot hover:border-accent" [attr.aria-label]="'Remplir la variable ' + part.variable" (click)="slotClick.emit(part.variable)">{{ part.text }}</button>} @else {<span class="var-slot">{{ part.text }}</span>}}`,
})
export class TemplatePreview {
  readonly content = input.required<string>();
  /** Non-empty values only; anything else shows as a slot. */
  readonly values = input<Readonly<Record<string, string>>>({});
  readonly interactive = input(false);
  readonly slotClick = output<string>();

  /** Flattened for the template: `variable` is the name, `text` what to show when empty. */
  protected readonly parts = computed(() =>
    segmentTemplate(this.content()).map((segment) =>
      segment.kind === 'text'
        ? { text: segment.text, variable: null, value: '' }
        : {
            text: segment.source,
            variable: segment.name,
            value: this.values()[segment.name] ?? '',
          },
    ),
  );
}

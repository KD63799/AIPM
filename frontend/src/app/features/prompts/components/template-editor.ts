import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { segmentTemplate } from '../models/prompt-template';

/**
 * A plain textarea over a highlighted copy of its own text: the text is transparent,
 * the copy underneath paints the {{variables}}. Both share font, padding and wrapping,
 * and the copy drives the height, so the editor grows with its content.
 */
@Component({
  selector: 'app-template-editor',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TemplateEditor), multi: true },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'grid rounded-md border border-line bg-canvas transition-colors duration-150 focus-within:border-accent hover:border-muted/60',
  },
  // prettier-ignore
  template: `<div aria-hidden="true" class="editor-text pointer-events-none text-ink">@for (part of parts(); track $index) {@if (part.variable) {<span class="rounded-[3px] bg-accent-soft text-accent-text">{{ part.text }}</span>} @else {<span>{{ part.text }}</span>}}<span>&#8203;</span></div><textarea class="editor-text min-h-72 resize-none overflow-hidden bg-transparent text-transparent caret-ink outline-none placeholder:text-muted/70" spellcheck="false" [id]="inputId()" [placeholder]="placeholder()" [value]="value()" [disabled]="disabled()" [attr.aria-describedby]="describedBy()" (input)="onInput($event)" (blur)="onTouched()"></textarea>`,
  styles: `
    .editor-text {
      grid-area: 1 / 1;
      padding: 0.625rem 0.75rem;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.5rem;
      white-space: pre-wrap;
      overflow-wrap: break-word;
      tab-size: 2;
    }
  `,
})
export class TemplateEditor implements ControlValueAccessor {
  readonly inputId = input<string>();
  readonly placeholder = input('');
  readonly describedBy = input<string>();

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly parts = computed(() =>
    segmentTemplate(this.value()).map((segment) =>
      segment.kind === 'text'
        ? { text: segment.text, variable: false }
        : { text: segment.source, variable: true },
    ),
  );
  private onChange: (value: string) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected onInput(event: Event): void {
    const { value } = event.target as HTMLTextAreaElement;
    this.value.set(value);
    this.onChange(value);
  }
}

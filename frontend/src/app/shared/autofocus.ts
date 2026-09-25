import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/** Focuses (and selects) its host once rendered, unlike `autofocus` on inserted elements. */
@Directive({ selector: '[appAutofocus]' })
export class Autofocus {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      host.focus();
      if (host instanceof HTMLInputElement) host.select();
    });
  }
}

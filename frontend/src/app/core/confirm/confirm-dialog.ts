import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, effect, inject, viewChild } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 text-ink shadow-2xl shadow-black/40"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      (close)="confirm.settle(false)"
    >
      @if (confirm.request(); as request) {
        <h2 id="confirm-title" class="text-base font-semibold">{{ request.title }}</h2>
        <p id="confirm-message" class="mt-2 text-sm text-muted">{{ request.message }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="btn" autofocus (click)="confirm.settle(false)">
            Annuler
          </button>
          <button
            type="button"
            class="btn"
            [class.btn-danger]="request.danger"
            [class.btn-primary]="!request.danger"
            (click)="confirm.settle(true)"
          >
            {{ request.confirmLabel }}
          </button>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.confirm.request() && !dialog.open) dialog.showModal();
      if (!this.confirm.request() && dialog.open) dialog.close();
    });
  }
}

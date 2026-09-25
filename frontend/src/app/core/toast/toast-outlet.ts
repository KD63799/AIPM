import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck, LucideX } from '@lucide/angular';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-outlet',
  imports: [LucideCircleCheck, LucideCircleAlert, LucideX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol
      class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <li
          class="pointer-events-auto flex animate-[toast-in_180ms_var(--ease-out-soft)] items-start gap-2.5 rounded-lg border border-line bg-raised px-3 py-2.5 text-sm shadow-lg shadow-black/30"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
        >
          @if (toast.kind === 'success') {
            <svg lucideCircleCheck class="mt-0.5 size-4 shrink-0 text-success"></svg>
          } @else {
            <svg lucideCircleAlert class="mt-0.5 size-4 shrink-0 text-danger"></svg>
          }
          <p class="flex-1">{{ toast.message }}</p>
          <button
            type="button"
            class="-m-1 rounded p-1 text-muted hover:text-ink"
            aria-label="Fermer la notification"
            (click)="toasts.dismiss(toast.id)"
          >
            <svg lucideX class="size-3.5"></svg>
          </button>
        </li>
      }
    </ol>
  `,
  styles: `
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}

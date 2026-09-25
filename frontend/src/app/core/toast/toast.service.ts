import { Injectable, signal } from '@angular/core';

export type Toast = { id: number; kind: 'success' | 'error'; message: string };

const VISIBLE_MS = { success: 3500, error: 6000 } as const;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<Toast[]>([]);
  private nextId = 0;

  readonly toasts = this.items.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  dismiss(id: number): void {
    this.items.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  private push(kind: Toast['kind'], message: string): void {
    const id = ++this.nextId;
    this.items.update((toasts) => [...toasts.slice(-3), { id, kind, message }]);
    setTimeout(() => this.dismiss(id), VISIBLE_MS[kind]);
  }
}

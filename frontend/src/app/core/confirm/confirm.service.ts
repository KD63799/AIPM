import { Injectable, signal } from '@angular/core';

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
};

type Pending = ConfirmRequest & { resolve: (confirmed: boolean) => void };

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly pending = signal<Pending | null>(null);

  readonly request = this.pending.asReadonly();

  ask(request: ConfirmRequest): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise((resolve) => this.pending.set({ ...request, resolve }));
  }

  settle(confirmed: boolean): void {
    this.pending()?.resolve(confirmed);
    this.pending.set(null);
  }
}

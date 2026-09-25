import { Injectable, signal } from '@angular/core';

/** Whether the navigation drawer is open, on screens too narrow to show it docked. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly open = signal(false);

  readonly navOpen = this.open.asReadonly();

  openNav(): void {
    this.open.set(true);
  }

  closeNav(): void {
    this.open.set(false);
  }
}

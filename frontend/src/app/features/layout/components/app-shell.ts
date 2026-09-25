import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { LayoutService } from '../services/layout.service';
import { Sidebar } from './sidebar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'layout.closeNav()' },
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent"
      >Aller au contenu</a
    >
    <div class="flex h-dvh overflow-hidden">
      <app-sidebar class="hidden w-64 shrink-0 border-r border-line bg-surface lg:flex" />

      @if (layout.navOpen()) {
        <div class="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            class="absolute inset-0 bg-black/60"
            aria-label="Fermer la navigation"
            (click)="layout.closeNav()"
          ></button>
          <app-sidebar
            class="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-[drawer-in_200ms_var(--ease-out-soft)] border-r border-line bg-surface shadow-2xl"
          />
        </div>
      }

      <main id="main" class="min-w-0 flex-1" tabindex="-1">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    @keyframes drawer-in {
      from {
        transform: translateX(-100%);
      }
    }
  `,
})
export class AppShell {
  protected readonly layout = inject(LayoutService);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.layout.closeNav());
  }
}

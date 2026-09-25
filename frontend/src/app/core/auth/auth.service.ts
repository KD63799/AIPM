import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../toast/toast.service';

export type User = { id: string; email: string; createdAt: string };
type Session = { accessToken: string; user: User };

/**
 * The access token lives in memory only; the refresh token is an httpOnly
 * cookie the API rotates on each use.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly session = signal<Session | null>(null);
  private pendingRefresh: Promise<boolean> | null = null;

  readonly user = computed(() => this.session()?.user ?? null);
  /** Stable across token refreshes: resources key their requests on it. */
  readonly userId = computed(() => this.session()?.user.id ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  async login(email: string, password: string): Promise<void> {
    this.session.set(
      await firstValueFrom(this.http.post<Session>('/api/auth/login', { email, password })),
    );
  }

  async register(email: string, password: string): Promise<void> {
    this.session.set(
      await firstValueFrom(this.http.post<Session>('/api/auth/register', { email, password })),
    );
  }

  /**
   * Refreshes once even if called concurrently. Across tabs too: they share
   * the rotating cookie, so a Web Lock makes them take turns instead of
   * replaying the same token (which the API treats as theft).
   */
  refresh(): Promise<boolean> {
    this.pendingRefresh ??= this.refreshInTurn().finally(() => (this.pendingRefresh = null));
    return this.pendingRefresh;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', null));
    } finally {
      this.clear();
    }
  }

  /** Called when the session cannot be renewed: back to the login page. */
  expire(): void {
    if (!this.session()) return;
    this.clear();
    this.toast.error('Votre session a expiré. Reconnectez-vous.');
  }

  clear(): void {
    this.session.set(null);
    void this.router.navigateByUrl('/login');
  }

  private refreshInTurn(): Promise<boolean> {
    const refresh = async (): Promise<boolean> => {
      try {
        this.session.set(await firstValueFrom(this.http.post<Session>('/api/auth/refresh', null)));
        return true;
      } catch {
        this.session.set(null);
        return false;
      }
    };
    return 'locks' in navigator ? navigator.locks.request('auth-refresh', refresh) : refresh();
  }
}

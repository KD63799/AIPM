import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** Signs out every other session; this one keeps going. */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(this.http.patch('/api/auth/password', { currentPassword, newPassword }));
  }

  async deleteAccount(password: string): Promise<void> {
    await firstValueFrom(this.http.delete('/api/users/me', { body: { password } }));
    this.auth.clear();
  }
}

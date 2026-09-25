import { inject } from '@angular/core';
import type { CanMatchFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanMatchFn = () =>
  inject(AuthService).isAuthenticated() || inject(Router).parseUrl('/login');

export const guestGuard: CanMatchFn = () =>
  !inject(AuthService).isAuthenticated() || inject(Router).parseUrl('/');

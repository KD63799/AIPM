import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

const authPage = () => import('./features/auth/components/auth-page').then((m) => m.AuthPage);

export const routes: Routes = [
  {
    path: 'login',
    canMatch: [guestGuard],
    loadComponent: authPage,
    data: { mode: 'login' },
    title: 'Connexion – Prompt Manager',
  },
  {
    path: 'register',
    canMatch: [guestGuard],
    loadComponent: authPage,
    data: { mode: 'register' },
    title: 'Créer un compte – Prompt Manager',
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./features/layout/components/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'prompts' },
      {
        path: 'prompts',
        title: 'Prompts – Prompt Manager',
        loadComponent: () =>
          import('./features/prompts/components/prompts-page').then((m) => m.PromptsPage),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/prompts/components/prompt-placeholder').then(
                (m) => m.PromptPlaceholder,
              ),
          },
          {
            path: 'new',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/prompts/components/prompt-editor').then((m) => m.PromptEditor),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/prompts/components/prompt-detail').then((m) => m.PromptDetail),
          },
          {
            path: ':id/edit',
            canDeactivate: [unsavedChangesGuard],
            loadComponent: () =>
              import('./features/prompts/components/prompt-editor').then((m) => m.PromptEditor),
          },
          {
            path: ':id/history',
            loadComponent: () =>
              import('./features/prompts/components/version-history').then((m) => m.VersionHistory),
          },
        ],
      },
      {
        path: 'settings',
        title: 'Paramètres – Prompt Manager',
        loadComponent: () =>
          import('./features/settings/components/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

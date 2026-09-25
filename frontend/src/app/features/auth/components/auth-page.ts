import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideLoaderCircle } from '@lucide/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { errorMessage } from '../../../core/http/error-message';
import { BrandMark } from '../../../shared/brand-mark';
import { TemplateShowcase } from './template-showcase';

const COPY = {
  login: {
    title: 'Se connecter',
    lead: 'Retrouvez vos prompts là où vous les avez laissés.',
    submit: 'Se connecter',
    switchText: 'Pas encore de compte ?',
    switchLink: 'Créer un compte',
    switchTo: '/register',
    autocomplete: 'current-password',
    failure: 'Email ou mot de passe incorrect.',
  },
  register: {
    title: 'Créer un compte',
    lead: 'Un espace privé pour ranger et réutiliser vos prompts.',
    submit: 'Créer le compte',
    switchText: 'Déjà inscrit ?',
    switchLink: 'Se connecter',
    switchTo: '/login',
    autocomplete: 'new-password',
    failure: 'Impossible de créer le compte. Réessayez.',
  },
} as const;

@Component({
  selector: 'app-auth-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BrandMark,
    TemplateShowcase,
    LucideEye,
    LucideEyeOff,
    LucideLoaderCircle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <aside
        class="hidden flex-col justify-between gap-12 border-r border-line bg-surface p-10 lg:flex xl:p-14"
      >
        <app-brand-mark />
        <app-template-showcase />
        <p class="text-sm text-muted">
          Open source et auto-hébergeable : vos prompts restent chez vous.
        </p>
      </aside>

      <main class="flex items-center justify-center px-4 py-12 sm:px-8">
        <div class="w-full max-w-sm">
          <app-brand-mark class="mb-12 lg:hidden" />
          <h1 class="text-2xl font-semibold tracking-tight">{{ copy().title }}</h1>
          <p class="mt-2 text-muted">{{ copy().lead }}</p>

          <form class="mt-8 space-y-5" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div>
              <label class="label" for="email">Adresse email</label>
              <input
                id="email"
                class="field h-10"
                type="email"
                formControlName="email"
                autocomplete="email"
                inputmode="email"
                [attr.aria-invalid]="showError('email')"
                [attr.aria-describedby]="showError('email') ? 'email-error' : null"
              />
              @if (showError('email')) {
                <p id="email-error" class="field-error">Saisissez une adresse email valide.</p>
              }
            </div>

            <div>
              <label class="label" for="password">Mot de passe</label>
              <div class="relative">
                <input
                  id="password"
                  class="field h-10 pr-10"
                  formControlName="password"
                  [type]="passwordVisible() ? 'text' : 'password'"
                  [attr.autocomplete]="copy().autocomplete"
                  [attr.aria-invalid]="showError('password')"
                  aria-describedby="password-hint"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted hover:text-ink"
                  [attr.aria-label]="
                    passwordVisible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  "
                  [attr.aria-pressed]="passwordVisible()"
                  (click)="passwordVisible.set(!passwordVisible())"
                >
                  @if (passwordVisible()) {
                    <svg lucideEyeOff class="size-4"></svg>
                  } @else {
                    <svg lucideEye class="size-4"></svg>
                  }
                </button>
              </div>
              <p id="password-hint" class="hint" [class.text-danger]="showError('password')">
                8 caractères minimum.
              </p>
            </div>

            @if (error(); as message) {
              <p
                role="alert"
                class="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
              >
                {{ message }}
              </p>
            }

            <button type="submit" class="btn btn-primary h-10 w-full" [disabled]="submitting()">
              @if (submitting()) {
                <svg lucideLoaderCircle class="size-4 animate-spin"></svg>
              }
              {{ copy().submit }}
            </button>
          </form>

          <p class="mt-8 text-sm text-muted">
            {{ copy().switchText }}
            <a [routerLink]="copy().switchTo" class="font-medium text-accent-text hover:underline">
              {{ copy().switchLink }}
            </a>
          </p>
        </div>
      </main>
    </div>
  `,
})
export class AuthPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** From the route data. */
  readonly mode = input<'login' | 'register'>('login');

  protected readonly copy = computed(() => COPY[this.mode()]);
  protected readonly passwordVisible = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected showError(control: 'email' | 'password'): boolean {
    const { invalid, touched } = this.form.controls[control];
    return invalid && (touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      await (this.mode() === 'login'
        ? this.auth.login(email, password)
        : this.auth.register(email, password));
      await this.router.navigateByUrl('/prompts');
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'Un compte existe déjà avec cette adresse.'
          : errorMessage(error, this.copy().failure),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}

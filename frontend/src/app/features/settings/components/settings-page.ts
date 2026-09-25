import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideDownload,
  LucideFileBraces,
  LucideFileText,
  LucideLoaderCircle,
  LucideMenu,
  LucideMoon,
  LucideSun,
  LucideUpload,
} from '@lucide/angular';
import { AuthService } from '../../../core/auth/auth.service';
import { ConfirmService } from '../../../core/confirm/confirm.service';
import { errorMessage } from '../../../core/http/error-message';
import type { Theme } from '../../../core/theme/theme.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { ToastService } from '../../../core/toast/toast.service';
import { formatDate, plural } from '../../../shared/format';
import { LayoutService } from '../../layout/services/layout.service';
import { AccountService } from '../services/account.service';
import { LibraryService } from '../services/library.service';

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
  group.get('newPassword')?.value === group.get('confirmation')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    LucideDownload,
    LucideFileBraces,
    LucideFileText,
    LucideLoaderCircle,
    LucideMenu,
    LucideMoon,
    LucideSun,
    LucideUpload,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <header class="flex h-16 shrink-0 items-center gap-2 border-b border-line px-4 sm:px-8">
      <button
        type="button"
        class="btn btn-ghost btn-icon -ml-2 lg:hidden"
        aria-label="Ouvrir la navigation"
        (click)="layout.openNav()"
      >
        <svg lucideMenu class="size-4"></svg>
      </button>
      <h1 class="text-[15px] font-semibold">Paramètres</h1>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-2xl divide-y divide-line px-4 sm:px-8">
        <section class="py-8" aria-labelledby="account-title">
          <h2 id="account-title" class="text-base font-semibold">Compte</h2>
          <p class="mt-1 text-sm text-muted">
            Connecté en tant que <span class="text-ink">{{ auth.user()?.email }}</span
            >, membre depuis le {{ memberSince() }}.
          </p>
        </section>

        <section class="py-8" aria-labelledby="password-title">
          <h2 id="password-title" class="text-base font-semibold">Mot de passe</h2>
          <p class="mt-1 text-sm text-muted">Vos autres sessions seront déconnectées.</p>
          <form
            class="mt-5 max-w-sm space-y-4"
            [formGroup]="passwordForm"
            (ngSubmit)="changePassword()"
            novalidate
          >
            <div>
              <label class="label" for="current-password">Mot de passe actuel</label>
              <input
                id="current-password"
                type="password"
                class="field"
                formControlName="currentPassword"
                autocomplete="current-password"
              />
            </div>
            <div>
              <label class="label" for="new-password">Nouveau mot de passe</label>
              <input
                id="new-password"
                type="password"
                class="field"
                formControlName="newPassword"
                autocomplete="new-password"
                aria-describedby="new-password-hint"
              />
              <p
                id="new-password-hint"
                class="hint"
                [class.text-danger]="
                  passwordSubmitted() && passwordForm.controls.newPassword.invalid
                "
              >
                8 caractères minimum.
              </p>
            </div>
            <div>
              <label class="label" for="confirm-password">Confirmation</label>
              <input
                id="confirm-password"
                type="password"
                class="field"
                formControlName="confirmation"
                autocomplete="new-password"
              />
              @if (passwordSubmitted() && passwordForm.hasError('mismatch')) {
                <p class="field-error">Les deux mots de passe ne correspondent pas.</p>
              }
            </div>
            <button type="submit" class="btn" [disabled]="changingPassword()">
              @if (changingPassword()) {
                <svg lucideLoaderCircle class="size-4 animate-spin"></svg>
              }
              Changer le mot de passe
            </button>
          </form>
        </section>

        <section class="py-8" aria-labelledby="theme-title">
          <h2 id="theme-title" class="text-base font-semibold">Apparence</h2>
          <div
            class="mt-4 inline-flex rounded-lg border border-line p-1"
            role="radiogroup"
            aria-labelledby="theme-title"
          >
            @for (option of themes; track option.value) {
              <button
                type="button"
                role="radio"
                class="flex h-8 items-center gap-2 rounded-md px-3 text-sm text-muted aria-checked:bg-raised aria-checked:text-ink"
                [attr.aria-checked]="theme.theme() === option.value"
                (click)="theme.set(option.value)"
              >
                @if (option.value === 'dark') {
                  <svg lucideMoon class="size-4"></svg>
                } @else {
                  <svg lucideSun class="size-4"></svg>
                }
                {{ option.label }}
              </button>
            }
          </div>
        </section>

        <section class="py-8" aria-labelledby="data-title">
          <h2 id="data-title" class="text-base font-semibold">Exporter et importer</h2>
          <p class="mt-1 text-sm text-muted">
            Le JSON contient toute la bibliothèque et se réimporte ici ou sur une autre instance. Le
            Markdown se lit et s’archive facilement.
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="btn" [disabled]="busy()" (click)="exportLibrary('json')">
              <svg lucideFileBraces class="size-4"></svg>
              Exporter en JSON
            </button>
            <button
              type="button"
              class="btn"
              [disabled]="busy()"
              (click)="exportLibrary('markdown')"
            >
              <svg lucideFileText class="size-4"></svg>
              Exporter en Markdown
            </button>
            <label class="btn" [class.opacity-50]="busy()">
              <svg lucideUpload class="size-4"></svg>
              Importer un JSON
              <input
                type="file"
                class="sr-only"
                accept="application/json,.json"
                [disabled]="busy()"
                (change)="importFile($event)"
              />
            </label>
          </div>
          <p class="hint mt-3 flex items-center gap-1.5">
            <svg lucideDownload class="size-3.5"></svg>
            L’import ajoute les prompts et réutilise les dossiers et tags qui existent déjà.
          </p>
        </section>

        <section class="py-8" aria-labelledby="danger-title">
          <h2 id="danger-title" class="text-base font-semibold text-danger">Supprimer le compte</h2>
          <p class="mt-1 text-sm text-muted">
            Vos prompts, dossiers, tags et leur historique sont effacés définitivement. Exportez-les
            d’abord si vous voulez les garder.
          </p>
          <form
            class="mt-5 flex max-w-sm flex-col gap-3 sm:flex-row sm:items-end"
            [formGroup]="deleteForm"
            (ngSubmit)="deleteAccount()"
            novalidate
          >
            <div class="flex-1">
              <label class="label" for="delete-password">Mot de passe</label>
              <input
                id="delete-password"
                type="password"
                class="field"
                formControlName="password"
                autocomplete="current-password"
              />
            </div>
            <button type="submit" class="btn btn-danger" [disabled]="busy() || deleteForm.invalid">
              Supprimer mon compte
            </button>
          </form>
        </section>
      </div>
    </div>
  `,
})
export class SettingsPage {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly layout = inject(LayoutService);
  private readonly account = inject(AccountService);
  private readonly library = inject(LibraryService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly themes: { value: Theme; label: string }[] = [
    { value: 'dark', label: 'Sombre' },
    { value: 'light', label: 'Clair' },
  ];
  protected readonly memberSince = computed(() => {
    const user = this.auth.user();
    return user ? formatDate(user.createdAt) : '';
  });
  protected readonly busy = signal(false);
  protected readonly changingPassword = signal(false);
  protected readonly passwordSubmitted = signal(false);
  protected readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  protected readonly deleteForm = this.fb.group({ password: ['', Validators.required] });

  protected async exportLibrary(format: 'json' | 'markdown'): Promise<void> {
    this.busy.set(true);
    try {
      await (format === 'json' ? this.library.exportJson() : this.library.exportMarkdown());
      this.toast.success(
        format === 'json' ? 'Export JSON téléchargé.' : 'Export Markdown téléchargé.',
      );
    } catch (error) {
      this.toast.error(errorMessage(error, 'L’export a échoué.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busy.set(true);
    try {
      const { folders, tags, prompts } = await this.library.import(file);
      this.toast.success(
        `Import terminé : ${plural(prompts, 'prompt ajouté', 'prompts ajoutés')}, ` +
          `${plural(folders, 'dossier créé', 'dossiers créés')}, ${plural(tags, 'tag créé', 'tags créés')}.`,
      );
    } catch (error) {
      this.toast.error(
        error instanceof SyntaxError
          ? 'Ce fichier n’est pas un JSON valide.'
          : errorMessage(error, 'Ce fichier ne ressemble pas à un export de Prompt Manager.'),
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async changePassword(): Promise<void> {
    this.passwordSubmitted.set(true);
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.changingPassword.set(true);
    try {
      await this.account.changePassword(currentPassword, newPassword);
      this.passwordForm.reset();
      this.passwordSubmitted.set(false);
      this.toast.success('Mot de passe modifié. Vos autres sessions ont été déconnectées.');
    } catch (error) {
      this.toast.error(errorMessage(error, 'Le mot de passe n’a pas pu être modifié.'));
    } finally {
      this.changingPassword.set(false);
    }
  }

  protected async deleteAccount(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Supprimer votre compte ?',
      message: 'Toute votre bibliothèque sera effacée. Cette action est définitive.',
      confirmLabel: 'Supprimer définitivement',
      danger: true,
    });
    if (!confirmed) return;
    this.busy.set(true);
    try {
      await this.account.deleteAccount(this.deleteForm.getRawValue().password);
      this.toast.success('Compte supprimé.');
    } catch (error) {
      this.toast.error(errorMessage(error, 'Le compte n’a pas pu être supprimé.'));
    } finally {
      this.busy.set(false);
    }
  }
}

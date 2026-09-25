import { HttpErrorResponse } from '@angular/common/http';

/**
 * The API's own message when it wrote one for humans (a string, in French),
 * otherwise `fallback`. Validation errors come as arrays of technical strings.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'Serveur injoignable. Vérifiez votre connexion.';
  const message: unknown = (error.error as { message?: unknown } | null)?.message;
  return typeof message === 'string' && error.status !== 401 ? message : fallback;
}

import type { CanDeactivateFn } from '@angular/router';

/** Lets a routed component with pending edits ask before it is left. */
export const unsavedChangesGuard: CanDeactivateFn<{ canLeave(): boolean | Promise<boolean> }> = (
  component,
) => component.canLeave();

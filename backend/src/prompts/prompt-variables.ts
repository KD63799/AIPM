/** Matches `{{ name }}`. Names are limited to word chars, dot and dash. */
const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Variable names found in `content`, deduplicated, in order of first appearance. */
export function parseVariableNames(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(VARIABLE_PATTERN)) {
    names.add(match[1]);
  }
  return [...names];
}

/**
 * Substitutes `{{name}}` with `values[name]`, falling back to `defaults[name]`.
 * A variable with neither is left untouched, placeholder included.
 */
export function renderTemplate(
  content: string,
  values: Readonly<Record<string, string>>,
  defaults: Readonly<Record<string, string>> = {},
): string {
  return content.replace(VARIABLE_PATTERN, (placeholder, name: string) => {
    const value = values[name] ?? defaults[name];
    return value === undefined ? placeholder : value;
  });
}

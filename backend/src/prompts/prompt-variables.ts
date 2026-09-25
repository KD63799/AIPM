/**
 * Matches `{{ name }}`. Names are limited to word chars, dot and dash.
 * Keep in sync with frontend/src/app/features/prompts/models/prompt-template.ts.
 */
const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Variable names found in `content`, deduplicated, in order of first appearance. */
export function parseVariableNames(content: string): string[] {
  const names = new Set<string>();
  for (const match of content.matchAll(VARIABLE_PATTERN)) {
    names.add(match[1]);
  }
  return [...names];
}

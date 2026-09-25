/**
 * Matches `{{ name }}`. Names are limited to word chars, dot and dash.
 * Keep in sync with backend/src/prompts/prompt-variables.ts.
 */
const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g;

export type Segment =
  { kind: 'text'; text: string } | { kind: 'variable'; name: string; source: string };

/** Variable names found in `content`, deduplicated, in order of first appearance. */
export function parseVariableNames(content: string): string[] {
  return [...new Set(Array.from(content.matchAll(VARIABLE_PATTERN), (match) => match[1]))];
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

/** `content` cut into plain text and variable placeholders, for highlighting. */
export function segmentTemplate(content: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of content.matchAll(VARIABLE_PATTERN)) {
    if (match.index > cursor)
      segments.push({ kind: 'text', text: content.slice(cursor, match.index) });
    segments.push({ kind: 'variable', name: match[1], source: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < content.length) segments.push({ kind: 'text', text: content.slice(cursor) });
  return segments;
}

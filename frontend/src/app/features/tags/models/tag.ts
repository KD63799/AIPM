export type Tag = { id: string; name: string; color: string; promptCount: number };

/** Muted enough for the ink background, distinct enough to tell apart. */
export const TAG_COLORS = [
  '#f07167',
  '#f4a261',
  '#5fd3a5',
  '#4cc9f0',
  '#7aa2f7',
  '#b392f0',
  '#f28cb1',
  '#94a3b8',
] as const;

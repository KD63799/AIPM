export type Variable = { name: string; defaultValue: string | null; description: string | null };

export type PromptTag = { id: string; name: string; color: string };

export type Prompt = {
  id: string;
  title: string;
  description: string | null;
  content: string;
  folderId: string | null;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  tags: PromptTag[];
  variables: Variable[];
};

export type PromptVersion = {
  versionNumber: number;
  title: string;
  content: string;
  createdAt: string;
};

export type PromptInput = {
  title: string;
  content: string;
  description: string | null;
  folderId: string | null;
  tagIds: string[];
  isFavorite: boolean;
  variables: Variable[];
};

export type PromptSort = 'recent' | 'used' | 'lastUsed' | 'title';

export const PROMPT_SORTS: { value: PromptSort; label: string }[] = [
  { value: 'recent', label: 'Modifiés récemment' },
  { value: 'used', label: 'Les plus utilisés' },
  { value: 'lastUsed', label: 'Utilisés récemment' },
  { value: 'title', label: 'Par titre' },
];

export type PromptQuery = {
  q?: string;
  folderId?: string;
  tagId?: string;
  favorite?: boolean;
  sort?: PromptSort;
};

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const formatDate = (iso: string): string => dateFormat.format(new Date(iso));
export const formatDateTime = (iso: string): string => dateTimeFormat.format(new Date(iso));

/** `1 variable`, `3 variables`… French plural, 0 and 1 singular. */
export const plural = (count: number, singular: string, pluralForm = `${singular}s`): string =>
  `${count} ${count > 1 ? pluralForm : singular}`;

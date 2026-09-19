import type { Key } from './i18n';

/** Этапы маршрута. Подпись хранится ключом — она зависит от языка. */
export const STAGES: { id: string; label: Key }[] = [
  { id: 'start', label: 'stage.start' },
  { id: 'profile', label: 'stage.profile' },
  { id: 'diagnosis', label: 'stage.diagnosis' },
  { id: 'recs', label: 'stage.recs' },
  { id: 'compare', label: 'stage.compare' },
  { id: 'plan', label: 'stage.plan' },
  { id: 'next', label: 'stage.next' },
];

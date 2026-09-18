/** Этапы маршрута. Вынесены из App, чтобы навигация могла их импортировать без цикла. */
export const STAGES = [
  { id: 'start', label: 'Старт' },
  { id: 'profile', label: 'Профиль' },
  { id: 'diagnosis', label: 'Диагностика' },
  { id: 'recs', label: 'Рекомендации' },
  { id: 'compare', label: 'Сравнение' },
  { id: 'plan', label: 'План' },
  { id: 'next', label: 'Следующий шаг' },
];

import { useEffect, useState } from 'react';
import { getLang, subscribeLang, type Lang } from './index';

/**
 * Подписка на язык. Возвращает текущий язык, чтобы компонент перерисовался
 * при переключении — сами строки берутся через t().
 */
export function useLang(): Lang {
  const [lang, setLangState] = useState<Lang>(getLang);

  useEffect(() => {
    setLangState(getLang());
    return subscribeLang(setLangState);
  }, []);

  return lang;
}

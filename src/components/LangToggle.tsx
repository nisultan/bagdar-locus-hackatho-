import { useState } from 'react';
import { LANG_LABELS, setLang, t, type Lang } from '../i18n';
import { useLang } from '../i18n/useLang';
import { RouteLoader } from './RouteLoader';

/**
 * Переключатель языка. Смена языка перерисовывает весь интерфейс разом,
 * поэтому переход закрыт фирменным оверлеем: иначе экран дёргается
 * на глазах у пользователя.
 */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const [switching, setSwitching] = useState<Lang | null>(null);
  const next: Lang = lang === 'ru' ? 'kk' : 'ru';

  return (
    <>
      {switching && (
        <RouteLoader
          steps={[
            { label: switching === 'kk' ? t('loader.langKk') : t('loader.langRu'), ms: 900 },
            { label: t('loader.langApply'), ms: 700 },
          ]}
          /* Язык применяем в конце: оверлей всё это время закрывает экран,
             поэтому перерисовка интерфейса не мелькает перед пользователем. */
          onDone={() => {
            setLang(switching);
            setSwitching(null);
          }}
        />
      )}

      <button
        type="button"
        className={`lang-toggle${compact ? ' lang-toggle-compact' : ''}`}
        onClick={() => setSwitching(next)}
        title={t('ui.langSwitch')}
        aria-label={t('ui.langSwitch')}
      >
        <span className="lang-toggle-on">{LANG_LABELS[lang]}</span>
        <span className="lang-toggle-off">{LANG_LABELS[next]}</span>
      </button>
    </>
  );
}

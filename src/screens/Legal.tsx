import { Button } from '../components/ui';
import { getLang, t } from '../i18n';
import { LEGAL_UPDATED, PRIVACY, TERMS } from '../i18n/legal';
import { go } from '../router';

/** Политика конфиденциальности и условия использования — обычные текстовые страницы. */
export function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const lang = getLang();
  const sections = kind === 'privacy' ? PRIVACY[lang] : TERMS[lang];

  return (
    <article className="legal">
      <header className="legal-head">
        <h1>{t(kind === 'privacy' ? 'legal.privacyTitle' : 'legal.termsTitle')}</h1>
        <p className="muted small">{t('legal.updated', { date: LEGAL_UPDATED })}</p>
      </header>

      {sections.map((s) => (
        <section key={s.h} className="legal-section">
          <h2>{s.h}</h2>
          {s.p.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      ))}

      <Button variant="secondary" icon="back" onClick={() => go('')}>{t('legal.back')}</Button>
    </article>
  );
}

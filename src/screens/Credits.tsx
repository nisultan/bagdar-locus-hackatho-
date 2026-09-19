import { Button, PageHead } from '../components/ui';
import { PROGRAMS } from '../data/programs';
import { UNIVERSITY_PHOTOS, apaCitation } from '../data/photos';
import { t } from '../i18n';
import { go } from '../router';

/**
 * Страница атрибуции. Лицензии CC BY и CC BY-SA требуют указать автора, лицензию
 * и ссылку на оригинал, поэтому список полный и ведёт на страницу файла в Commons.
 * Формат ссылки — APA 7: Author. (Year). Title [Photograph]. Wikimedia Commons. URL
 */
export function Credits() {
  // Один вуз — одна фотография, даже если у него несколько программ.
  const seen = new Set<string>();
  const rows = PROGRAMS.filter((p) => {
    const key = p.university;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((p) => ({ program: p, photo: UNIVERSITY_PHOTOS[p.id.split('-')[0]] ?? null }));

  return (
    <div className="stack">
      <PageHead eyebrow={t('photo.eyebrow')} title={t('photo.title')}>
        {t('photo.lead')}
      </PageHead>

      <section className="card">
        <ul className="credits-list">
          {rows.map(({ program, photo }) => (
            <li key={program.university} className="credit-row">
              {photo ? (
                <img src={photo.src} alt="" loading="lazy" />
              ) : (
                <span className="credit-none" aria-hidden>—</span>
              )}
              <div>
                <b>{program.university}</b>
                {photo ? (
                  <p className="credit-apa">
                    {apaCitation(photo)}{' '}
                    {photo.licenseUrl ? (
                      <a href={photo.licenseUrl} target="_blank" rel="noreferrer noopener">{photo.license}</a>
                    ) : (
                      <span>{photo.license}</span>
                    )}
                  </p>
                ) : (
                  <p className="credit-apa muted">{t('photo.noneLong')}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <p className="small muted">{t('photo.note')}</p>
      </section>

      <Button variant="secondary" icon="back" onClick={() => go('')}>{t('legal.back')}</Button>
    </div>
  );
}

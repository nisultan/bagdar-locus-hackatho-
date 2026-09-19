import { useEffect, useState } from 'react';
import { getSession, signOut, subscribeSession, type Session } from '../auth';
import { Reveal } from '../components/motion';
import { Button, CountryTag, Icon, Meter, PageHead } from '../components/ui';
import {
  ACHIEVEMENT_LABELS, COUNTRY_LABELS, ENGLISH_LABELS, FIELD_ICON, FIELD_LABELS, GRADE_LABELS, PRIORITY_LABELS,
} from '../data/options';
import { PROGRAMS } from '../data/programs';
import { monthYear, usd } from '../engine/format';
import { effectiveIelts } from '../engine/recommend';
import { t } from '../i18n';
import { go } from '../router';
import { getSyncStatus, subscribeSync, type SyncStatus } from '../state/sync';
import { useStore } from '../state/store';
import type { Profile as ProfileData } from '../types';

/**
 * Карточка абитуриента: всё, что сервис о вас знает, на одной странице.
 * Не этап маршрута — справочная страница, куда можно вернуться в любой момент,
 * поэтому каждая секция ведёт на нужный шаг анкеты, а не заставляет проходить её заново.
 */
export function Profile() {
  const { state, dispatch, derived } = useStore();
  const p = state.profile;
  const ie = effectiveIelts(p);

  const [session, setSession] = useState<Session | null>(getSession);
  useEffect(() => subscribeSession(setSession) as unknown as () => void, []);

  const [sync, setSync] = useState<SyncStatus>(getSyncStatus);
  useEffect(() => subscribeSync(setSync) as unknown as () => void, []);

  if (!state.profileDone) {
    return (
      <div className="stack">
        <PageHead eyebrow={t('me.eyebrow')} title={t('me.emptyTitle')} />
        <section className="card empty">
          <Icon name="edit" size={32} />
          <p className="muted">{t('me.emptyText')}</p>
          <Button iconRight="arrow" onClick={() => go('profile')}>{t('landing.ctaBuild')}</Button>
        </section>
      </div>
    );
  }

  const gaps = missingAnswers(p);
  const filled = TRACKED.length - gaps.length;
  const shortlist = state.shortlist
    .map((id) => PROGRAMS.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="stack">
      <PageHead eyebrow={t('me.eyebrow')} title={p.name ? t('me.titleName', { name: p.name }) : t('me.title')}>
        {t('me.sub', { grade: GRADE_LABELS[p.grade], year: derived.roadmap.intakeYear })}
      </PageHead>

      <AccountCard session={session} sync={sync} name={p.name} />

      <section className="me-stats">
        <Stat value={derived.recs.eligible.length} label={t('me.statFit')} />
        <Stat value={state.shortlist.length} label={t('me.statPlan')} />
        <Stat value={`${derived.progress.done}/${derived.progress.total}`} label={t('me.statSteps')} />
      </section>

      {/* Заполненность честно объясняет, почему подбор может быть грубым:
          движок считает незаданный ответ по худшему сценарию. */}
      <Reveal as="section" className="card me-fill" variant="scale">
        <div className="me-fill-head">
          <b>{t('me.completeness')}</b>
          <span className="num">{filled}/{TRACKED.length}</span>
        </div>
        <Meter value={filled} max={TRACKED.length} tone={gaps.length === 0 ? 'good' : 'primary'} />
        <p className="small muted">{t('me.completenessNote')}</p>
        {gaps.length > 0 ? (
          <div className="me-fill-gaps">
            <p className="small">{t('me.missing', { list: gaps.map((g) => t(g.label)).join(', ') })}</p>
            <Button small variant="secondary" icon="edit" onClick={() => go(`profile/${gaps[0].step}`)}>
              {t('me.fillIt')}
            </Button>
          </div>
        ) : (
          <p className="small ok">{t('me.allFilled')}</p>
        )}
      </Reveal>

      <div className="me-grid">
        <Card title={t('me.interests')} icon="spark" step={2}>
          <div className="me-chips">
            {p.interests.map((f, i) => (
              <span key={f} className={`me-chip${i === 0 ? ' me-chip-main' : ''}`}>
                <Icon name={FIELD_ICON[f]} size={16} /> {FIELD_LABELS[f]}
                {i === 0 && <b className="me-chip-tag">{t('wz.mainTag')}</b>}
              </span>
            ))}
          </div>
        </Card>

        <Card title={t('me.academics')} icon="academic" step={3}>
          <Row label={t('me.gpa')} value={p.gpa.toFixed(1)} />
          <Row label={t('me.unt')} value={p.untExpected != null ? String(p.untExpected) : t('me.notSet')} />
          <Row
            label={t('me.englishRow')}
            value={p.ielts != null ? `IELTS ${p.ielts}` : t('me.englishSelf', { level: ENGLISH_LABELS[p.english], ielts: ie.toFixed(1) })}
          />
          <Row label="SAT" value={p.sat != null ? String(p.sat) : t('me.notSet')} />
          <Row label={t('me.achievements')} value={ACHIEVEMENT_LABELS[p.achievements]} />
        </Card>

        <Card title={t('me.geography')} icon="compare" step={4}>
          <div className="me-chips">
            {p.countries.length === 0 ? (
              <span className="me-chip">{t('wz.anyCountry')}</span>
            ) : (
              p.countries.map((c) => (
                <span key={c} className="me-chip"><CountryTag code={c} /> {COUNTRY_LABELS[c]}</span>
              ))
            )}
          </div>
          <Row label={t('me.budget')} value={`${usd(p.budgetUSD)} / ${t('me.perYear')}`} />
          <Row label={t('me.grant')} value={p.needGrant ? t('me.yes') : t('me.no')} />
        </Card>

        <Card title={t('me.priorities')} icon="flag" step={5}>
          <ol className="me-priority">
            {p.priorities.map((pr) => (
              <li key={pr}>{PRIORITY_LABELS[pr]}</li>
            ))}
          </ol>
        </Card>
      </div>

      <section className="card me-shortlist">
        <header className="me-card-head">
          <span className="me-card-icon"><Icon name="check" size={18} /></span>
          <h2>{t('me.shortlist')}</h2>
          <button className="link-btn" onClick={() => go('recs')}>{t('me.toRecs')}</button>
        </header>
        {shortlist.length === 0 ? (
          <p className="small muted">{t('me.shortlistEmpty')}</p>
        ) : (
          <ul className="me-programs">
            {shortlist.map((prog) => (
              <li key={prog.id} className="me-program">
                <CountryTag code={prog.country} />
                <div className="me-program-body">
                  <b>{prog.university}</b>
                  <span className="small muted">{prog.program} · {prog.city}</span>
                </div>
                <button
                  className="icon-btn"
                  title={t('me.removeFromPlan')}
                  aria-label={t('me.removeFromPlan')}
                  onClick={() => dispatch({ type: 'toggleShortlist', id: prog.id })}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card me-next">
        <span className="me-card-icon"><Icon name="flag" size={18} /></span>
        <div className="me-next-body">
          <p className="eyebrow">{t('me.nextStep')}</p>
          {derived.next ? (
            <>
              <b>{derived.next.title}</b>
              <span className="small muted">{monthYear(derived.next.due)}</span>
            </>
          ) : (
            <b>{t('me.noNext')}</b>
          )}
        </div>
        <Button small variant="secondary" onClick={() => go(derived.next ? 'next' : 'plan')}>
          {t('me.openPlan')}
        </Button>
      </section>

      <Reveal as="section" className="card me-privacy" variant="scale">
        <Icon name="lock" />
        <p className="small">
          {t('me.privacyNote')}{' '}
          <a href="#/privacy">{t('app.privacy')}</a>
        </p>
      </Reveal>

      <div className="page-actions">
        <Button variant="ghost" icon="edit" onClick={() => go('profile')}>{t('me.editAll')}</Button>
        <Button iconRight="arrow" onClick={() => go('recs')}>{t('dg.seeRecs')}</Button>
      </div>
    </div>
  );
}

/** Ответы, влияющие на подбор. Шаг — куда вести, если ответа нет. */
const TRACKED = [
  { key: 'name', label: 'me.nameRow', step: 1 },
  { key: 'interests', label: 'me.interests', step: 2 },
  { key: 'unt', label: 'me.unt', step: 3 },
  { key: 'english', label: 'me.englishRow', step: 3 },
  { key: 'achievements', label: 'me.achievements', step: 3 },
  { key: 'countries', label: 'me.geography', step: 4 },
  { key: 'priorities', label: 'me.priorities', step: 5 },
] as const;

function missingAnswers(p: ProfileData) {
  return TRACKED.filter(({ key }) => {
    switch (key) {
      case 'name':
        return p.name.trim().length === 0;
      case 'interests':
        return p.interests.length === 0;
      case 'unt':
        return p.untExpected == null;
      case 'english':
        // Балл IELTS точнее самооценки, поэтому его отсутствие — тоже пробел.
        return p.ielts == null;
      case 'achievements':
        return p.achievements === 'none';
      case 'countries':
        return p.countries.length === 0;
      case 'priorities':
        return p.priorities.length === 0;
      default:
        return false;
    }
  });
}

function AccountCard({ session, sync, name }: { session: Session | null; sync: SyncStatus; name: string }) {
  const initials = (session?.name || name || '?').trim().slice(0, 1).toUpperCase();

  return (
    <section className="card me-account">
      <span className="me-avatar" aria-hidden>{initials}</span>

      <div className="me-account-body">
        <p className="eyebrow">{t('me.account')}</p>
        {session ? (
          <>
            <b>{session.name}</b>
            <span className="small muted">
              {session.email} · {t(session.provider === 'google' ? 'me.viaGoogle' : 'me.viaPassword')}
            </span>
            <span className={`small me-sync me-sync-${sync}`}>
              <Icon name={sync === 'error' ? 'warn' : 'check'} size={13} /> {t(syncKey(sync))}
            </span>
          </>
        ) : (
          <>
            <b>{t('me.guest')}</b>
            <span className="small muted">{t('me.guestNote')}</span>
          </>
        )}
      </div>

      {session ? (
        <Button small variant="ghost" onClick={() => void signOut()}>{t('me.signOut')}</Button>
      ) : (
        <Button small iconRight="arrow" onClick={() => go('auth')}>{t('me.signIn')}</Button>
      )}
    </section>
  );
}

function syncKey(s: SyncStatus) {
  if (s === 'saving' || s === 'loading') return 'me.syncSaving';
  if (s === 'error') return 'me.syncError';
  if (s === 'off') return 'me.syncLocal';
  return 'me.syncSaved';
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="me-stat">
      <b className="num">{value}</b>
      <span className="small muted">{label}</span>
    </div>
  );
}

function Card({ title, icon, step, children }: { title: string; icon: string; step: number; children: React.ReactNode }) {
  return (
    <section className="card me-card">
      <header className="me-card-head">
        <span className="me-card-icon"><Icon name={icon} size={18} /></span>
        <h2>{title}</h2>
        <button className="link-btn" onClick={() => go(`profile/${step}`)}>{t('me.edit')}</button>
      </header>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="me-row">
      <span className="small muted">{label}</span>
      <b>{value}</b>
    </div>
  );
}

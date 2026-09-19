import { useState } from 'react';
import { RouteLoader } from '../components/RouteLoader';
import { Button, Chip, Icon } from '../components/ui';
import {
  ACHIEVEMENT_LABELS, COUNTRY_FLAG, COUNTRY_LABELS, ENGLISH_LABELS, FIELD_EMOJI, FIELD_LABELS, GRADE_LABELS, PRIORITY_LABELS,
} from '../data/options';
import { usd } from '../engine/format';
import { t } from '../i18n';
import { go } from '../router';
import { useStore } from '../state/store';
import type { Achievements, CountryCode, EnglishLevel, Field, Grade, Priority, Profile } from '../types';

const TITLE_KEYS = ['wz.t1', 'wz.t2', 'wz.t3', 'wz.t4', 'wz.t5'] as const;

type Errors = Partial<Record<'interests' | 'unt' | 'ielts' | 'sat' | 'budget', string>>;

export function validate(p: Profile, step: number): Errors {
  const e: Errors = {};
  if (step === 2 && p.interests.length === 0) e.interests = t('wz.errField');
  if (step === 3) {
    if (p.untExpected != null && (p.untExpected < 0 || p.untExpected > 140)) e.unt = t('wz.errUnt');
    if (p.ielts != null && (p.ielts < 1 || p.ielts > 9)) e.ielts = t('wz.errIelts');
    if (p.sat != null && (p.sat < 400 || p.sat > 1600)) e.sat = t('wz.errSat');
  }
  if (step === 4 && p.budgetUSD < 0) e.budget = t('wz.errBudget');
  return e;
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export function ProfileWizard({ step }: { step: number }) {
  const { state, dispatch } = useStore();
  const [p, setP] = useState<Profile>(state.profile);
  const [errors, setErrors] = useState<Errors>({});
  const s = Math.min(Math.max(step, 1), TITLE_KEYS.length);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const editing = state.profileDone;

  const toggle = <T,>(list: T[], v: T, max: number) =>
    list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v];

  const [building, setBuilding] = useState(false);

  const next = () => {
    const e = validate(p, s);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (s < TITLE_KEYS.length) go(`profile/${s + 1}`);
    else {
      // Профиль сохраняем сразу: оверлей показывает то, что уже произошло,
      // а не изображает работу, которой нет.
      dispatch({ type: 'saveProfile', profile: p });
      setBuilding(true);
    }
  };

  const saveNow = () => {
    for (let i = 1; i <= TITLE_KEYS.length; i++) {
      const e = validate(p, i);
      if (Object.keys(e).length) {
        setErrors(e);
        go(`profile/${i}`);
        return;
      }
    }
    dispatch({ type: 'saveProfile', profile: p });
    go('recs');
  };

  return (
    <div className="wizard">
      {building && (
        <RouteLoader
          steps={[
            { label: t('loader.saved'), ms: 500 },
            { label: t('loader.picking'), ms: 650 },
            { label: t('loader.planning'), ms: 550 },
          ]}
          onDone={() => go(editing ? 'recs' : 'diagnosis')}
        />
      )}

      <div className="wizard-progress">
        <div className="wizard-meta">
          <span>{t('wz.questionOf', { n: s, total: TITLE_KEYS.length })}</span>
          <span className="muted">{editing ? t('wz.editHint') : t('wz.timeHint')}</span>
        </div>
        <div className="wizard-bar">
          {TITLE_KEYS.map((key, i) => (
            <button
              key={key}
              type="button"
              className={`wizard-seg${i + 1 <= s ? ' on' : ''}`}
              aria-label={`${i + 1}. ${t(key)}`}
              onClick={() => i + 1 < s && go(`profile/${i + 1}`)}
            />
          ))}
        </div>
      </div>

      <section className="card wizard-card">
        <h1 className="wizard-title">{t(TITLE_KEYS[s - 1])}</h1>

        {s === 1 && (
          <>
            <label className="field">
              <span className="label">{t('wz.name')}</span>
              <input value={p.name} maxLength={40} placeholder={t('wz.namePh')} onChange={(e) => set('name', e.target.value)} />
            </label>
            <div className="field">
              <span className="label">{t('wz.grade')}</span>
              <div className="chips">
                {(Object.keys(GRADE_LABELS) as Grade[]).map((g) => (
                  <Chip key={g} selected={p.grade === g} onClick={() => set('grade', g)}>{GRADE_LABELS[g]}</Chip>
                ))}
              </div>
              <p className="hint">{t('wz.gradeHint')}</p>
            </div>
          </>
        )}

        {s === 2 && (
          <div className="field">
            <span className="label">{t('wz.interests')}</span>
            <div className="field-grid">
              {(Object.keys(FIELD_LABELS) as Field[]).map((f) => {
                const idx = p.interests.indexOf(f);
                return (
                  <button
                    key={f}
                    type="button"
                    className={`field-card${idx >= 0 ? ' on' : ''}`}
                    aria-pressed={idx >= 0}
                    onClick={() => set('interests', toggle(p.interests, f, 3))}
                  >
                    <span className="field-emoji" aria-hidden>{FIELD_EMOJI[f]}</span>
                    <span>{FIELD_LABELS[f]}</span>
                    {idx >= 0 && <span className="field-rank">{idx === 0 ? t('wz.mainTag') : `#${idx + 1}`}</span>}
                  </button>
                );
              })}
            </div>
            {errors.interests && <p className="error"><Icon name="warn" size={16} /> {errors.interests}</p>}
          </div>
        )}

        {s === 3 && (
          <>
            <label className="field">
              <span className="label">{t('wz.gpa')}<b>{p.gpa.toFixed(1)}</b>{t('wz.gpaOf')}</span>
              <input type="range" min={3} max={5} step={0.1} value={p.gpa} onChange={(e) => set('gpa', Number(e.target.value))} />
            </label>
            <div className="field-row">
              <label className="field">
                <span className="label">{t('wz.unt')}</span>
                <input inputMode="numeric" type="number" placeholder={t('wz.dontKnow')} value={p.untExpected ?? ''} onChange={(e) => set('untExpected', numOrNull(e.target.value))} />
                {errors.unt && <p className="error">{errors.unt}</p>}
              </label>
              <label className="field">
                <span className="label">{t('wz.ielts')}</span>
                <input inputMode="decimal" type="number" step={0.5} placeholder={t('wz.none')} value={p.ielts ?? ''} onChange={(e) => set('ielts', numOrNull(e.target.value))} />
                {errors.ielts && <p className="error">{errors.ielts}</p>}
              </label>
              <label className="field">
                <span className="label">{t('wz.sat')}</span>
                <input inputMode="numeric" type="number" placeholder={t('wz.none')} value={p.sat ?? ''} onChange={(e) => set('sat', numOrNull(e.target.value))} />
                {errors.sat && <p className="error">{errors.sat}</p>}
              </label>
            </div>
            <div className="field">
              <span className="label">{t('wz.english')}</span>
              <div className="chips">
                {(Object.keys(ENGLISH_LABELS) as EnglishLevel[]).map((l) => (
                  <Chip key={l} selected={p.english === l} onClick={() => set('english', l)}>{ENGLISH_LABELS[l]}</Chip>
                ))}
              </div>
            </div>
            <label className="field">
              <span className="label">{t('wz.ach')}</span>
              <select value={p.achievements} onChange={(e) => set('achievements', e.target.value as Achievements)}>
                {(Object.keys(ACHIEVEMENT_LABELS) as Achievements[]).map((a) => (
                  <option key={a} value={a}>{ACHIEVEMENT_LABELS[a]}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {s === 4 && (
          <>
            <div className="field">
              <span className="label">{t('wz.where')} {p.countries.length === 0 && <span className="muted">{t('wz.whereAll')}</span>}</span>
              <div className="chips">
                <Chip selected={p.countries.length === 0} onClick={() => set('countries', [])}>{t('wz.anyCountry')}</Chip>
                {(Object.keys(COUNTRY_LABELS) as CountryCode[]).map((c) => (
                  <Chip key={c} selected={p.countries.includes(c)} onClick={() => set('countries', toggle(p.countries, c, 10))}>
                    {COUNTRY_FLAG[c]} {COUNTRY_LABELS[c]}
                  </Chip>
                ))}
              </div>
            </div>
            <label className="field">
              <span className="label">{t('wz.budget')}<b>{usd(p.budgetUSD)}</b></span>
              <input type="range" min={0} max={50000} step={500} value={p.budgetUSD} onChange={(e) => set('budgetUSD', Number(e.target.value))} />
              <div className="range-scale"><span>$0</span><span>$25 000</span><span>$50 000</span></div>
              {errors.budget && <p className="error">{errors.budget}</p>}
            </label>
            <label className="toggle">
              <input type="checkbox" checked={p.needGrant} onChange={(e) => set('needGrant', e.target.checked)} />
              <span className="toggle-ui" aria-hidden />
              <span>{t('wz.needGrant')}</span>
            </label>
          </>
        )}

        {s === 5 && (
          <div className="field">
            <span className="label">{t('wz.priorities')}</span>
            <div className="chips">
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((k) => (
                <Chip key={k} selected={p.priorities.includes(k)} onClick={() => set('priorities', toggle(p.priorities, k, 2))}>
                  {PRIORITY_LABELS[k]}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div className="wizard-actions">
          {s > 1 ? (
            <Button variant="ghost" icon="back" onClick={() => go(s === 2 ? 'profile' : `profile/${s - 1}`)}>{t('ui.back')}</Button>
          ) : (
            <Button variant="ghost" icon="back" onClick={() => go('')}>{t('ui.home')}</Button>
          )}
          <div className="wizard-actions-right">
            {editing && s < TITLE_KEYS.length && <Button variant="secondary" onClick={saveNow}>{t('wz.save')}</Button>}
            <Button iconRight="arrow" onClick={next}>
              {s < TITLE_KEYS.length ? t('wz.next') : editing ? t('wz.update') : t('wz.finish')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

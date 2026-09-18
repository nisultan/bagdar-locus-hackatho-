import { useState } from 'react';
import { RouteLoader } from '../components/RouteLoader';
import { Button, Chip, Icon } from '../components/ui';
import {
  ACHIEVEMENT_LABELS, COUNTRY_FLAG, COUNTRY_LABELS, ENGLISH_LABELS, FIELD_EMOJI, FIELD_LABELS, GRADE_LABELS, PRIORITY_LABELS,
} from '../data/options';
import { usd } from '../engine/format';
import { go } from '../router';
import { useStore } from '../state/store';
import type { Achievements, CountryCode, EnglishLevel, Field, Grade, Priority, Profile } from '../types';

const TITLES = ['О вас', 'Интересы', 'Учёба и экзамены', 'Страны и бюджет', 'Что для вас важно'];

type Errors = Partial<Record<'interests' | 'unt' | 'ielts' | 'sat' | 'budget', string>>;

export function validate(p: Profile, step: number): Errors {
  const e: Errors = {};
  if (step === 2 && p.interests.length === 0) e.interests = 'Выберите хотя бы одно направление';
  if (step === 3) {
    if (p.untExpected != null && (p.untExpected < 0 || p.untExpected > 140)) e.unt = 'ЕНТ оценивается от 0 до 140 баллов';
    if (p.ielts != null && (p.ielts < 1 || p.ielts > 9)) e.ielts = 'IELTS — от 1 до 9';
    if (p.sat != null && (p.sat < 400 || p.sat > 1600)) e.sat = 'SAT — от 400 до 1600';
  }
  if (step === 4 && p.budgetUSD < 0) e.budget = 'Бюджет не может быть отрицательным';
  return e;
}

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export function ProfileWizard({ step }: { step: number }) {
  const { state, dispatch } = useStore();
  const [p, setP] = useState<Profile>(state.profile);
  const [errors, setErrors] = useState<Errors>({});
  const s = Math.min(Math.max(step, 1), TITLES.length);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));
  const editing = state.profileDone;

  const toggle = <T,>(list: T[], v: T, max: number) =>
    list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v];

  const [building, setBuilding] = useState(false);

  const next = () => {
    const e = validate(p, s);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (s < TITLES.length) go(`profile/${s + 1}`);
    else {
      // Профиль сохраняем сразу: оверлей показывает то, что уже произошло,
      // а не изображает работу, которой нет.
      dispatch({ type: 'saveProfile', profile: p });
      setBuilding(true);
    }
  };

  const saveNow = () => {
    for (let i = 1; i <= TITLES.length; i++) {
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
            { label: 'Профиль сохранён', ms: 500 },
            { label: 'Подбираем программы под ваши условия', ms: 650 },
            { label: 'Собираем план по месяцам', ms: 550 },
          ]}
          onDone={() => go(editing ? 'recs' : 'diagnosis')}
        />
      )}

      <div className="wizard-progress">
        <div className="wizard-meta">
          <span>Вопрос {s} из {TITLES.length}</span>
          <span className="muted">{editing ? 'Изменения обновят рекомендации' : '≈ 3 минуты'}</span>
        </div>
        <div className="wizard-bar">
          {TITLES.map((t, i) => (
            <button
              key={t}
              type="button"
              className={`wizard-seg${i + 1 <= s ? ' on' : ''}`}
              aria-label={`${i + 1}. ${t}`}
              onClick={() => i + 1 < s && go(`profile/${i + 1}`)}
            />
          ))}
        </div>
      </div>

      <section className="card wizard-card">
        <h1 className="wizard-title">{TITLES[s - 1]}</h1>

        {s === 1 && (
          <>
            <label className="field">
              <span className="label">Как к вам обращаться?</span>
              <input value={p.name} maxLength={40} placeholder="Имя (необязательно)" onChange={(e) => set('name', e.target.value)} />
            </label>
            <div className="field">
              <span className="label">В каком вы классе?</span>
              <div className="chips">
                {(Object.keys(GRADE_LABELS) as Grade[]).map((g) => (
                  <Chip key={g} selected={p.grade === g} onClick={() => set('grade', g)}>{GRADE_LABELS[g]}</Chip>
                ))}
              </div>
              <p className="hint">От этого зависит, сколько времени остаётся на подготовку и когда подавать документы.</p>
            </div>
          </>
        )}

        {s === 2 && (
          <div className="field">
            <span className="label">Что вам интересно? Выберите до 3 — первое станет главным</span>
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
                    {idx >= 0 && <span className="field-rank">{idx === 0 ? 'главный' : `#${idx + 1}`}</span>}
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
              <span className="label">Средний балл в школе: <b>{p.gpa.toFixed(1)}</b> из 5</span>
              <input type="range" min={3} max={5} step={0.1} value={p.gpa} onChange={(e) => set('gpa', Number(e.target.value))} />
            </label>
            <div className="field-row">
              <label className="field">
                <span className="label">Ожидаемый ЕНТ (0–140)</span>
                <input inputMode="numeric" type="number" placeholder="Не знаю" value={p.untExpected ?? ''} onChange={(e) => set('untExpected', numOrNull(e.target.value))} />
                {errors.unt && <p className="error">{errors.unt}</p>}
              </label>
              <label className="field">
                <span className="label">IELTS, если есть</span>
                <input inputMode="decimal" type="number" step={0.5} placeholder="Нет" value={p.ielts ?? ''} onChange={(e) => set('ielts', numOrNull(e.target.value))} />
                {errors.ielts && <p className="error">{errors.ielts}</p>}
              </label>
              <label className="field">
                <span className="label">SAT, если есть</span>
                <input inputMode="numeric" type="number" placeholder="Нет" value={p.sat ?? ''} onChange={(e) => set('sat', numOrNull(e.target.value))} />
                {errors.sat && <p className="error">{errors.sat}</p>}
              </label>
            </div>
            <div className="field">
              <span className="label">Уровень английского</span>
              <div className="chips">
                {(Object.keys(ENGLISH_LABELS) as EnglishLevel[]).map((l) => (
                  <Chip key={l} selected={p.english === l} onClick={() => set('english', l)}>{ENGLISH_LABELS[l]}</Chip>
                ))}
              </div>
            </div>
            <label className="field">
              <span className="label">Олимпиады, проекты, конкурсы</span>
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
              <span className="label">Где хотите учиться? {p.countries.length === 0 && <span className="muted">— рассматриваем все страны</span>}</span>
              <div className="chips">
                <Chip selected={p.countries.length === 0} onClick={() => set('countries', [])}>Любая страна</Chip>
                {(Object.keys(COUNTRY_LABELS) as CountryCode[]).map((c) => (
                  <Chip key={c} selected={p.countries.includes(c)} onClick={() => set('countries', toggle(p.countries, c, 10))}>
                    {COUNTRY_FLAG[c]} {COUNTRY_LABELS[c]}
                  </Chip>
                ))}
              </div>
            </div>
            <label className="field">
              <span className="label">Бюджет семьи в год (обучение + жизнь): <b>{usd(p.budgetUSD)}</b></span>
              <input type="range" min={0} max={50000} step={500} value={p.budgetUSD} onChange={(e) => set('budgetUSD', Number(e.target.value))} />
              <div className="range-scale"><span>$0</span><span>$25 000</span><span>$50 000</span></div>
              {errors.budget && <p className="error">{errors.budget}</p>}
            </label>
            <label className="toggle">
              <input type="checkbox" checked={p.needGrant} onChange={(e) => set('needGrant', e.target.checked)} />
              <span className="toggle-ui" aria-hidden />
              <span>Рассчитываю на грант или стипендию</span>
            </label>
          </>
        )}

        {s === 5 && (
          <div className="field">
            <span className="label">Выберите до 2 приоритетов — они влияют на порядок вариантов</span>
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
            <Button variant="ghost" icon="back" onClick={() => go(s === 2 ? 'profile' : `profile/${s - 1}`)}>Назад</Button>
          ) : (
            <Button variant="ghost" icon="back" onClick={() => go('')}>На главную</Button>
          )}
          <div className="wizard-actions-right">
            {editing && s < TITLES.length && <Button variant="secondary" onClick={saveNow}>Сохранить</Button>}
            <Button iconRight="arrow" onClick={next}>
              {s < TITLES.length ? 'Далее' : editing ? 'Обновить маршрут' : 'Получить диагностику'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

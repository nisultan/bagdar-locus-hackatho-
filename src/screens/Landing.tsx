import { CountUp, Reveal, useTilt } from '../components/motion';
import { ScrollPath } from '../components/ScrollPath';
import { Button, CHECKED_ON, Icon } from '../components/ui';
import { DEMO_PROFILE } from '../data/options';
import { PROGRAMS } from '../data/programs';
import { go } from '../router';
import { useStore } from '../state/store';

const STEPS = [
  { icon: 'edit', title: 'Анкета за 3 минуты', text: 'Интересы, оценки, английский, страны и бюджет.' },
  { icon: 'spark', title: 'Подбор с объяснением', text: 'Каждый вариант — с причинами «почему подходит» и что подтянуть.' },
  { icon: 'deadline', title: 'План по месяцам', text: 'Экзамены, документы и дедлайны — и один главный шаг на сейчас.' },
];

const COUNTRIES = new Set(PROGRAMS.map((p) => p.country)).size;

export function Landing() {
  const { state, dispatch, derived } = useStore();
  const tilt = useTilt(9);

  return (
    <div className="landing">
      <ScrollPath />

      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow rise" style={{ '--d': '0ms' } as React.CSSProperties}>
            Для учеников 9–11 классов Казахстана
          </p>
          <h1 className="rise" style={{ '--d': '70ms' } as React.CSSProperties}>
            Не список вузов, а <span className="hl">маршрут поступления</span>
          </h1>
          <p className="lead rise" style={{ '--d': '140ms' } as React.CSSProperties}>
            Bagdar разбирает ваш профиль, подбирает программы в Казахстане и за рубежом, объясняет выбор простым языком и
            превращает поступление в понятный план с ближайшим шагом.
          </p>
          <div className="hero-cta rise" style={{ '--d': '210ms' } as React.CSSProperties}>
            {state.profileDone ? (
              <>
                <Button iconRight="arrow" onClick={() => go('next')}>Продолжить маршрут</Button>
                <Button variant="secondary" onClick={() => go('recs')}>Мои рекомендации</Button>
              </>
            ) : (
              <>
                <Button iconRight="arrow" onClick={() => go('profile')}>Построить маршрут</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    dispatch({ type: 'saveProfile', profile: DEMO_PROFILE });
                    go('diagnosis');
                  }}
                >
                  Демо-профиль
                </Button>
              </>
            )}
          </div>

          <div className="hero-stats rise" style={{ '--d': '280ms' } as React.CSSProperties}>
            <span><b className="num"><CountUp value={PROGRAMS.length} /></b> программ</span>
            <span><b className="num"><CountUp value={COUNTRIES} /></b> стран</span>
            <span><b className="num"><CountUp value={3} /></b> минуты на анкету</span>
          </div>

          {state.profileDone && (
            <p className="muted small rise" style={{ '--d': '340ms' } as React.CSSProperties}>
              Прогресс плана: {derived.progress.done} из {derived.progress.total} шагов
            </p>
          )}
        </div>

        <div className="hero-preview" ref={tilt} aria-hidden>
          <div className="preview-glow" />
          <div className="preview-card">
            <div className="preview-row">
              <span className="band band-target">Реалистичный</span>
              <b className="preview-score num"><CountUp value={86} duration={1200} /></b>
            </div>
            <b>ELTE · Computer Science</b>
            <p className="muted small">Будапешт · стипендия покрывает обучение</p>
            <div className="preview-bar"><i /></div>
            <ul className="reason-list compact">
              <li className="r-plus pop" style={{ '--d': '500ms' } as React.CSSProperties}>
                <Icon name="check" size={14} /> Совпадает с интересом: IT
              </li>
              <li className="r-plus pop" style={{ '--d': '620ms' } as React.CSSProperties}>
                <Icon name="check" size={14} /> Вписывается в бюджет
              </li>
              <li className="r-minus pop" style={{ '--d': '740ms' } as React.CSSProperties}>
                <Icon name="warn" size={14} /> Нужен IELTS 5.5
              </li>
            </ul>
          </div>
          <div className="preview-next">
            <Icon name="flag" size={18} />
            <div>
              <p className="small muted">Следующий шаг</p>
              <b>Сдать пробное ЕНТ</b>
            </div>
          </div>
        </div>
      </section>

      <section className="how">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} as="article" className="how-card" delay={i * 110}>
            <span className="how-icon"><Icon name={s.icon} /></span>
            <p className="eyebrow">Шаг {i + 1}</p>
            <h3>{s.title}</h3>
            <p className="muted">{s.text}</p>
            <span className="how-line" aria-hidden />
          </Reveal>
        ))}
      </section>

      <Reveal as="section" className="honesty" variant="scale">
        <Icon name="info" />
        <p>
          <b>Честно о данных.</b> В наборе {PROGRAMS.length} программ из {COUNTRIES} стран. Стоимость и дедлайны сверены с
          официальными страницами вузов {CHECKED_ON} — у каждой программы есть кнопка на первоисточник. Баллы ЕНТ и GPA —
          ориентир, а не официальный порог: они меняются каждый год. Мы не показываем «процент поступления» и не гарантируем
          результат — только объяснимую оценку готовности.
        </p>
      </Reveal>
    </div>
  );
}

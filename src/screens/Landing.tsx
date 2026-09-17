import { Button, Icon } from '../components/ui';
import { DEMO_PROFILE } from '../data/options';
import { PROGRAMS } from '../data/programs';
import { go } from '../router';
import { useStore } from '../state/store';

const STEPS = [
  { icon: 'edit', title: 'Анкета за 3 минуты', text: 'Интересы, оценки, английский, страны и бюджет.' },
  { icon: 'spark', title: 'Подбор с объяснением', text: 'Каждый вариант — с причинами «почему подходит» и что подтянуть.' },
  { icon: 'deadline', title: 'План по месяцам', text: 'Экзамены, документы и дедлайны — и один главный шаг на сейчас.' },
];

export function Landing() {
  const { state, dispatch, derived } = useStore();

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Для учеников 9–11 классов Казахстана</p>
          <h1>
            Не список вузов, а <span className="hl">маршрут поступления</span>
          </h1>
          <p className="lead">
            UniPath разбирает ваш профиль, подбирает программы в Казахстане и за рубежом, объясняет выбор простым языком и
            превращает поступление в понятный план с ближайшим шагом.
          </p>
          <div className="hero-cta">
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
          {state.profileDone && (
            <p className="muted small">
              Прогресс плана: {derived.progress.done} из {derived.progress.total} шагов
            </p>
          )}
        </div>

        <div className="hero-preview" aria-hidden>
          <div className="preview-card">
            <div className="preview-row">
              <span className="band band-target">Реалистичный</span>
              <b className="preview-score">86</b>
            </div>
            <b>ELTE · Computer Science</b>
            <p className="muted small">Будапешт · стипендия покрывает обучение</p>
            <ul className="reason-list compact">
              <li className="r-plus"><Icon name="check" size={14} /> Совпадает с интересом: IT</li>
              <li className="r-plus"><Icon name="check" size={14} /> Вписывается в бюджет</li>
              <li className="r-minus"><Icon name="warn" size={14} /> Нужен IELTS 5.5</li>
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
          <article key={s.title} className="how-card">
            <span className="how-icon"><Icon name={s.icon} /></span>
            <p className="eyebrow">Шаг {i + 1}</p>
            <h3>{s.title}</h3>
            <p className="muted">{s.text}</p>
          </article>
        ))}
      </section>

      <section className="honesty">
        <Icon name="info" />
        <p>
          <b>Честно о данных.</b> В демо-наборе {PROGRAMS.length} программ из 10 стран. Стоимость и сроки — ориентиры прошлых
          циклов с ссылками на официальные сайты. Мы не показываем «процент поступления» и не гарантируем результат — только
          объяснимую оценку готовности.
        </p>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Тот же изгиб, что в логотипе, только длиннее — маршрут прочерчивается целиком. */
const D = 'M14 92C14 70 34 62 52 62s38-8 38-30';

export interface LoaderStep {
  /** Что реально произошло на этом шаге. Не пишем сюда того, чего не делаем. */
  label: string;
  /** Сколько держать шаг на экране, мс. */
  ms: number;
}

/**
 * Переход между этапами с фирменной отрисовкой маршрута.
 *
 * Важно: это анимация перехода, а не имитация работы. Подписи шагов описывают
 * то, что действительно происходит, и мы не показываем проценты и не изображаем
 * несуществующую загрузку данных — всё считается локально и мгновенно.
 */
export function RouteLoader({ steps, onDone }: { steps: LoaderStep[]; onDone: () => void }) {
  const [active, setActive] = useState(0);
  const done = useRef(false);

  const total = steps.reduce((sum, s) => sum + s.ms, 0);

  useEffect(() => {
    // При выключенной анимации не задерживаем пользователя ни на кадр.
    if (reduced()) {
      onDone();
      return;
    }

    const timers: number[] = [];
    let at = 0;
    steps.forEach((step, i) => {
      at += step.ms;
      if (i < steps.length - 1) timers.push(window.setTimeout(() => setActive(i + 1), at));
    });
    timers.push(
      window.setTimeout(() => {
        if (done.current) return;
        done.current = true;
        onDone();
      }, total),
    );

    return () => timers.forEach(clearTimeout);
    // steps задаются на месте вызова и в течение жизни оверлея не меняются
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced()) return null;

  // Рендерим в body: переключатель языка живёт в сайдбаре, а у него
  // position: sticky — это всегда новый stacking context, и оверлей оставался
  // запертым внутри него, размывая только колонку навигации.
  return createPortal(
    <div className="route-loader" role="status" aria-live="polite">
      <div className="route-loader-card">
        <svg className="route-loader-art" viewBox="0 0 104 104" aria-hidden>
          <path className="rl-track" d={D} />
          <path className="rl-draw" d={D} style={{ animationDuration: `${total}ms` }} />
          <circle className="rl-start" cx="14" cy="92" r="6" />
          <g className="rl-flag" style={{ animationDelay: `${Math.max(0, total - 420)}ms` }}>
            <circle cx="90" cy="32" r="7" />
          </g>
        </svg>

        <p className="route-loader-title">{steps[active]?.label}</p>

        <div className="route-loader-dots" aria-hidden>
          {steps.map((s, i) => (
            <span key={s.label} className={i <= active ? 'is-on' : undefined} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

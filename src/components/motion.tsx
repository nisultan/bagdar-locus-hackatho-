import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Показывает блок, когда он въезжает во вьюпорт. `delay` даёт лесенку внутри секции.
 * При prefers-reduced-motion блок сразу видим — анимация не запускается вовсе.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  variant = 'up',
}: {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'p';
  className?: string;
  variant?: 'up' | 'left' | 'right' | 'scale';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(() => reduced());

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;

    // Уже в кадре на момент монтирования — показываем сразу, не ждём наблюдателя.
    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };
    if (inView()) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px' },
    );
    io.observe(el);

    // Страховка: в фоновой вкладке наблюдатель может не вызваться вовсе,
    // и блок навсегда остался бы невидимым. Через 2.5 с показываем безусловно.
    const failsafe = window.setTimeout(() => {
      setShown(true);
      io.disconnect();
    }, 2500);

    return () => {
      window.clearTimeout(failsafe);
      io.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal reveal-${variant}${shown ? ' is-in' : ''}${className ? ' ' + className : ''}`}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/**
 * Лёгкий 3D-наклон за курсором. Отключается на тач-устройствах и при reduced-motion,
 * потому что там он только мешает.
 */
export function useTilt(max = 8) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !window.matchMedia('(hover: hover)').matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
        el.style.setProperty('--mx', `${((px + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${((py + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [max]);

  return ref;
}

/** Считает число вверх до `value`, когда компонент появился. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [n, setN] = useState(() => (reduced() ? value : 0));

  useEffect(() => {
    if (reduced()) return setN(value);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      // ease-out cubic — быстро стартует, мягко останавливается
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{n}</>;
}

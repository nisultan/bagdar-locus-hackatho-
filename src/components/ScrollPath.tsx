import { useEffect, useRef, useState } from 'react';

/** Извилистый маршрут в боковом поле. Тот же жест, что в логотипе: путь → стрелка. */
const D_LEFT = 'M60 0C60 70 18 96 18 168s46 92 46 164-38 92-38 160 40 88 40 148';
const D_RIGHT = 'M20 0C20 70 62 96 62 168s-46 92-46 164 38 92 38 160-40 88-40 148';

/** Доли длины пути, на которых стоят «станции» маршрута. */
const STOPS = [0.16, 0.42, 0.68, 0.92];

function useScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? window.scrollY / max : 0;
      // Небольшой стартовый отрезок: маршрут виден сразу, а не появляется из ничего.
      setP(Math.min(1, Math.max(0, raw) * 0.94 + 0.06));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return p;
}

function Rail({ side, d, progress }: { side: 'left' | 'right'; d: string; progress: number }) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [len, setLen] = useState(0);
  const [head, setHead] = useState({ x: 0, y: 0, angle: 0 });

  // Длину меряем в пикселях пути: нормализация через pathLength ломается
  // в связке с vector-effect="non-scaling-stroke" — линия рисуется пунктиром.
  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, []);

  // Ставим стрелку в точку, до которой дорисован маршрут, и разворачиваем её по касательной.
  useEffect(() => {
    const path = pathRef.current;
    if (!path || !len) return;
    const at = Math.max(0.001, progress) * len;
    const pt = path.getPointAtLength(at);
    const prev = path.getPointAtLength(Math.max(0, at - 1));
    setHead({ x: pt.x, y: pt.y, angle: (Math.atan2(pt.y - prev.y, pt.x - prev.x) * 180) / Math.PI });
  }, [progress, len]);

  return (
    <svg className={`rail rail-${side}`} viewBox="0 0 80 640" preserveAspectRatio="none" aria-hidden>
      {/* бледный «непройденный» маршрут */}
      <path d={d} className="rail-track" vectorEffect="non-scaling-stroke" />
      {/* пройденная часть — растёт вместе со скроллом */}
      <path
        ref={pathRef}
        d={d}
        className="rail-done"
        strokeDasharray={len || undefined}
        strokeDashoffset={len ? len * (1 - progress) : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {STOPS.map((s) => (
        <Stop key={s} pathRef={pathRef} at={s} passed={progress >= s} />
      ))}
      {/* голова маршрута — стрелка из логотипа */}
      <g transform={`translate(${head.x} ${head.y}) rotate(${head.angle})`} className="rail-head">
        <circle r="9" className="rail-head-halo" />
        <circle r="4.5" className="rail-head-dot" />
        <path d="M-2 -4l4 4-4 4" className="rail-head-arrow" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

function Stop({
  pathRef,
  at,
  passed,
}: {
  pathRef: React.RefObject<SVGPathElement | null>;
  at: number;
  passed: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const pt = path.getPointAtLength(at * path.getTotalLength());
    setPos({ x: pt.x, y: pt.y });
  }, [pathRef, at]);

  if (!pos) return null;
  return <circle cx={pos.x} cy={pos.y} r="3.5" className={`rail-stop${passed ? ' is-passed' : ''}`} />;
}

/**
 * Занимает пустые поля по краям экрана: маршрут дорисовывается по мере прокрутки
 * и отматывается назад при скролле вверх. Прячется на узких экранах, где полей нет,
 * и при prefers-reduced-motion.
 */
export function ScrollPath() {
  const progress = useScrollProgress();

  return (
    <div className="rails" aria-hidden>
      <Rail side="left" d={D_LEFT} progress={progress} />
      <Rail side="right" d={D_RIGHT} progress={progress} />
    </div>
  );
}

import type { ReactNode } from 'react';
import { t, type Key } from '../i18n';
import { BAND_LABELS } from '../engine/recommend';
import type { Band, TaskCategory } from '../types';

const PATHS: Record<string, string> = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 100 18 9 9 0 000-18z',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  exam: 'M4 5h16v14H4zM8 9h8M8 13h5',
  document: 'M7 3h7l5 5v13H7zM14 3v5h5',
  deadline: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  academic: 'M3 9l9-5 9 5-9 5zM7 11.5V16c3 2 7 2 10 0v-4.5',
  activity: 'M13 3L5 14h6l-1 7 8-11h-6z',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  compare: 'M8 4v16M16 4v16M4 8h4M16 16h4',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  warn: 'M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  lock: 'M7 11V8a5 5 0 0110 0v3M5 11h14v10H5z',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M6 6L4.5 4.5M19.5 19.5L18 18M18 6l1.5-1.5M4.5 19.5L6 18M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon: 'M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z',
  refresh: 'M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5',
};

export function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}

export function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
  icon?: string;
  iconRight?: string;
  disabled?: boolean;
  full?: boolean;
  small?: boolean;
  type?: 'button' | 'submit';
  pressed?: boolean;
}) {
  const { variant = 'primary' } = props;
  return (
    <button
      type={props.type ?? 'button'}
      className={`btn btn-${variant}${props.full ? ' btn-full' : ''}${props.small ? ' btn-sm' : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-pressed={props.pressed}
    >
      {props.icon && <Icon name={props.icon} size={18} />}
      <span>{props.children}</span>
      {props.iconRight && <Icon name={props.iconRight} size={18} />}
    </button>
  );
}

export function Chip(props: { selected: boolean; onClick: () => void; children: ReactNode; badge?: string }) {
  return (
    <button type="button" className={`chip${props.selected ? ' chip-on' : ''}`} aria-pressed={props.selected} onClick={props.onClick}>
      {props.selected && <Icon name="check" size={16} />}
      {props.children}
      {props.badge && <span className="chip-badge">{props.badge}</span>}
    </button>
  );
}

export function BandBadge({ band }: { band: Band }) {
  return (
    <span className={`band band-${band}`} title={BAND_LABELS[band].hint}>
      {BAND_LABELS[band].title}
    </span>
  );
}

export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }} aria-label={`Совпадение ${score} из 100`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fg"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span>{score}</span>
    </div>
  );
}

export function Meter({ value, max = 100, tone = 'primary' }: { value: number; max?: number; tone?: string }) {
  return (
    <div className="meter" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`meter-fill tone-${tone}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
    </div>
  );
}

export function EstimateNote({ children }: { children?: ReactNode }) {
  return (
    <span
      className="estimate-note"
      title={t('ui.estimateHint')}
    >
      <Icon name="info" size={14} /> {children ?? t('ui.estimate')}
    </span>
  );
}

/** Дата, на которую данные сверялись с официальными страницами. */
export const CHECKED_ON = '18.09.2026';

function domainOf(href: string) {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

/**
 * Кнопка-первоисточник. Показывает реальный домен, куда ведёт ссылка, и дату сверки —
 * чтобы цифру рядом можно было проверить, не гадая, откуда она взялась.
 */
export function SourceLink({
  href,
  label,
  strong = false,
  checked = true,
}: {
  href: string;
  label?: string;
  strong?: boolean;
  checked?: boolean;
}) {
  const text = label ?? t('ui.source');
  return (
    <a
      className={`source-btn${strong ? ' source-btn-strong' : ''}`}
      href={href}
      target="_blank"
      rel="noreferrer"
      title={t('ui.sourceOpen', { url: href })}
    >
      <span className="source-btn-icon"><Icon name="link" size={14} /></span>
      <span className="source-btn-body">
        <b>{text}</b>
        <span className="source-btn-host">{domainOf(href)}</span>
      </span>
      {checked && (
        <span className="source-btn-badge" title={t('ui.sourceChecked', { date: CHECKED_ON })}>
          <Icon name="check" size={11} /> {CHECKED_ON}
        </span>
      )}
      <span className="source-btn-go" aria-hidden><Icon name="arrow" size={14} /></span>
    </a>
  );
}

export const CATEGORY_META: Record<TaskCategory, { label: Key; icon: string }> = {
  exam: { label: 'cat.exam', icon: 'exam' },
  document: { label: 'cat.document', icon: 'document' },
  deadline: { label: 'cat.deadline', icon: 'deadline' },
  academic: { label: 'cat.academic', icon: 'academic' },
  activity: { label: 'cat.activity', icon: 'activity' },
};

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <div className="lead">{children}</div>}
    </header>
  );
}

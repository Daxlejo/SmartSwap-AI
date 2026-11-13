import { useId, useMemo, useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import { useTranslation } from '@/hooks/useTranslation';
import {
  AVATAR_PX,
  HALO_RADIUS,
  RING_CENTER,
  RING_PX,
  describeLines,
  describeRing,
  firstName,
  fromViewer,
  ringLayout,
  ringStatus,
  type Point,
  type RingAcceptance,
  type RingParticipants,
  type SwapRingVariant,
  type Translate,
} from '@/utils/swapRing';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { ItemImage } from './ui/ItemImage';

export interface SwapRingProps {
  /** Two to four people in giving order: participants[i] gives to participants[(i + 1) % n]. */
  participants: RingParticipants;
  /** The viewer: drawn at the top with a thicker teal border and "Tú", first line of the list. */
  currentUserId?: string;
  /** compact: Home and the "In progress" tab (item photos only). full: route and proposal screens (with item names). */
  variant?: SwapRingVariant;
  /** The text list under the ring. Defaults to true. */
  showList?: boolean;
  /** Shown as "Buscar otra ruta" when someone declined. */
  onFindAnotherRoute?: () => void;
  className?: string;
}

/** Item badge size in px. */
const BADGE_PX: Readonly<Record<SwapRingVariant, number>> = { full: 40, compact: 36 };
/** Width reserved for an item name under its badge (full only). */
const ITEM_LABEL_PX = 96;
/** Centre disc diameter in px. */
const DISC_PX: Readonly<Record<SwapRingVariant, number>> = { full: 120, compact: 112 };

const STROKE: Readonly<Record<RingAcceptance, string>> = {
  pending: 'rgb(var(--color-outline))',
  accepted: 'rgb(var(--color-primary))',
  rejected: 'rgb(var(--color-error))',
};

const STATUS_MARK: Readonly<Record<RingAcceptance, { icon: string; className: string }>> = {
  pending: { icon: 'schedule', className: 'bg-surface-container-highest text-on-surface' },
  accepted: { icon: 'check', className: 'bg-primary text-on-primary' },
  rejected: { icon: 'close', className: 'bg-error text-on-error' },
};

/** Viewbox units (0–100) to px, keeping a box of `box` px centred on the point inside the ring. */
const placeBox = (point: Point, ringPx: number, boxPx: number): { left: number; top: number } => {
  const clamp = (value: number) => Math.min(Math.max(value, 0), ringPx - boxPx);
  return { left: clamp((point.x / 100) * ringPx - boxPx / 2), top: clamp((point.y / 100) * ringPx - boxPx / 2) };
};

/**
 * The swap ring (docs/architecture/09-swap-ring.md): the people of a circular swap
 * on a circle, each arc carrying what one hands to the next. Arcs are dotted until
 * their giver accepts and solid after; when everyone accepts the ring closes and a
 * halo appears. If someone declines, their arc is left open and the ring offers to
 * look for another route. Under the drawing, the same cycle as plain text.
 */
export const SwapRing = ({
  participants,
  currentUserId,
  variant = 'full',
  showList = true,
  onFindAnotherRoute,
  className,
}: SwapRingProps) => {
  const { t } = useTranslation();
  const translate: Translate = (key, options) => t(key, options);
  const markerId = useId().replace(/:/g, '');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ring = useMemo(() => fromViewer(participants, currentUserId), [participants, currentUserId]);
  const layout = useMemo(() => ringLayout(ring.length, variant), [ring.length, variant]);
  const status = ringStatus(ring);
  const lines = describeLines(ring, currentUserId, translate);
  const label = describeRing(ring, currentUserId, translate);

  const ringPx = RING_PX[variant];
  const badgePx = BADGE_PX[variant];
  const discPx = DISC_PX[variant];
  const haloLength = 2 * Math.PI * HALO_RADIUS;
  const selectedIndex = ring.findIndex((p) => p.id === selectedId);

  const toggle = (id: string) => setSelectedId((current) => (current === id ? null : id));

  return (
    <figure className={clsx('flex flex-col items-center gap-4 w-full', className)}>
      <div className="relative shrink-0" style={{ width: ringPx, height: ringPx }}>
        {/* The drawing: one image for screen readers, narrated by its label */}
        <div role="img" aria-label={label} className="absolute inset-0">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
            <defs>
              {(['pending', 'accepted'] as const).map((state) => (
                <marker
                  key={state}
                  id={`${markerId}-${state}`}
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="3.2"
                  markerHeight="3.2"
                  orient="auto"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill={STROKE[state]} />
                </marker>
              ))}
            </defs>

            {status.kind === 'closed' && (
              <circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={HALO_RADIUS}
                fill="none"
                stroke="rgb(var(--color-secondary-container))"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeDasharray={haloLength}
                transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
                className="ring-halo"
                style={{ '--arc-len': haloLength } as CSSProperties}
              />
            )}

            {layout.arcs.map((arc) => {
              const acceptance = ring[arc.from].acceptance;
              // A declined arc is left out: the ring stays open where it broke
              if (acceptance === 'rejected') return null;
              const highlighted = selectedIndex === arc.from || selectedIndex === arc.to;
              return (
                <path
                  // A new key replays the drawing when the answer changes
                  key={`${arc.from}-${acceptance}`}
                  d={arc.d}
                  fill="none"
                  stroke={STROKE[acceptance]}
                  strokeWidth={highlighted ? 2.4 : 1.6}
                  strokeLinecap="round"
                  strokeDasharray={acceptance === 'accepted' ? arc.length : '2.4 2.4'}
                  markerEnd={`url(#${markerId}-${acceptance})`}
                  className={acceptance === 'accepted' ? 'ring-draw' : status.kind === 'waiting' ? 'ring-march' : undefined}
                  style={{ '--arc-len': arc.length } as CSSProperties}
                />
              );
            })}
          </svg>

          {/* Item badges at the middle of each arc */}
          {layout.arcs.map((arc) => {
            const giver = ring[arc.from];
            const showName = variant === 'full';
            const boxPx = showName ? ITEM_LABEL_PX : badgePx;
            const { left, top } = placeBox(arc.mid, ringPx, boxPx);
            return (
              <div
                key={giver.id}
                aria-hidden="true"
                className="absolute flex flex-col items-center gap-1"
                style={{ left, top: showName ? top + (boxPx - badgePx) / 2 : top, width: boxPx }}
              >
                <span
                  className={clsx(
                    'block rounded-full overflow-hidden border-2 bg-surface-container-lowest shadow-sm',
                    giver.acceptance === 'rejected' ? 'border-error' : 'border-secondary-container',
                  )}
                  style={{ width: badgePx, height: badgePx }}
                >
                  <ItemImage src={giver.gives.imageUrl} alt="" category={giver.gives.category} className="w-full h-full" />
                </span>
                {showName && (
                  <span className="px-1.5 rounded-md bg-surface/90 font-label-sm text-caption font-semibold text-on-surface text-center break-words max-w-full">
                    {giver.gives.name}
                  </span>
                )}
              </div>
            );
          })}

          {/* Centre disc: the state in one word, the number of people under it */}
          <div
            aria-hidden="true"
            className={clsx(
              'absolute rounded-full flex flex-col items-center justify-center text-center px-2 border-2',
              status.kind === 'closed' && 'ring-pop bg-primary text-on-primary border-primary',
              status.kind === 'waiting' && 'bg-surface-container-lowest text-on-surface border-surface-container-high',
              status.kind === 'broken' && 'bg-error-container text-on-error-container border-error/40',
            )}
            style={{ width: discPx, height: discPx, left: (ringPx - discPx) / 2, top: (ringPx - discPx) / 2 }}
          >
            <span className={clsx('font-bold leading-tight', variant === 'full' ? 'font-label-lg text-label-lg' : 'font-label-sm text-caption')}>
              {t(`ring.state.${status.kind}`)}
            </span>
            <span className="font-body-sm text-caption leading-tight">{t('ring.people', { count: ring.length })}</span>
          </div>
        </div>

        {/* Avatars: real buttons, outside role="img". Pressing one highlights its line in the list. */}
        {layout.nodes.map((node) => {
          const person = ring[node.index];
          const isViewer = person.id === currentUserId;
          const isSelected = selectedId === person.id;
          const { left, top } = placeBox(node.position, ringPx, AVATAR_PX);
          const mark = STATUS_MARK[person.acceptance];
          const showTag = isViewer || variant === 'full';
          return (
            <div key={person.id} className="absolute flex flex-col items-center" style={{ left, top, width: AVATAR_PX }}>
              <button
                type="button"
                onClick={() => toggle(person.id)}
                aria-pressed={isSelected}
                aria-label={t('ring.avatar', {
                  name: isViewer ? t('ring.you.label') : person.name,
                  status: t(`ring.${isViewer ? 'you' : 'person'}.${person.acceptance}`),
                  item: person.gives.name,
                })}
                className={clsx(
                  'relative w-12 h-12 rounded-full motion-safe:transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-surface',
                  isSelected && 'scale-[1.06]',
                )}
              >
                <Avatar
                  src={person.avatarUrl}
                  alt=""
                  size="lg"
                  className={clsx(
                    'rounded-full',
                    isViewer ? 'ring-4 ring-primary' : 'ring-2 ring-surface',
                  )}
                />
                <span
                  aria-hidden="true"
                  className={clsx(
                    'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-surface',
                    mark.className,
                  )}
                >
                  <Icon name={mark.icon} size="xs" />
                </span>
              </button>
              {showTag && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    '-mt-1 relative px-2 rounded-full font-label-sm text-caption font-bold whitespace-nowrap',
                    isViewer ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface',
                  )}
                >
                  {isViewer ? t('ring.you.label') : firstName(person.name)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {status.kind === 'broken' && (
        <div className="w-full flex flex-col items-center gap-3 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant">{t('ring.brokenHint')}</p>
          {onFindAnotherRoute && (
            <Button variant="primary" size="lg" leftIcon="travel_explore" onClick={onFindAnotherRoute}>
              {t('ring.findAnotherRoute')}
            </Button>
          )}
        </div>
      )}

      {showList && (
        <figcaption className="w-full">
          <ol aria-label={t('ring.listLabel')} className="flex flex-col gap-2">
            {lines.map((line) => (
              <li
                key={line.participantId}
                className={clsx(
                  'flex items-start gap-3 rounded-xl px-3 py-2 border motion-safe:transition-colors',
                  selectedId === line.participantId
                    ? 'bg-primary/10 border-primary'
                    : 'bg-surface-container-lowest border-surface-container-high',
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx('mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center', STATUS_MARK[line.acceptance].className)}
                >
                  <Icon name={STATUS_MARK[line.acceptance].icon} size="xs" />
                </span>
                <span className="flex flex-col min-w-0">
                  {line.sentences.map((sentence) => (
                    <span
                      key={sentence}
                      className={clsx('font-body-md text-body-md text-on-surface break-words', line.isViewer && 'font-semibold')}
                    >
                      {sentence}
                    </span>
                  ))}
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{line.status}</span>
                </span>
              </li>
            ))}
          </ol>
        </figcaption>
      )}
    </figure>
  );
};

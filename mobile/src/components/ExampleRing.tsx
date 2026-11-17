import { useMemo, type CSSProperties } from 'react';
import clsx from 'clsx';
import { useTranslation } from '@/hooks/useTranslation';
import { distinctAvatarColors, initialsFor } from '@/utils/avatarIdentity';
import { itemIcon } from '@/utils/categoryIcon';
import {
  EXAMPLE_BADGE_PX,
  EXAMPLE_NODE_PX,
  EXAMPLE_RING_CENTER,
  EXAMPLE_RING_HEIGHT,
  EXAMPLE_RING_WIDTH,
  exampleRingGeometry,
} from '@/utils/exampleRing';
import { Icon } from './ui/Icon';

export interface ExampleRingPerson {
  id: string;
  name: string;
  avatarUrl?: string;
  /** What this person hands to the next one, clockwise. */
  gives: { name: string; category?: string };
}

export interface ExampleRingProps {
  /** Exactly three people in giving order: people[i] gives to people[(i + 1) % 3]. */
  people: readonly [ExampleRingPerson, ExampleRingPerson, ExampleRingPerson];
  /** Shown as "Tú" instead of their name. */
  viewerId?: string;
  className?: string;
}

/** Seconds: each delivery is drawn in turn, then everyone accepts and the ring closes. */
const ARC_S = 0.55;
const CHECKS_AT_S = ARC_S * 3 + 0.15;
const CLOSE_AT_S = CHECKS_AT_S + 0.45;

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

/**
 * The swap ring explained with three people, used on first use and on Home. One
 * ring, three people at 120°, each delivery drawn as an arc on a soft track, with
 * the item it carries and an arrow toward who receives it. A short animation sends
 * each item along its arc in turn, shows everyone's check and closes the ring in
 * green; with reduced motion it simply shows the closed ring.
 */
export const ExampleRing = ({ people, viewerId, className }: ExampleRingProps) => {
  const { t } = useTranslation();
  const geometry = useMemo(() => exampleRingGeometry(), []);
  const colors = useMemo(() => distinctAvatarColors(people.map((person) => person.id)), [people]);
  const label = (person: ExampleRingPerson) =>
    person.id === viewerId ? t('ring.example.you') : person.name.split(' ')[0];

  const description = t('ring.example.aria', {
    first: label(people[0]),
    item1: people[0].gives.name,
    second: label(people[1]),
    item2: people[1].gives.name,
    third: label(people[2]),
    item3: people[2].gives.name,
  });

  return (
    <div
      role="img"
      aria-label={description}
      data-testid="example-ring"
      className={clsx('example-ring relative mx-auto shrink-0', className)}
      style={{ width: EXAMPLE_RING_WIDTH, height: EXAMPLE_RING_HEIGHT }}
    >
      <style>{`
        @keyframes exampleRingDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes exampleRingPop { 0% { opacity: 0; transform: scale(0.5); } 70% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes exampleRingFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes exampleRingTravel { from { offset-distance: 0%; opacity: 1; } to { offset-distance: 50%; opacity: 1; } }
        @keyframes exampleRingClose { from { stroke: rgb(var(--color-primary)); } to { stroke: rgb(var(--color-success)); } }
        @keyframes exampleRingCloseFill { from { fill: rgb(var(--color-primary)); } to { fill: rgb(var(--color-success)); } }
        .example-ring .er-arrow { opacity: 0; animation: exampleRingFade 0.3s ease-out forwards, exampleRingCloseFill 0.4s ease-out ${CLOSE_AT_S}s forwards; }
        .example-ring .er-arc { stroke-dasharray: 1; stroke-dashoffset: 1; animation: exampleRingDraw ${ARC_S}s ease-in-out forwards, exampleRingClose 0.4s ease-out ${CLOSE_AT_S}s forwards; }
        .example-ring .er-pop { opacity: 0; animation: exampleRingPop 0.32s ease-out forwards; }
        .example-ring .er-fade { opacity: 0; animation: exampleRingFade 0.3s ease-out forwards; }
        .example-ring .er-travel { opacity: 0; animation: exampleRingFade 0.3s ease-out forwards; }
        /* With motion paths the item travels along its arc; without them it appears in the middle */
        @supports (offset-path: path('M 0 0')) {
          .example-ring .er-travel { left: 0 !important; top: 0 !important; transform: none; offset-rotate: 0deg; offset-anchor: 50% 50%; offset-distance: 50%; animation: exampleRingTravel ${ARC_S}s ease-in-out forwards; }
        }
        /* Last, so it wins over the motion-path rule above */
        @media (prefers-reduced-motion: reduce) {
          .example-ring .er-arc { animation: none; stroke-dashoffset: 0; stroke: rgb(var(--color-success)); }
          .example-ring .er-pop, .example-ring .er-fade, .example-ring .er-travel, .example-ring .er-arrow { animation: none; opacity: 1; }
          .example-ring .er-arrow { fill: rgb(var(--color-success)); }
          .example-ring .er-travel { offset-distance: 50%; }
        }
      `}</style>

      <svg
        className="absolute inset-0"
        width={EXAMPLE_RING_WIDTH}
        height={EXAMPLE_RING_HEIGHT}
        viewBox={`0 0 ${EXAMPLE_RING_WIDTH} ${EXAMPLE_RING_HEIGHT}`}
        aria-hidden="true"
      >
        {geometry.arcs.map((arc, index) => (
          <g key={arc.path}>
            <path d={arc.path} fill="none" stroke="rgb(var(--color-primary) / 0.14)" strokeWidth={16} strokeLinecap="round" />
            <path
              d={arc.path}
              pathLength={1}
              fill="none"
              stroke="rgb(var(--color-primary))"
              strokeWidth={4}
              strokeLinecap="round"
              className="er-arc"
              style={{ animationDelay: `${index * ARC_S}s, ${CLOSE_AT_S}s` }}
            />
            <path
              d="M -7 -6 L 4 0 L -7 6 Z"
              transform={`translate(${arc.arrow.x} ${arc.arrow.y}) rotate(${arc.arrow.rotation})`}
              fill="rgb(var(--color-primary))"
              className="er-arrow"
              style={{ animationDelay: `${(index + 1) * ARC_S - 0.1}s, ${CLOSE_AT_S}s` }}
            />
          </g>
        ))}
      </svg>

      {/* What each person gives, on its arc */}
      {geometry.arcs.map((arc, index) => {
        const giver = people[index];
        return (
          <span
            key={`badge-${giver.id}`}
            data-testid="example-ring-item"
            className="absolute -translate-x-1/2 -translate-y-1/2 er-travel"
            style={
              {
                left: arc.badge.x,
                top: arc.badge.y,
                offsetPath: `path('${arc.path}')`,
                ...delay(index * ARC_S),
              } as CSSProperties
            }
          >
            <span
              className="flex items-center justify-center rounded-full bg-secondary-container text-[#4a1d00] shadow-sm ring-2 ring-surface"
              style={{ width: EXAMPLE_BADGE_PX, height: EXAMPLE_BADGE_PX }}
            >
              <Icon name={itemIcon(giver.gives.name, giver.gives.category)} size="md" />
            </span>
          </span>
        );
      })}

      {/* People: initials (or photo) with the name underneath, and their check */}
      {people.map((person, index) => {
        const node = geometry.nodes[index];
        return (
          <div
            key={person.id}
            className="absolute flex flex-col items-center"
            style={{ left: node.x, top: node.y - EXAMPLE_NODE_PX / 2, transform: 'translateX(-50%)' }}
          >
            <span className="relative block" style={{ width: EXAMPLE_NODE_PX, height: EXAMPLE_NODE_PX }}>
              {person.avatarUrl ? (
                <img
                  src={person.avatarUrl}
                  alt=""
                  className="w-full h-full rounded-full object-cover ring-2 ring-surface"
                />
              ) : (
                <span
                  className="w-full h-full rounded-full flex items-center justify-center text-white font-headline-sm text-headline-sm font-bold ring-2 ring-surface"
                  style={{ backgroundColor: colors[index] }}
                >
                  {initialsFor(person.name)}
                </span>
              )}
              <span
                className="absolute -right-3.5 -bottom-0.5 w-5 h-5 rounded-full bg-success text-on-success flex items-center justify-center ring-2 ring-surface er-pop"
                style={delay(CHECKS_AT_S + index * 0.12)}
              >
                <Icon name="check" size="xs" />
              </span>
            </span>
            <span className="mt-1 font-label-lg text-label-lg font-bold text-on-surface whitespace-nowrap">
              {label(person)}
            </span>
          </div>
        );
      })}

      {/* One short line in the middle, no filled disc */}
      <p
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-body-sm text-body-sm font-semibold text-on-surface-variant er-fade"
        style={{ left: EXAMPLE_RING_CENTER.x, top: EXAMPLE_RING_CENTER.y + 4, ...delay(CLOSE_AT_S) }}
      >
        {t('ring.example.center')}
      </p>
    </div>
  );
};

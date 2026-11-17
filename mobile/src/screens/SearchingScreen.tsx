import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { SwapRoute } from '@/types';
import { useApp } from '@/context/AppContext';
import { useItem } from '@/hooks/useItem';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import {
  CIRCULAR_MAX_STEPS,
  CIRCULAR_MIN_STEPS,
  VALUE_TOLERANCE_PCT,
  type DirectProposalDraft,
} from '@/utils/swapSearch';

const MESSAGE_KEYS = ['inventories', 'crossMatches', 'optimalRoutes', 'values'] as const;
const MESSAGE_INTERVAL_MS = 900;

// Anonymous pulses travelling the orbit while the engine searches.
const ORBIT_DOTS = 4;

type SearchOutcome =
  | { status: 'pending' }
  | { status: 'done'; routes: SwapRoute[] }
  | { status: 'failed' };

/** Back one step inside the app, or to Home when the screen was opened directly. */
const useGoBack = () => {
  const navigate = useNavigate();
  return () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate('/home', { replace: true });
  };
};

/**
 * "Searching": calls the ring engine once and waits for the user. It never moves on by
 * itself. With rings it offers "See N routes"; without them, an empty state with
 * "Propose a direct swap" and "Back". Whatever comes next replaces this screen in the
 * history, so going back from the results lands on step 3 and never searches again.
 */
export const SearchingScreen: React.FC = () => {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const { t } = useTranslation();
  const { searchRoutesReal } = useApp();
  const [searchParams] = useSearchParams();

  const haveId = searchParams.get('have') ?? '';
  const wantId = searchParams.get('want') ?? '';
  const objectiveText = searchParams.get('q') ?? '';
  const minSteps = Number(searchParams.get('minSteps')) || CIRCULAR_MIN_STEPS;
  const maxSteps = Number(searchParams.get('maxSteps')) || CIRCULAR_MAX_STEPS;
  const valueTolerancePct = Number(searchParams.get('tolerance')) || VALUE_TOLERANCE_PCT;
  const hasSearchParams = haveId !== '' && wantId !== '' && objectiveText !== '';

  const { item: offeredItem } = useItem(haveId || undefined);
  const { item: wantedItem } = useItem(wantId || undefined);

  const [outcome, setOutcome] = useState<SearchOutcome>({ status: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasSearchParams) return;
    let active = true;
    setOutcome({ status: 'pending' });
    searchRoutesReal({
      offeredItemId: haveId,
      wantedItemId: wantId,
      objectiveText,
      minSteps,
      maxSteps,
      valueTolerancePct,
    })
      .then((routes) => {
        if (active) setOutcome({ status: 'done', routes });
      })
      .catch((error: unknown) => {
        console.error('Route search failed', error);
        if (active) setOutcome({ status: 'failed' });
      });
    return () => {
      active = false;
    };
  }, [hasSearchParams, haveId, wantId, objectiveText, minSteps, maxSteps, valueTolerancePct, searchRoutesReal, attempt]);

  // Rotating hint while the engine works
  useEffect(() => {
    if (outcome.status !== 'pending') return;
    const timer = setInterval(
      () => setMessageIndex((index) => (index + 1) % MESSAGE_KEYS.length),
      MESSAGE_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [outcome.status]);

  // The answer takes focus so screen readers announce it
  useEffect(() => {
    if (outcome.status !== 'pending') resultRef.current?.focus();
  }, [outcome.status]);

  if (!hasSearchParams) {
    return <Navigate to="/swap/configure" replace />;
  }

  const routes = outcome.status === 'done' ? outcome.routes : [];
  const found = routes.length > 0;
  const finishedEmpty = outcome.status === 'done' && !found;

  const openResults = () => {
    const query = new URLSearchParams({
      have: haveId,
      want: wantId,
      q: objectiveText,
      minSteps: String(minSteps),
      maxSteps: String(maxSteps),
      tolerance: String(valueTolerancePct),
    }).toString();
    navigate(`/swap/results?${query}`, {
      replace: true,
      state: { routes, searchCompleted: true },
    });
  };

  const proposeDirect = () => {
    if (!offeredItem || !wantedItem) return;
    const direct: DirectProposalDraft = { offeredItem, wantedItem };
    navigate('/swap/proposal/confirm', { replace: true, state: { direct } });
  };

  return (
    <div className="flex flex-col items-center flex-1 w-full px-margin pt-6 pb-4 text-center gap-6">
      <style>{`
        @keyframes searchingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes searchingRipple { 0% { opacity: 0.7; transform: scale(0.55); } 100% { opacity: 0; transform: scale(1.25); } }
        .searching-orbit { animation: searchingSpin 6s linear infinite; }
        .searching-ripple { animation: searchingRipple 2.4s ease-out infinite; }
        .searching-ripple-delayed { animation-delay: 1.2s; }
        @media (prefers-reduced-motion: reduce) {
          .searching-orbit, .searching-ripple { animation: none; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-1.5">
        <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          {outcome.status === 'pending'
            ? t('searching.title')
            : found
              ? t('searching.foundTitle', { count: routes.length })
              : finishedEmpty
                ? t('searching.emptyTitle')
                : t('searching.failedTitle')}
        </h1>
        {wantedItem && (
          <p className="font-body-md text-body-md text-on-surface-variant max-w-[300px]">
            {t('searching.subtitle', { name: wantedItem.name })}
          </p>
        )}
      </div>

      {/* Neutral animation: an orbit with anonymous pulses, no people, names or prices */}
      <div className="relative w-[220px] h-[220px] flex items-center justify-center shrink-0" aria-hidden="true">
        {outcome.status === 'pending' && (
          <>
            <span className="absolute inset-6 rounded-full border-2 border-primary/20 searching-ripple" />
            <span className="absolute inset-6 rounded-full border-2 border-primary/20 searching-ripple searching-ripple-delayed" />
          </>
        )}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 220">
          <circle
            cx="110"
            cy="110"
            r="88"
            fill="none"
            stroke={found ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary))'}
            strokeOpacity={outcome.status === 'pending' ? 0.25 : 0.7}
            strokeWidth="3"
            strokeDasharray={outcome.status === 'pending' ? '8 6' : undefined}
          />
        </svg>
        {outcome.status === 'pending' && (
          <div className="absolute inset-0 searching-orbit">
            {Array.from({ length: ORBIT_DOTS }, (_, idx) => (
              <span
                key={idx}
                className="absolute left-1/2 top-1/2 w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full bg-secondary-container shadow-xs"
                style={{ transform: `rotate(${(360 / ORBIT_DOTS) * idx}deg) translateY(-88px)` }}
              />
            ))}
          </div>
        )}
        <div
          className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-md ${
            found
              ? 'bg-success text-on-success'
              : outcome.status === 'pending'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <Icon
            name={found ? 'check' : outcome.status === 'pending' ? 'cycle' : finishedEmpty ? 'search_off' : 'cloud_off'}
            size="lg"
            className={outcome.status === 'pending' ? 'searching-orbit' : undefined}
          />
        </div>
      </div>

      <div
        ref={resultRef}
        tabIndex={-1}
        aria-live="polite"
        className="w-full max-w-sm flex flex-col items-center gap-3 focus:outline-none"
      >
        {outcome.status === 'pending' ? (
          <p className="font-body-md text-body-md text-on-surface-variant min-h-12">
            {t(`searching.messages.${MESSAGE_KEYS[messageIndex]}`)}
          </p>
        ) : found ? (
          <>
            <p className="font-body-md text-body-md text-on-surface-variant">{t('searching.foundHint')}</p>
            <Button data-testid="searching-view-routes" variant="primary" size="lg" fullWidth rightIcon="arrow_forward" onClick={openResults}>
              {t('searching.viewRoutes', { count: routes.length })}
            </Button>
          </>
        ) : finishedEmpty ? (
          <>
            <p className="font-body-md text-body-md text-on-surface-variant">{t('searching.emptyHint')}</p>
            <Button
              data-testid="searching-propose-direct"
              variant="primary"
              size="lg"
              fullWidth
              rightIcon="send"
              disabled={!offeredItem || !wantedItem}
              onClick={proposeDirect}
            >
              {t('searching.proposeDirect')}
            </Button>
            <Button data-testid="searching-back" variant="outline" size="lg" fullWidth leftIcon="arrow_back" onClick={goBack}>
              {t('searching.back')}
            </Button>
          </>
        ) : (
          <>
            <p role="alert" className="font-body-md text-body-md text-on-surface-variant">
              {t('searching.failedHint')}
            </p>
            <Button variant="primary" size="lg" fullWidth leftIcon="refresh" onClick={() => setAttempt((value) => value + 1)}>
              {t('states.retry')}
            </Button>
            <Button variant="outline" size="lg" fullWidth leftIcon="arrow_back" onClick={goBack}>
              {t('searching.back')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

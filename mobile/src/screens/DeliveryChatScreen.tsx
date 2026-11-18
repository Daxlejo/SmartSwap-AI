import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useHandoff } from '@/hooks/useHandoff';
import { useTranslation } from '@/hooks/useTranslation';
import { ApiError } from '@/services/http/apiClient';
import { handoffService, MAX_MESSAGE_LENGTH } from '@/services/routes/handoff.service';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import {
  formatDay,
  formatMeetingDate,
  formatMessageTime,
  isChatOpen,
  meetingState,
  toLocalInputValue,
} from '@/utils/deliveryChat';
import { firstName } from '@/utils/swapRing';

/**
 * Delivery chat of a confirmed swap: a fixed safety notice, the date and place everyone
 * confirms, and a text-only thread (polled every 5 s while open).
 */
export const DeliveryChatScreen: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const { currentUser } = useApp();
  const { t, language } = useTranslation();
  const { handoff, status, refresh, setHandoff } = useHandoff(routeId);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [meetingAt, setMeetingAt] = useState('');
  const [meetingPlace, setMeetingPlace] = useState('');
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messageCount = handoff?.messages.length ?? 0;

  // New messages scroll into view
  useEffect(() => {
    if (messageCount > 0) endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messageCount]);

  const describeError = (error: unknown): string =>
    error instanceof ApiError && error.message ? error.message : t('deliveryChat.actionFailed');

  if (!handoff) {
    return (
      <div className="px-margin py-6">
        {status === 'error' ? (
          <ErrorState onRetry={() => void refresh()} />
        ) : (
          <div className="h-48 rounded-2xl bg-surface-container-low animate-pulse" aria-busy="true" />
        )}
      </div>
    );
  }

  const open = isChatOpen(handoff);
  const meeting = handoff.meeting;
  const state = meetingState(handoff, currentUser?.id);
  const showMeetingForm = open && (state === 'none' || isEditingMeeting);
  const confirmedCount = handoff.participants.filter((p) => p.meetingConfirmed).length;
  const nameOf = (userId: string | null) => {
    if (userId && userId === currentUser?.id) return t('routeDetail.you');
    const person = handoff.participants.find((p) => p.userId === userId);
    return person ? firstName(person.name) : '—';
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !routeId || isSending) return;
    setIsSending(true);
    setActionError(null);
    try {
      setHandoff(await handoffService.sendMessage(routeId, body));
      setDraft('');
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setIsSending(false);
    }
  };

  const openMeetingForm = () => {
    setMeetingAt(meeting ? toLocalInputValue(new Date(meeting.at)) : '');
    setMeetingPlace(meeting?.place ?? '');
    setIsEditingMeeting(true);
  };

  const handleProposeMeeting = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!routeId || isSavingMeeting) return;
    if (!meetingAt || meetingPlace.trim().length < 3) {
      setActionError(t('deliveryChat.meetingIncomplete'));
      return;
    }
    setIsSavingMeeting(true);
    setActionError(null);
    try {
      setHandoff(await handoffService.proposeMeeting(routeId, new Date(meetingAt).toISOString(), meetingPlace.trim()));
      setIsEditingMeeting(false);
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const handleConfirmMeeting = async () => {
    if (!routeId || isSavingMeeting) return;
    setIsSavingMeeting(true);
    setActionError(null);
    try {
      setHandoff(await handoffService.confirmMeeting(routeId));
    } catch (error) {
      setActionError(describeError(error));
    } finally {
      setIsSavingMeeting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-surface">
      {/* Fixed safety notice, always visible under the top bar */}
      <div
        role="note"
        data-testid="delivery-disclaimer"
        className="sticky top-[calc(var(--topbar-h)+env(safe-area-inset-top,0px))] z-30 px-margin py-2.5 bg-warning-container text-on-warning-container border-b border-warning/30 flex items-start gap-2"
      >
        <Icon name="shield" size="sm" className="shrink-0 mt-0.5" />
        <p className="font-body-sm text-body-sm">{t('deliveryChat.disclaimer')}</p>
      </div>

      <div className="flex flex-col gap-4 px-margin pt-4 pb-4 flex-1">
        {/* Date and place */}
        <section
          aria-labelledby="meeting-title"
          className="rounded-2xl border border-surface-container-high bg-surface-container-lowest p-space-md flex flex-col gap-3"
        >
          <h2 id="meeting-title" className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
            <Icon name="event" size="sm" className="text-primary" />
            {t('deliveryChat.meetingTitle')}
          </h2>

          {meeting && !isEditingMeeting && (
            <div className="flex flex-col gap-1" data-testid="meeting-summary">
              <p className="font-label-lg text-label-lg text-on-surface break-words">
                {formatMeetingDate(meeting.at, language)}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant break-words">{meeting.place}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {state === 'agreed'
                  ? t('deliveryChat.meetingAgreed')
                  : t('deliveryChat.meetingProposedBy', {
                      name: nameOf(meeting.proposedById),
                      done: confirmedCount,
                      total: handoff.participants.length,
                    })}
              </p>
            </div>
          )}

          {handoff.autoCompleteAt && (
            <p
              data-testid="auto-complete-date"
              className="p-2.5 rounded-xl bg-primary/10 text-primary font-label-md text-label-md font-bold flex items-center gap-2"
            >
              <Icon name="event_available" size="sm" />
              {t('deliveryChat.autoComplete', { date: formatDay(handoff.autoCompleteAt, language) })}
            </p>
          )}

          {showMeetingForm ? (
            <form onSubmit={handleProposeMeeting} className="flex flex-col gap-3" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="meeting-at" className="font-label-md text-label-md text-on-surface font-bold">
                  {t('deliveryChat.meetingDate')}
                </label>
                <input
                  id="meeting-at"
                  type="datetime-local"
                  value={meetingAt}
                  min={toLocalInputValue(new Date())}
                  onChange={(e) => setMeetingAt(e.target.value)}
                  className="w-full min-h-12 px-3.5 bg-surface-container-low text-on-surface rounded-2xl font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <Input
                id="meeting-place"
                label={t('deliveryChat.meetingPlace')}
                placeholder={t('deliveryChat.meetingPlaceHint')}
                value={meetingPlace}
                maxLength={160}
                onChange={(e) => setMeetingPlace(e.target.value)}
              />
              <div className="flex gap-2">
                {isEditingMeeting && meeting && (
                  <Button type="button" variant="ghost" size="md" fullWidth onClick={() => setIsEditingMeeting(false)}>
                    {t('deliveryChat.cancelEdit')}
                  </Button>
                )}
                <Button type="submit" variant="primary" size="md" fullWidth isLoading={isSavingMeeting}>
                  {t('deliveryChat.proposeMeeting')}
                </Button>
              </div>
            </form>
          ) : (
            open && (
              <div className="flex flex-col gap-2">
                {state === 'awaitingMe' && (
                  <Button variant="primary" size="md" fullWidth leftIcon="check" isLoading={isSavingMeeting} onClick={handleConfirmMeeting}>
                    {t('deliveryChat.confirmMeeting')}
                  </Button>
                )}
                <Button variant="ghost" size="md" fullWidth leftIcon="edit_calendar" onClick={openMeetingForm}>
                  {t('deliveryChat.changeMeeting')}
                </Button>
              </div>
            )
          )}
        </section>

        {actionError && (
          <div role="alert" className="p-3 rounded-xl bg-error-container/40 text-on-error-container font-body-sm text-body-sm">
            {actionError}
          </div>
        )}

        {!open && (
          <p className="p-3 rounded-xl bg-surface-container text-on-surface-variant font-body-sm text-body-sm">
            {t('deliveryChat.closed')}
          </p>
        )}

        {/* Messages */}
        <section aria-label={t('deliveryChat.messagesAria')} aria-live="polite" className="flex flex-col gap-2">
          {handoff.messages.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-4">
              {t('deliveryChat.empty')}
            </p>
          ) : (
            handoff.messages.map((message) => {
              const mine = message.senderId === currentUser?.id;
              return (
                <div
                  key={message.id}
                  data-testid="chat-message"
                  className={`max-w-[85%] flex flex-col gap-0.5 ${mine ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  {!mine && (
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{firstName(message.senderName)}</span>
                  )}
                  <p
                    className={`px-3 py-2 rounded-2xl font-body-md text-body-md whitespace-pre-wrap break-words ${
                      mine ? 'bg-primary text-on-primary rounded-br-md' : 'bg-surface-container-high text-on-surface rounded-bl-md'
                    }`}
                  >
                    {message.body}
                  </p>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {formatMessageTime(message.createdAt, language)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </section>
      </div>

      {open && (
        <form
          onSubmit={handleSend}
          className="sticky bottom-0 px-margin pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-surface border-t border-surface-container-high flex items-end gap-2 z-30"
        >
          <div className="flex-1 flex flex-col gap-0.5">
            <label htmlFor="chat-draft" className="sr-only">
              {t('deliveryChat.messageLabel')}
            </label>
            <textarea
              id="chat-draft"
              rows={2}
              maxLength={MAX_MESSAGE_LENGTH}
              value={draft}
              placeholder={t('deliveryChat.messagePlaceholder')}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              className="w-full p-3 bg-surface-container-low text-on-surface rounded-2xl font-body-md text-body-md resize-none placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="self-end font-label-sm text-label-sm text-on-surface-variant" aria-live="polite">
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="icon"
            aria-label={t('deliveryChat.send')}
            disabled={!draft.trim()}
            isLoading={isSending}
            className="mb-6"
          >
            <Icon name="send" size="sm" />
          </Button>
        </form>
      )}
    </div>
  );
};

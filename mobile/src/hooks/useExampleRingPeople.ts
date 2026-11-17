import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { ExampleRingPerson } from '@/components/ExampleRing';

/** The three people of the example ring: the viewer, Camilo and Laura, with what each gives. */
export const useExampleRingPeople = (): readonly [ExampleRingPerson, ExampleRingPerson, ExampleRingPerson] => {
  const { currentUser } = useApp();
  const { t } = useTranslation();
  return useMemo(
    () =>
      [
        {
          id: currentUser?.id ?? 'example-you',
          name: currentUser?.name ?? t('onboarding.ring.you'),
          avatarUrl: currentUser?.avatarUrl,
          gives: { name: t('onboarding.ring.item1'), category: 'Deportes' },
        },
        { id: 'example-camilo', name: 'Camilo', gives: { name: t('onboarding.ring.item2'), category: 'Música' } },
        { id: 'example-laura', name: 'Laura', gives: { name: t('onboarding.ring.item3'), category: 'Hogar' } },
      ] as const,
    [currentUser?.id, currentUser?.name, currentUser?.avatarUrl, t],
  );
};

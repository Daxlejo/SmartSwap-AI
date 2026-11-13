import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { SwapRoute } from '@/types';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';

interface ProposalSentContentProps {
  route: SwapRoute;
}

const ProposalSentContent: React.FC<ProposalSentContentProps> = ({ route }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [animateCheck, setAnimateCheck] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setAnimateCheck(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-between flex-1 bg-surface px-margin pt-8 text-center space-y-6">
      {/* Top Celebration & Title */}
      <div className="flex flex-col items-center space-y-4 w-full">
        {/* Large Checkmark Circle in Primary Color with Scale-in Animation */}
        <div
          className={`w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg ring-8 ring-primary-fixed/50 transition-transform duration-500 ease-out ${
            animateCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          <Icon name="check" size="xl" />
        </div>

        <div className="space-y-1.5 max-w-xs">
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {t('proposalSent.title')}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t('proposalSent.description', { count: Math.max(1, route.participants.length - 1) })}
          </p>
        </div>
      </div>

      {/* Bottom Navigation Actions */}
      <div className="w-full flex flex-col gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon="sync_alt"
          onClick={() => navigate('/swaps')}
        >
          {t('proposalSent.viewSwaps')}
        </Button>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          leftIcon="home"
          onClick={() => navigate('/home')}
        >
          {t('proposalSent.backHome')}
        </Button>
      </div>
    </div>
  );
};

/** The route to confirm travels in the navigation state; without it there is nothing to show. */
export const ProposalSentScreen: React.FC = () => {
  const location = useLocation();
  const route = location.state?.route as SwapRoute | undefined;
  if (!route || route.chainItems.length < 2) {
    return <Navigate to="/swaps" replace />;
  }
  return <ProposalSentContent route={route} />;
};

import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from './ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import { useApp } from '@/context/AppContext';

interface TabProps {
  to: string;
  icon: string;
  label: string;
  badge?: number;
}

/**
 * Each column is as wide as its label at least (`flex-auto`, min-content) and the
 * free space is shared, so with the system font at 130 % the labels sit side by
 * side instead of running into each other ("ExplorarPublicar").
 */
const columnClass =
  'flex-auto basis-0 min-w-fit flex flex-col items-center justify-center px-0.5 min-h-[44px] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

const Tab = ({ to, icon, label, badge = 0 }: TabProps) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      clsx(
        columnClass,
        isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface font-medium',
      )
    }
  >
    {({ isActive }) => (
      <>
        <span className="relative flex items-center justify-center">
          <Icon name={icon} size="lg" filled={isActive} />
          {badge > 0 && (
            <span className="absolute -top-1.5 -right-3 min-w-[22px] h-[22px] px-1 rounded-full bg-error text-on-error font-label-sm text-caption leading-none font-bold shadow-xs flex items-center justify-center">
              {badge}
            </span>
          )}
        </span>
        <span className="font-label-sm text-label-sm leading-tight mt-0.5 whitespace-nowrap">{label}</span>
      </>
    )}
  </NavLink>
);

export const BottomNav = () => {
  const { t } = useTranslation();
  const { routes, currentUser } = useApp();
  // Proposals from other people still waiting for this user's answer
  const pendingResponses = routes.filter(
    (route) =>
      route.initiatorId !== currentUser?.id &&
      ['ACTIVE', 'PROPOSED'].includes((route.status || '').toUpperCase()) &&
      route.steps?.some((step) => step.userId === currentUser?.id && step.acceptance === 'PENDING'),
  ).length;

  return (
    <nav
      aria-label={t('nav.mainNavigation')}
      className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-surface border-t border-surface-container-high shadow-[0_-4px_20px_rgba(15,23,42,0.05)] max-w-[390px] mx-auto"
    >
      <div className="flex items-stretch gap-0.5 min-h-20 py-1 px-1 max-w-md mx-auto">
        <Tab to="/home" icon="home" label={t('nav.home')} />
        <Tab to="/explore" icon="explore" label={t('nav.explore')} />

        {/* Publish: the circle rises above the bar; the label stays in the row and takes its own room */}
        <NavLink
          to="/publish"
          aria-label={t('nav.publishItem')}
          className={clsx(columnClass, 'group justify-end -mt-4 text-on-surface-variant')}
        >
          <span className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg group-hover:scale-105 group-active:scale-95 transition-transform">
            <Icon name="add" size="xl" />
          </span>
          <span className="font-label-sm text-label-sm leading-tight mt-0.5 font-bold whitespace-nowrap group-hover:text-primary transition-colors">
            {t('nav.publish')}
          </span>
        </NavLink>

        <Tab to="/swaps" icon="sync_alt" label={t('nav.swaps')} badge={pendingResponses} />
        <Tab to="/profile" icon="person" label={t('nav.profile')} />
      </div>
    </nav>
  );
};

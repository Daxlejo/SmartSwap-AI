import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { ServerStatusBanner } from '@/components/ServerStatusBanner';
import { useTranslation } from '@/hooks/useTranslation';

export const AppLayout = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const pathname = location.pathname;

  // Determine header configuration based on route
  const getHeaderProps = () => {
    if (pathname.startsWith('/swap/route/')) {
      return { title: t('headers.routeDetail.title'), showBack: true };
    }

    switch (pathname) {
      case '/home':
        return { showNotifications: true, showProfile: true, showThemeToggle: true };
      case '/explore':
        return { title: t('headers.explore.title'), showBack: true };
      case '/publish':
        return { title: t('headers.publish.title'), showBack: true };
      case '/swaps':
      case '/trades':
        return { title: t('headers.swaps.title'), showBack: true };
      case '/profile':
        return {
          title: t('headers.profile.title'),
          showBack: true,
          showProfile: false,
        };
      case '/swap/configure':
        return { title: t('headers.configure.title'), showBack: true };
      case '/swap/searching':
        return { title: t('headers.searching.title'), showBack: true };
      case '/swap/results':
        return { title: t('headers.results.title'), showBack: true };
      case '/swap/proposal/confirm':
      case '/swap/confirm':
        return { title: t('headers.confirm.title'), showBack: true };
      case '/swap/proposal/sent':
      case '/swap/sent':
        return { title: t('headers.sent.title'), showBack: true };
      case '/notifications':
        return { title: t('headers.notifications.title'), showBack: true, showNotifications: false };
      default:
        return { showNotifications: true, showProfile: true };
    }
  };

  const isSwapFlow = pathname.startsWith('/swap');
  // Screens that pin their own primary action to the bottom of the viewport. They hide the
  // BottomNav so the two bars never stack; pb-action-bar keeps the last field above the action.
  const hasActionBar = pathname === '/publish' || pathname === '/swap/configure';
  const showBottomNav = !isSwapFlow && !hasActionBar;
  const headerProps = getHeaderProps();

  // The document is the only scroll container (see `index.css`). The bottom padding keeps
  // the end of every screen above the BottomNav, its floating Publish button or the action bar.
  const bottomSpace = showBottomNav ? 'pb-nav' : hasActionBar ? 'pb-action-bar' : 'pb-flow';

  return (
    <div className="min-h-[100dvh] w-full bg-surface sm:bg-surface-container-low flex justify-center">
      <div className="w-full max-w-[390px] min-h-[100dvh] bg-surface flex flex-col sm:shadow-2xl sm:ring-1 sm:ring-surface-container-high/20 relative overflow-x-clip">
        <TopBar {...headerProps} />
        <ServerStatusBanner />
        <main className={`flex-1 flex flex-col w-full ${bottomSpace}`}>
          <Outlet />
        </main>
        {showBottomNav && <BottomNav />}
      </div>
      <ScrollRestoration />
    </div>
  );
};

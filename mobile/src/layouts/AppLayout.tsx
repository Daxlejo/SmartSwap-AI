import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ScrollManager } from './ScrollManager';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { ServerStatusBanner } from '@/components/ServerStatusBanner';
import { useTranslation } from '@/hooks/useTranslation';
import { isFlowEnd, isMainTab } from './navigation';
import { isDeliveryChatPath } from '@/utils/deliveryChat';

export const AppLayout = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Title of the secondary screens; they keep the fixed bar with the back arrow
  const getTitle = (): string => {
    if (isDeliveryChatPath(pathname)) return t('headers.deliveryChat.title');
    if (pathname.startsWith('/swap/route/')) return t('headers.routeDetail.title');
    if (pathname.startsWith('/item/')) return t('headers.itemDetail.title');
    switch (pathname) {
      case '/publish':
        return t('headers.publish.title');
      case '/swap/configure':
        return t('headers.configure.title');
      case '/swap/searching':
        return t('headers.searching.title');
      case '/swap/results':
        return t('headers.results.title');
      case '/swap/proposal/confirm':
        return t('headers.confirm.title');
      case '/swap/proposal/sent':
        return t('headers.sent.title');
      case '/notifications':
        return t('headers.notifications.title');
      default:
        return '';
    }
  };

  // The four main tabs show their title inside the content (ScreenHeader) and the
  // BottomNav; every other screen gets the TopBar with the back arrow instead.
  const isTab = isMainTab(pathname);
  // Screens with their own action bar (sticky at the bottom of the flow, so it needs no
  // reserved space and handles the safe area itself)
  const hasActionBar =
    pathname === '/publish' ||
    pathname === '/swap/configure' ||
    pathname.startsWith('/item/') ||
    isDeliveryChatPath(pathname);
  const showBottomNav = isTab;

  // The document is the only scroll container (see `index.css`). The bottom padding keeps
  // the end of every screen above the fixed BottomNav and its floating Publish button.
  const bottomSpace = showBottomNav ? 'pb-nav' : hasActionBar ? '' : 'pb-flow';

  return (
    <div className="min-h-[100dvh] w-full bg-surface sm:bg-surface-container-low flex justify-center">
      <div className="w-full max-w-[390px] min-h-[100dvh] bg-surface flex flex-col sm:shadow-2xl sm:ring-1 sm:ring-surface-container-high/20 relative overflow-x-clip">
        {!isTab && (
          <TopBar
            title={getTitle()}
            onBack={isFlowEnd(pathname) ? () => navigate('/home', { replace: true }) : undefined}
          />
        )}
        <ServerStatusBanner />
        <main className={`flex-1 flex flex-col w-full ${isTab ? 'pt-safe' : ''} ${bottomSpace}`}>
          <Outlet />
        </main>
        {showBottomNav && <BottomNav />}
      </div>
      <ScrollManager />
    </div>
  );
};

import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

export const AppLayout = () => {
  const location = useLocation();
  const { currentUser } = useApp();
  const { t } = useTranslation();
  const pathname = location.pathname;

  // Determine header configuration based on route
  const getHeaderProps = () => {
    if (pathname.startsWith('/swap/route/')) {
      return { title: t('headers.routeDetail.title'), subtitle: t('headers.routeDetail.subtitle'), showBack: true };
    }

    switch (pathname) {
      case '/home':
        return { showNotifications: true, showProfile: true };
      case '/explore':
        return { title: t('headers.explore.title'), subtitle: t('headers.explore.subtitle'), showBack: true };
      case '/publish':
        return { title: t('headers.publish.title'), subtitle: t('headers.publish.subtitle'), showBack: true };
      case '/swaps':
      case '/trades':
        return { title: t('headers.swaps.title'), subtitle: t('headers.swaps.subtitle'), showBack: true };
      case '/profile':
        return {
          title: t('headers.profile.title'),
          subtitle: currentUser?.name || 'Alex Morales',
          showBack: true,
          showProfile: false,
        };
      case '/swap/configure':
        return { title: t('headers.configure.title'), subtitle: t('headers.configure.subtitle'), showBack: true };
      case '/swap/searching':
        return { title: t('headers.searching.title'), subtitle: t('headers.searching.subtitle'), showBack: true };
      case '/swap/results':
        return { title: t('headers.results.title'), subtitle: t('headers.results.subtitle'), showBack: true };
      case '/swap/proposal/confirm':
      case '/swap/confirm':
        return { title: t('headers.confirm.title'), subtitle: t('headers.confirm.subtitle'), showBack: true };
      case '/swap/proposal/sent':
      case '/swap/sent':
        return { title: t('headers.sent.title'), subtitle: t('headers.sent.subtitle'), showBack: true };
      case '/notifications':
        return { title: t('headers.notifications.title'), subtitle: t('headers.notifications.subtitle'), showBack: true, showNotifications: false };
      default:
        return { showNotifications: true, showProfile: true };
    }
  };

  const isSwapFlow = pathname.startsWith('/swap');
  const headerProps = getHeaderProps();

  return (
    <div className="min-h-[100dvh] w-full bg-surface sm:bg-surface-container-low flex justify-center items-start">
      <div className="w-full max-w-[390px] min-h-[100dvh] h-[100dvh] bg-surface flex flex-col sm:shadow-2xl sm:ring-1 sm:ring-surface-container-high/20 relative overflow-hidden">
        <TopBar {...headerProps} />
        <main
          className={`flex-1 flex flex-col w-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] ${
            isSwapFlow ? 'pb-6' : 'pb-24'
          }`}
        >
          <Outlet />
        </main>
        {!isSwapFlow && <BottomNav />}
      </div>
    </div>
  );
};

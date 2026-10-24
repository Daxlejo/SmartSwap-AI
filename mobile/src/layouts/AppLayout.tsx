import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { useApp } from '@/context/AppContext';

export const AppLayout = () => {
  const location = useLocation();
  const { currentUser } = useApp();
  const pathname = location.pathname;

  // Determine header configuration based on route
  const getHeaderProps = () => {
    if (pathname.startsWith('/swap/route/')) {
      return { title: 'Detalle de Ruta', subtitle: 'Paso a Paso', showBack: true };
    }

    switch (pathname) {
      case '/home':
        return { showNotifications: true, showProfile: true };
      case '/explore':
        return { title: 'Explorar', subtitle: 'Catálogo P2P', showBack: true };
      case '/publish':
        return { title: 'Publicar', subtitle: 'Nuevo artículo', showBack: true };
      case '/swaps':
      case '/trades':
        return { title: 'Canjes', subtitle: 'Tus intercambios', showBack: true };
      case '/profile':
        return {
          title: 'Mi Perfil',
          subtitle: currentUser?.name || 'Alex Morales',
          showBack: true,
          showProfile: false,
        };
      case '/swap/configure':
        return { title: 'Configurar Canje', subtitle: 'Tengo y Busco', showBack: true };
      case '/swap/searching':
        return { title: 'Buscando Rutas', subtitle: 'Red SmartSwap', showBack: true };
      case '/swap/results':
        return { title: 'Rutas Encontradas', subtitle: 'Cadenas Circulares', showBack: true };
      case '/swap/proposal/confirm':
      case '/swap/confirm':
        return { title: 'Confirmar Canje', subtitle: 'Revisión Final', showBack: true };
      case '/swap/proposal/sent':
      case '/swap/sent':
        return { title: 'Propuesta Enviada', subtitle: 'En Custodia', showBack: true };
      case '/notifications':
        return { title: 'Notificaciones', subtitle: 'Centro de Avisos', showBack: true, showNotifications: false };
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

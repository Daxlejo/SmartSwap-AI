import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';

export const AppLayout = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Determine header configuration based on route
  const getHeaderProps = () => {
    switch (pathname) {
      case '/home':
        return { showNotifications: true, showProfile: true };
      case '/explore':
        return { title: 'Explorar', subtitle: 'Catálogo P2P', showBack: true };
      case '/publish':
        return { title: 'Publicar', subtitle: 'Nuevo artículo', showBack: true };
      case '/swaps':
        return { title: 'Canjes', subtitle: 'Tus intercambios', showBack: true };
      case '/profile':
        return { title: 'Mi Perfil', subtitle: 'Alex Morales', showBack: true, showProfile: false };
      case '/swap/configure':
        return { title: 'Configurar Canje', subtitle: 'Tengo y Busco', showBack: true };
      case '/swap/searching':
        return { title: 'Buscando Rutas', subtitle: 'Red SmartSwap', showBack: true };
      case '/notifications':
        return { title: 'Notificaciones', showBack: true, showNotifications: false };
      default:
        return { showNotifications: true, showProfile: true };
    }
  };

  const isSwapFlow = pathname.startsWith('/swap');
  const headerProps = getHeaderProps();

  return (
    <div className="min-h-screen w-full bg-surface-container-low flex justify-center items-start">
      <div className="w-full max-w-[390px] min-h-screen bg-surface flex flex-col shadow-2xl relative overflow-x-hidden">
        <TopBar {...headerProps} />
        <main className={`flex-1 flex flex-col w-full ${isSwapFlow ? 'pb-24' : 'pb-24'}`}>
          <Outlet />
        </main>
        {!isSwapFlow && <BottomNav />}
      </div>
    </div>
  );
};

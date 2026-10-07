import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from './ui/Icon';

export const BottomNav = () => {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-surface/90 backdrop-blur-2xl border-t border-surface-container-high/60 shadow-[0_-4px_20px_rgba(15,23,42,0.05)] max-w-[390px] mx-auto"
    >
      <div className="flex items-center justify-around h-20 px-space-xs max-w-md mx-auto">
        {/* Home */}
        <NavLink
          to="/home"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl',
              isActive
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon name="home" size="lg" filled={isActive} />
              <span className="font-label-sm text-label-sm mt-0.5">Inicio</span>
            </>
          )}
        </NavLink>

        {/* Explore */}
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl',
              isActive
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon name="explore" size="lg" filled={isActive} />
              <span className="font-label-sm text-label-sm mt-0.5">Explorar</span>
            </>
          )}
        </NavLink>

        {/* Publish Center Floating Trigger */}
        <div className="relative flex flex-col items-center justify-center flex-1 h-full">
          <NavLink
            to="/publish"
            aria-label="Publicar artículo para canje"
            className="absolute -top-4 flex flex-col items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          >
            <div className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(0,104,95,0.4)] group-active:scale-95 transition-transform">
              <Icon name="add" size="xl" />
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 font-bold group-hover:text-primary transition-colors">
              Publicar
            </span>
          </NavLink>
        </div>

        {/* Exchanges / Swaps */}
        <NavLink
          to="/swaps"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl',
              isActive
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium',
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative flex items-center justify-center">
                <Icon name="sync_alt" size="lg" filled={isActive} />
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-secondary-container text-on-primary font-label-sm text-[10px] leading-tight font-bold shadow-xs">
                  2
                </span>
              </div>
              <span className="font-label-sm text-label-sm mt-0.5">Canjes</span>
            </>
          )}
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center flex-1 h-full min-w-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl',
              isActive
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface font-medium',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon name="person" size="lg" filled={isActive} />
              <span className="font-label-sm text-label-sm mt-0.5">Perfil</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
};

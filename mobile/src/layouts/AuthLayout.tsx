import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-[100dvh] w-full bg-surface sm:bg-surface-container-low flex justify-center items-center">
      <div className="w-full max-w-[390px] min-h-[100dvh] bg-surface flex flex-col sm:shadow-2xl sm:ring-1 sm:ring-surface-container-high/20 relative overflow-x-hidden">
        <main className="flex-1 flex flex-col w-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

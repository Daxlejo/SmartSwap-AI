import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full bg-surface-container-low flex justify-center items-center">
      <div className="w-full max-w-[390px] min-h-screen bg-surface flex flex-col shadow-2xl relative overflow-x-hidden">
        <main className="flex-1 flex flex-col w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

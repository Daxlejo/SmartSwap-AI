import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { LoginScreen } from '@/screens/LoginScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ConfigureSwapScreen } from '@/screens/ConfigureSwapScreen';
import { SearchingScreen } from '@/screens/SearchingScreen';
import { ExploreScreen } from '@/screens/ExploreScreen';
import { PublishScreen } from '@/screens/PublishScreen';
import { ExchangesScreen } from '@/screens/ExchangesScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { NotificationsScreen } from '@/screens/NotificationsScreen';
import { RouteResultsScreen } from '@/screens/RouteResultsScreen';
import { RouteDetailScreen } from '@/screens/RouteDetailScreen';
import { ProposalConfirmScreen } from '@/screens/ProposalConfirmScreen';
import { ProposalSentScreen } from '@/screens/ProposalSentScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginScreen />,
      },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: '/home',
        element: <HomeScreen />,
      },
      {
        path: '/explore',
        element: <ExploreScreen />,
      },
      {
        path: '/publish',
        element: <PublishScreen />,
      },
      {
        path: '/swaps',
        element: <ExchangesScreen />,
      },
      {
        path: '/profile',
        element: <ProfileScreen />,
      },
      {
        path: '/swap/configure',
        element: <ConfigureSwapScreen />,
      },
      {
        path: '/swap/searching',
        element: <SearchingScreen />,
      },
      {
        path: '/swap/results',
        element: <RouteResultsScreen />,
      },
      {
        path: '/swap/route/:routeId',
        element: <RouteDetailScreen />,
      },
      {
        path: '/swap/proposal/confirm',
        element: <ProposalConfirmScreen />,
      },
      {
        path: '/swap/proposal/sent',
        element: <ProposalSentScreen />,
      },
      {
        path: '/notifications',
        element: <NotificationsScreen />,
      },
      {
        path: '*',
        element: <Navigate to="/home" replace />,
      },
    ],
  },
]);

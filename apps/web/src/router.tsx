import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { AppGuard } from './components/shell/AppGuard';
import { Toaster } from './components/ui/Toaster';
import { AdminPage } from './features/admin/AdminPage';
import { BannedPage, PendingPage } from './features/auth/StatusPages';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { GamesHubPage } from './features/games/GamesHubPage';
import { PlayPage } from './features/games/PlayPage';
import { LeaderboardsPage } from './features/leaderboards/LeaderboardsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { WalletPage } from './features/economy/WalletPage';
import { ProfilePage } from './features/profile/ProfilePage';

function Root() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

const rootRoute = createRootRoute({ component: Root });

// ── Public routes ──────────────────────────────────────────────────────────
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage });
const registerRoute = createRoute({ getParentRoute: () => rootRoute, path: '/register', component: RegisterPage });
const pendingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/pending', component: PendingPage });
const bannedRoute = createRoute({ getParentRoute: () => rootRoute, path: '/banned', component: BannedPage });

// ── Authenticated app (gated layout) ─────────────────────────────────────────
const appRoute = createRoute({ getParentRoute: () => rootRoute, id: '_app', component: AppGuard });

const dashboardRoute = createRoute({ getParentRoute: () => appRoute, path: '/', component: DashboardPage });
const gamesRoute = createRoute({ getParentRoute: () => appRoute, path: '/games', component: GamesHubPage });
const playRoute = createRoute({ getParentRoute: () => appRoute, path: '/games/$gameId', component: PlayPage });
const leaderboardsRoute = createRoute({ getParentRoute: () => appRoute, path: '/leaderboards', component: LeaderboardsPage });
const walletRoute = createRoute({ getParentRoute: () => appRoute, path: '/wallet', component: WalletPage });
const notificationsRoute = createRoute({ getParentRoute: () => appRoute, path: '/notifications', component: NotificationsPage });
const meRoute = createRoute({ getParentRoute: () => appRoute, path: '/me', component: () => <ProfilePage self /> });
const profileRoute = createRoute({ getParentRoute: () => appRoute, path: '/u/$userId', component: () => <ProfilePage /> });
const adminRoute = createRoute({ getParentRoute: () => appRoute, path: '/admin', component: AdminPage });

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  pendingRoute,
  bannedRoute,
  appRoute.addChildren([
    dashboardRoute,
    gamesRoute,
    playRoute,
    leaderboardsRoute,
    walletRoute,
    notificationsRoute,
    meRoute,
    profileRoute,
    adminRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

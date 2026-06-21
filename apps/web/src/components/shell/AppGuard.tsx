import { Navigate, Outlet } from '@tanstack/react-router';
import { useAuth } from '../../stores/auth';
import { FullSpinner } from '../ui/primitives';
import { AppShell } from './AppShell';

/** Gate for the authenticated app area. Routes by session phase + account status. */
export function AppGuard() {
  const phase = useAuth((s) => s.phase);
  const user = useAuth((s) => s.user);

  if (phase === 'loading') return <FullSpinner label="Loading AuraTracker…" />;
  if (phase === 'guest' || !user) return <Navigate to="/login" />;
  if (user.status === 'BANNED') return <Navigate to="/banned" />;
  if (user.status !== 'ACTIVE') return <Navigate to="/pending" />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

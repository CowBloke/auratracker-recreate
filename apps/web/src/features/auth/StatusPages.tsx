import { motion } from 'framer-motion';
import { Clock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../stores/auth';
import { Button } from '../../components/ui/Button';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="card w-full max-w-md p-8 text-center"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function PendingPage() {
  const logout = useAuth((s) => s.logout);
  return (
    <Centered>
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber/10 text-amber ring-1 ring-amber/30 animate-float">
        <Clock className="size-8" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold">Awaiting approval</h1>
      <p className="mt-2 text-muted">
        Your account has been created and is waiting for an admin to review it. You'll be able to sign in once
        it's approved.
      </p>
      <Button variant="subtle" className="mt-6" onClick={() => logout()}>
        Back to sign in
      </Button>
    </Centered>
  );
}

export function BannedPage() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  return (
    <Centered>
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-rose/10 text-rose ring-1 ring-rose/30">
        <ShieldAlert className="size-8" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold">Account suspended</h1>
      <p className="mt-2 text-muted">Your access to AuraTracker has been suspended.</p>
      {user && (
        <p className="mt-4 rounded-xl bg-rose/5 px-4 py-3 text-sm text-muted ring-1 ring-rose/15">
          You can contact a moderator if you believe this is a mistake.
        </p>
      )}
      <Button variant="subtle" className="mt-6" onClick={() => logout()}>
        Sign out
      </Button>
    </Centered>
  );
}

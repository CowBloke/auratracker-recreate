import { Link, useRouterState } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, LogOut, Menu, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { formatCompact } from '../../lib/format';
import { visibleNav } from '../../app/nav';
import { useAuth } from '../../stores/auth';
import { useUi } from '../../stores/ui';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import { NotificationsMenu } from './NotificationsMenu';
import { useRealtime } from './useRealtime';

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuth((s) => s.user);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = visibleNav(user?.role);
  const main = items.filter((i) => !i.footer);
  const footer = items.filter((i) => i.footer);

  const renderItem = (item: (typeof items)[number]) => {
    const active = item.to === '/' ? path === '/' : path.startsWith(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
          active ? 'text-ink' : 'text-muted hover:text-ink hover:bg-white/[0.04]',
        )}
      >
        {active && (
          <motion.span
            layoutId="nav-active"
            className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-aura/20 to-transparent ring-1 ring-aura/30"
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        )}
        <Icon name={item.icon} className={cn('size-5 transition', active && 'text-aura')} />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="flex h-full flex-col gap-1">
      {main.map(renderItem)}
      <div className="mt-auto flex flex-col gap-1 pt-2">{footer.map(renderItem)}</div>
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-1">
      <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-aura to-aura-deep ring-1 ring-white/20">
        <Sparkles className="size-5 text-white" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        Aura<span className="aura-text">Tracker</span>
      </span>
    </Link>
  );
}

function BalancePills() {
  const user = useAuth((s) => s.user);
  if (!user) return null;
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-3 py-1.5 text-sm font-semibold text-amber ring-1 ring-amber/25 tabular-nums">
        <Coins className="size-4" /> {formatCompact(user.balances.money)}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-aura/10 px-3 py-1.5 text-sm font-semibold text-aura ring-1 ring-aura/25 tabular-nums">
        <Sparkles className="size-4" /> {formatCompact(user.balances.aura)}
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const online = useUi((s) => s.online);
  useRealtime(!!user);

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-line-soft bg-base-2/40 px-4 py-6 backdrop-blur-xl lg:flex">
        <Brand />
        <div className="flex-1">
          <NavLinks />
        </div>
        {user && (
          <div className="card flex items-center gap-3 p-3">
            <Avatar username={user.username} color={user.usernameColor} src={user.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: user.usernameColor }}>
                {user.username}
              </p>
              <p className="truncate text-xs text-faint capitalize">{user.role.toLowerCase()}</p>
            </div>
            <button
              onClick={() => logout()}
              className="grid size-8 place-items-center rounded-lg text-faint transition hover:bg-white/5 hover:text-rose"
              aria-label="Log out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile slide-over */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-line bg-base-2 px-4 py-6"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-white/5">
                  <X className="size-5" />
                </button>
              </div>
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line-soft bg-base/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-white/5 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald/60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald" />
            </span>
            <span className="tabular-nums">{online} online</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <BalancePills />
            <NotificationsMenu />
            {user && (
              <Link to="/me">
                <Avatar username={user.username} color={user.usernameColor} src={user.avatarUrl} size="sm" />
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

import { type AdminUserView, type Role } from '@aura/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Ban, Check, Coins, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { formatNumber, timeAgo } from '../../lib/format';
import { api, rpc, unwrap } from '../../lib/api';
import { useAuth } from '../../stores/auth';
import { toast } from '../../stores/ui';
import { Page } from '../../components/shell/Page';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, Pill, Skeleton } from '../../components/ui/primitives';
import { Field, Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

type Tab = 'inbox' | 'users' | 'audit';

const STATUS_TONE: Record<string, 'emerald' | 'amber' | 'rose' | 'muted'> = {
  ACTIVE: 'emerald',
  PENDING: 'amber',
  BANNED: 'rose',
  REJECTED: 'muted',
};

export function AdminPage() {
  const role = useAuth((s) => s.user?.role);
  const [tab, setTab] = useState<Tab>('inbox');

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return (
      <Page title="Admin console">
        <EmptyState icon="ShieldAlert" title="No access" description="You don't have permission to view this area." />
      </Page>
    );
  }

  const pending = useQuery({ queryKey: ['admin', 'pending'], queryFn: async () => unwrap(await api.admin.pendingUsers()) });

  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'inbox', label: 'Inbox', icon: 'Inbox', badge: pending.data?.length },
    { id: 'users', label: 'Users', icon: 'Users' },
    { id: 'audit', label: 'Audit log', icon: 'ScrollText' },
  ];

  return (
    <Page title="Admin console" subtitle="Approvals, moderation and the audit trail.">
      <div className="flex gap-1.5 rounded-xl bg-white/[0.03] p-1 ring-1 ring-line-soft w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn('relative flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition', tab === t.id ? 'text-ink' : 'text-muted hover:text-ink')}
          >
            {tab === t.id && <motion.span layoutId="admin-tab" className="absolute inset-0 -z-10 rounded-lg bg-aura/20 ring-1 ring-aura/30" />}
            {t.label}
            {t.badge ? <span className="rounded-full bg-rose px-1.5 text-[10px] font-bold text-white">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'inbox' && <Inbox />}
      {tab === 'users' && <Users />}
      {tab === 'audit' && <Audit />}
    </Page>
  );
}

function Inbox() {
  const qc = useQueryClient();
  const pending = useQuery({ queryKey: ['admin', 'pending'], queryFn: async () => unwrap(await api.admin.pendingUsers()) });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      approve ? unwrap(await rpc(api.admin.approve, { params: { id }, body: {} })) : unwrap(await rpc(api.admin.reject, { params: { id }, body: {} })),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: v.approve ? 'User approved' : 'User rejected', variant: v.approve ? 'success' : 'default' });
    },
  });

  if (pending.isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;
  if (!pending.data?.length) return <EmptyState icon="Inbox" title="Inbox zero" description="No accounts awaiting review." />;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {pending.data.map((u) => (
        <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar username={u.username} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{u.username} <span className="text-faint">· {u.firstName}</span></p>
                <p className="truncate text-xs text-faint">{u.email}</p>
              </div>
              <span className="text-xs text-faint">{timeAgo(u.createdAt)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              {u.school && <Pill>{u.school}</Pill>}
              {u.schoolLevel && <Pill>{u.schoolLevel}{u.classLetter ? ` ${u.classLetter}` : ''}</Pill>}
            </div>
            {u.motivation && <p className="mt-3 rounded-lg bg-base-2/60 px-3 py-2 text-sm text-muted ring-1 ring-line-soft">“{u.motivation}”</p>}
            <div className="mt-4 flex gap-2">
              <Button size="sm" fullWidth loading={decide.isPending} onClick={() => decide.mutate({ id: u.id, approve: true })}>
                <Check className="size-4" /> Approve
              </Button>
              <Button size="sm" variant="subtle" onClick={() => decide.mutate({ id: u.id, approve: false })}>
                <X className="size-4" /> Reject
              </Button>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function Users() {
  const me = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [banTarget, setBanTarget] = useState<AdminUserView | null>(null);
  const [grantTarget, setGrantTarget] = useState<AdminUserView | null>(null);

  const users = useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: async () => unwrap(await api.admin.listUsers({ query: { q: q || undefined } })),
  });

  const action = useMutation({
    mutationFn: async (m: { kind: 'unban' | 'role'; id: string; role?: Role }) =>
      m.kind === 'unban'
        ? unwrap(await rpc(api.admin.unban, { params: { id: m.id }, body: {} }))
        : unwrap(await rpc(api.admin.setRole, { params: { id: m.id }, body: { role: m.role! } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'Done', variant: 'success' });
    },
    onError: (e) => toast({ title: e instanceof Error ? e.message : 'Action failed', variant: 'error' }),
  });

  return (
    <div className="space-y-4">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="max-w-xs" />
      {users.isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line-soft">
            {users.data?.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar username={u.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-faint">{u.email}</p>
                </div>
                <span className="hidden items-center gap-3 text-xs text-muted sm:flex">
                  <span className="inline-flex items-center gap-1"><Coins className="size-3.5 text-amber" />{formatNumber(u.money)}</span>
                  <span className="inline-flex items-center gap-1"><Sparkles className="size-3.5 text-aura" />{formatNumber(u.aura)}</span>
                </span>
                <Pill tone={STATUS_TONE[u.status]}>{u.status.toLowerCase()}</Pill>
                <Pill tone="muted">{u.role.toLowerCase()}</Pill>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="subtle" onClick={() => setGrantTarget(u)}>Grant</Button>
                  {me.role === 'SUPERADMIN' && u.id !== me.id && (
                    <Button size="sm" variant="ghost" onClick={() => action.mutate({ kind: 'role', id: u.id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}>
                      <ShieldCheck className="size-4" />
                    </Button>
                  )}
                  {u.status === 'BANNED' ? (
                    <Button size="sm" variant="ghost" onClick={() => action.mutate({ kind: 'unban', id: u.id })}>Unban</Button>
                  ) : (
                    u.id !== me.id && (
                      <Button size="sm" variant="ghost" className="text-rose" onClick={() => setBanTarget(u)}>
                        <Ban className="size-4" />
                      </Button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <BanModal target={banTarget} onClose={() => setBanTarget(null)} />
      <GrantModal target={grantTarget} onClose={() => setGrantTarget(null)} />
    </div>
  );
}

function BanModal({ target, onClose }: { target: AdminUserView | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const ban = useMutation({
    mutationFn: async () => unwrap(await rpc(api.admin.ban, { params: { id: target!.id }, body: { reason } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'User banned', variant: 'default' });
      setReason('');
      onClose();
    },
  });
  return (
    <Modal open={!!target} onClose={onClose} title={`Ban ${target?.username}`} description="Their sessions are revoked immediately.">
      <div className="space-y-4">
        <Field label="Reason">{(id) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for the ban…" autoFocus />}</Field>
        <Button fullWidth variant="danger" disabled={!reason.trim()} loading={ban.isPending} onClick={() => ban.mutate()}>
          Ban user
        </Button>
      </div>
    </Modal>
  );
}

function GrantModal({ target, onClose }: { target: AdminUserView | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [currency, setCurrency] = useState<'MONEY' | 'AURA'>('MONEY');
  const [amount, setAmount] = useState('');
  const grant = useMutation({
    mutationFn: async () => unwrap(await rpc(api.admin.grant, { params: { id: target!.id }, body: { currency, amount: Number(amount) } })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'Balance adjusted', variant: 'success' });
      setAmount('');
      onClose();
    },
  });
  return (
    <Modal open={!!target} onClose={onClose} title={`Adjust ${target?.username}'s balance`} description="Use a negative amount to deduct.">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(['MONEY', 'AURA'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={cn('flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition', currency === c ? 'border-aura/50 bg-aura/15 text-ink' : 'border-line text-muted')}
            >
              {c.toLowerCase()}
            </button>
          ))}
        </div>
        <Field label="Amount">{(id) => <Input id={id} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500 or -100" autoFocus />}</Field>
        <Button fullWidth disabled={!amount || Number(amount) === 0} loading={grant.isPending} onClick={() => grant.mutate()}>
          Apply
        </Button>
      </div>
    </Modal>
  );
}

function Audit() {
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: async () => unwrap(await api.admin.audit({ query: { limit: 60 } })) });
  if (audit.isLoading) return <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (!audit.data?.length) return <EmptyState icon="ScrollText" title="No audit entries" />;
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line-soft">
        {audit.data.map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-4 py-3">
            <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-muted"><ShieldCheck className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{l.summary}</p>
              <p className="text-xs text-faint">
                {l.actorUsername ? `by ${l.actorUsername}` : 'system'} · {timeAgo(l.createdAt)}
              </p>
            </div>
            <Pill tone="muted">{l.action.replace(/_/g, ' ').toLowerCase()}</Pill>
          </li>
        ))}
      </ul>
    </Card>
  );
}

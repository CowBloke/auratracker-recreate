import { getGame } from '@aura/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Coins, LogOut, Pencil, Sparkles, Trophy, UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { api, rpc, unwrap } from '../../lib/api';
import { formatNumber } from '../../lib/format';
import { useAuth } from '../../stores/auth';
import { toast } from '../../stores/ui';
import { Page } from '../../components/shell/Page';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, FullSpinner, Pill, StatTile } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { Field, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

const RARITY_RING: Record<string, string> = {
  common: 'ring-white/15',
  rare: 'ring-cyan/40',
  epic: 'ring-aura/50',
  legendary: 'ring-amber/60',
};

export function ProfilePage({ self }: { self?: boolean }) {
  const me = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const routeId = useParams({ strict: false, select: (p) => (p as { userId?: string }).userId });
  const userId = self ? me?.id : routeId;
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => unwrap(await rpc(api.users.profile, { params: { id: userId! } })),
    enabled: !!userId,
  });

  const follow = useMutation({
    mutationFn: async (following: boolean) =>
      following
        ? unwrap(await rpc(api.users.unfollow, { params: { id: userId! } }))
        : unwrap(await rpc(api.users.follow, { params: { id: userId! }, body: {} })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] }),
  });

  if (profile.isLoading || !profile.data) return <FullSpinner label="Loading profile…" />;
  const p = profile.data;
  const isSelf = me?.id === p.id;

  return (
    <Page>
      {/* Banner */}
      <Card className="overflow-hidden p-0">
        <div
          className="h-32 w-full sm:h-44"
          style={{
            background: p.bannerUrl
              ? `url(${p.bannerUrl}) center/cover`
              : `linear-gradient(120deg, ${p.usernameColor}40, transparent 60%), radial-gradient(circle at 80% 20%, var(--color-aura)30, transparent 50%)`,
          }}
        />
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
          <div className="-mt-16 sm:-mt-20">
            <Avatar username={p.username} color={p.usernameColor} src={p.avatarUrl} size="xl" ring className="border-4 border-base" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold" style={{ color: p.usernameColor }}>
                {p.username}
              </h1>
              <Pill tone={p.role === 'SUPERADMIN' || p.role === 'ADMIN' ? 'rose' : 'muted'}>{p.role.toLowerCase()}</Pill>
            </div>
            {p.bio && <p className="mt-1 max-w-prose text-sm text-muted">{p.bio}</p>}
            <div className="mt-2 flex gap-4 text-sm text-faint">
              <span><b className="text-ink">{formatNumber(p.followerCount)}</b> followers</span>
              <span><b className="text-ink">{formatNumber(p.followingCount)}</b> following</span>
            </div>
          </div>
          <div className="flex gap-2">
            {isSelf ? (
              <>
                <Button variant="subtle" onClick={() => setEditOpen(true)}><Pencil className="size-4" /> Edit</Button>
                <Button variant="ghost" onClick={() => logout()}><LogOut className="size-4" /></Button>
              </>
            ) : (
              <Button
                variant={p.isFollowing ? 'subtle' : 'primary'}
                loading={follow.isPending}
                onClick={() => follow.mutate(p.isFollowing)}
              >
                {p.isFollowing ? <><UserCheck className="size-4" /> Following</> : <><UserPlus className="size-4" /> Follow</>}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Money" value={formatNumber(p.money)} icon="Coins" tone="amber" />
        <StatTile label="Aura" value={formatNumber(p.aura)} icon="Sparkles" tone="aura" />
        <StatTile label="Overall rank" value={p.overallRank ? `#${p.overallRank}` : '—'} icon="Crown" tone="cyan" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 font-display font-semibold">Badges</h3>
          {p.badges.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {p.badges.map((b) => (
                <motion.div
                  key={b.id}
                  whileHover={{ y: -3, scale: 1.05 }}
                  className="group flex flex-col items-center gap-1.5"
                  title={b.description}
                >
                  <span className={`grid size-14 place-items-center rounded-2xl bg-aura/10 text-aura ring-1 ${RARITY_RING[b.rarity]}`}>
                    <Icon name={b.icon} className="size-7" />
                  </span>
                  <span className="text-[11px] text-muted">{b.name}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-faint">No badges earned yet.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="size-4 text-amber" />
            <h3 className="font-display font-semibold">High scores</h3>
          </div>
          {p.highScores.length > 0 ? (
            <ul className="space-y-2.5">
              {p.highScores.map((h) => {
                const g = getGame(h.gameId);
                return (
                  <li key={h.gameId} className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg ring-1" style={{ background: `${g?.accent ?? '#a78bfa'}1a`, color: g?.accent ?? '#a78bfa', borderColor: `${g?.accent ?? '#a78bfa'}40` }}>
                      <Icon name={g?.icon ?? 'Gamepad2'} className="size-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium">{g?.name ?? h.gameId}</span>
                    <span className="font-display font-semibold tabular-nums">{formatNumber(h.bestScore)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon="Gamepad2" title="No scores yet" />
          )}
        </Card>
      </div>

      {isSelf && me && <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />}
    </Page>
  );
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const qc = useQueryClient();
  const [bio, setBio] = useState(me.bio ?? '');
  const [color, setColor] = useState(me.usernameColor);

  const save = useMutation({
    mutationFn: async () => unwrap(await api.users.updateMe({ body: { bio: bio || null, usernameColor: color } })),
    onSuccess: (user) => {
      setUser(user);
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: 'Profile updated', variant: 'success' });
      onClose();
    },
  });

  const SWATCHES = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#f472b6', '#facc15', '#60a5fa'];

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <div className="space-y-4">
        <Field label="Bio">
          {(id) => <Textarea id={id} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} placeholder="Say something about yourself…" />}
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Username colour</p>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`size-9 rounded-xl ring-2 transition ${color === c ? 'ring-white scale-110' : 'ring-transparent'}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-faint">Preview:</span>
            <span className="font-display font-semibold" style={{ color }}>{me.username}</span>
          </div>
        </div>
        <Button fullWidth loading={save.isPending} onClick={() => save.mutate()}>Save changes</Button>
      </div>
    </Modal>
  );
}

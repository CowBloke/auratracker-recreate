import { ECONOMY } from '@aura/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ApiClientError, api, unwrap } from '../../lib/api';
import { patchBalances, useAuth } from '../../stores/auth';
import { toast } from '../../stores/ui';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

type Recipient = { id: string; username: string; usernameColor: string; avatarUrl: string | null };

export function TransferModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const me = useAuth((s) => s.user)!;
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const search = useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => unwrap(await api.users.search({ query: { q: query } })),
    enabled: open && query.trim().length >= 1 && !recipient,
  });

  const transfer = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.economy.transfer({
          body: { toUserId: recipient!.id, amount: Number(amount), message: message || undefined },
        }),
      ),
    onSuccess: (res) => {
      patchBalances({ money: me.balances.money, aura: res.balances.aura });
      toast({
        title: `Sent ${amount} aura to ${recipient!.username}`,
        description: `${res.remainingDailyAllowance} aura left to gift today.`,
        variant: 'aura',
        icon: 'Gift',
      });
      reset();
      onDone();
      onClose();
    },
    onError: (err) => setError(err instanceof ApiClientError ? err.message : 'Transfer failed.'),
  });

  function reset() {
    setQuery('');
    setRecipient(null);
    setAmount('');
    setMessage('');
    setError(null);
  }

  const amountNum = Number(amount);
  const valid = recipient && amountNum >= ECONOMY.AURA_TRANSFER_MIN && amountNum <= me.balances.aura;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Gift aura"
      description={`Send aura to a friend. Up to ${ECONOMY.AURA_TRANSFER_DAILY_CAP} per day.`}
    >
      <div className="space-y-4">
        {recipient ? (
          <button
            onClick={() => setRecipient(null)}
            className="flex w-full items-center gap-3 rounded-xl border border-aura/40 bg-aura/10 px-3 py-2.5 text-left"
          >
            <Avatar username={recipient.username} color={recipient.usernameColor} src={recipient.avatarUrl} size="sm" />
            <span className="flex-1 font-medium" style={{ color: recipient.usernameColor }}>{recipient.username}</span>
            <Check className="size-4 text-aura" />
          </button>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a username…" className="pl-9" autoFocus />
            {search.data && search.data.length > 0 && (
              <div className="card absolute z-10 mt-1 max-h-52 w-full overflow-y-auto p-1">
                {search.data.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setRecipient(u);
                      setQuery('');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/5"
                  >
                    <Avatar username={u.username} color={u.usernameColor} src={u.avatarUrl} size="sm" />
                    <span style={{ color: u.usernameColor }}>{u.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-aura" />
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            min={ECONOMY.AURA_TRANSFER_MIN}
            className="pl-9 tabular-nums"
          />
        </div>
        <p className="text-xs text-faint">You have {me.balances.aura} aura.</p>

        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Add a message (optional)" maxLength={200} />

        {error && <p className="rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose ring-1 ring-rose/20">{error}</p>}

        <Button fullWidth disabled={!valid} loading={transfer.isPending} onClick={() => transfer.mutate()}>
          {recipient ? `Send ${amountNum > 0 ? amountNum : ''} aura` : 'Pick a recipient'}
        </Button>
      </div>
    </Modal>
  );
}

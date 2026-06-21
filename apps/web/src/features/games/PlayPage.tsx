import { type SubmitScoreResult, getGame } from '@aura/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Coins, Crown, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { api, rpc, unwrap } from '../../lib/api';
import { formatNumber } from '../../lib/format';
import { patchBalances } from '../../stores/auth';
import { Page } from '../../components/shell/Page';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState } from '../../components/ui/primitives';
import { Icon } from '../../components/ui/Icon';
import { getGameComponent } from './registry';

type Phase = 'playing' | 'submitting' | 'result';

export function PlayPage() {
  const gameId = useParams({ strict: false, select: (p) => (p as { gameId: string }).gameId });
  const qc = useQueryClient();
  const game = getGame(gameId);
  const Component = getGameComponent(gameId);

  const [phase, setPhase] = useState<Phase>('playing');
  const [gameKey, setGameKey] = useState(0);
  const [result, setResult] = useState<SubmitScoreResult | null>(null);

  const board = useQuery({
    queryKey: ['games', gameId, 'leaderboard'],
    queryFn: async () => unwrap(await rpc(api.games.leaderboard, { params: { id: gameId } })),
    enabled: !!game,
  });

  const submit = useMutation({
    mutationFn: async (score: number) =>
      unwrap(await rpc(api.games.submitScore, { params: { id: gameId }, body: { score, runId: crypto.randomUUID() } })),
    onSuccess: (res) => {
      setResult(res);
      setPhase('result');
      patchBalances(res.balances);
      qc.invalidateQueries({ queryKey: ['games'] });
      qc.invalidateQueries({ queryKey: ['economy'] });
      qc.invalidateQueries({ queryKey: ['leaderboards'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
    onError: () => setPhase('result'),
  });

  const onGameOver = useCallback(
    (score: number) => {
      setPhase('submitting');
      submit.mutate(score);
    },
    [submit],
  );

  const replay = () => {
    setResult(null);
    setPhase('playing');
    setGameKey((k) => k + 1);
  };

  if (!game) {
    return (
      <Page>
        <EmptyState icon="HelpCircle" title="Game not found" description="This game does not exist." action={<Link to="/games"><Button variant="subtle">Back to hub</Button></Link>} />
      </Page>
    );
  }

  return (
    <Page>
      <Link to="/games" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
        <ArrowLeft className="size-4" /> All games
      </Link>

      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl ring-1" style={{ background: `${game.accent}1f`, color: game.accent, borderColor: `${game.accent}45` }}>
          <Icon name={game.icon} className="size-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">{game.name}</h1>
          <p className="text-sm text-muted">{game.tagline}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Play area */}
        <Card className="relative grid min-h-[480px] place-items-center p-6">
          {Component ? (
            <Component key={gameKey} onGameOver={onGameOver} />
          ) : (
            <EmptyState icon="Construction" title="Coming soon" description="This game isn't playable yet." />
          )}

          <AnimatePresence>
            {(phase === 'submitting' || phase === 'result') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 grid place-items-center rounded-[inherit] bg-base/80 backdrop-blur-md"
              >
                {phase === 'submitting' ? (
                  <div className="flex flex-col items-center gap-3 text-muted">
                    <Sparkles className="size-7 animate-pulse-glow text-aura" />
                    <p>Tallying your run…</p>
                  </div>
                ) : result ? (
                  <ResultCard result={result} onReplay={replay} />
                ) : (
                  <div className="text-center">
                    <p className="text-rose">Couldn't save your run.</p>
                    <Button variant="subtle" className="mt-3" onClick={replay}>Try again</Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-semibold">How to play</h3>
            <p className="mt-2 text-sm text-muted">{game.howTo}</p>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="size-4 text-amber" />
              <h3 className="font-display font-semibold">Top players</h3>
            </div>
            {board.data && board.data.entries.length > 0 ? (
              <ul className="space-y-2.5">
                {board.data.entries.slice(0, 5).map((e) => (
                  <li key={e.userId} className="flex items-center gap-2.5">
                    <span className={`w-5 text-center text-sm font-semibold tabular-nums ${e.rank === 1 ? 'text-amber' : 'text-faint'}`}>{e.rank}</span>
                    <Avatar username={e.username} color={e.usernameColor} src={e.avatarUrl} size="sm" />
                    <span className="flex-1 truncate text-sm" style={{ color: e.usernameColor }}>{e.username}</span>
                    <span className="text-sm font-semibold tabular-nums">{formatNumber(e.value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-faint">No scores yet — be the first!</p>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}

function ResultCard({ result, onReplay }: { result: SubmitScoreResult; onReplay: () => void }) {
  const earned = result.reward.money > 0 || result.reward.aura > 0;
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="w-full max-w-xs text-center"
    >
      {result.isRecord && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1 text-sm font-medium text-amber ring-1 ring-amber/30">
          <Crown className="size-4" /> New record!
        </motion.div>
      )}
      <p className="text-sm text-muted">You scored</p>
      <p className="font-display text-5xl font-bold aura-text">{formatNumber(result.score)}</p>

      {earned ? (
        <div className="mt-5 flex justify-center gap-3">
          {result.reward.money > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber/10 px-3 py-2 text-amber ring-1 ring-amber/25">
              <Coins className="size-4" /> +{formatNumber(result.reward.money)}
            </span>
          )}
          {result.reward.aura > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-aura/10 px-3 py-2 text-aura ring-1 ring-aura/25">
              <Sparkles className="size-4" /> +{formatNumber(result.reward.aura)}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-faint">No reward this run — aim higher!</p>
      )}

      {result.reward.cappedByDaily && (
        <p className="mt-2 text-xs text-amber">You've hit a daily cap — earnings were reduced.</p>
      )}

      {result.newBadges.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {result.newBadges.map((b) => (
            <span key={b.id} className="inline-flex items-center gap-1.5 rounded-full bg-aura/10 px-2.5 py-1 text-xs text-aura ring-1 ring-aura/30 animate-pop">
              <Icon name={b.icon} className="size-3.5" /> {b.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <Button fullWidth onClick={onReplay}>
          <RotateCcw className="size-4" /> Play again
        </Button>
        <Link to="/games" className="flex-1">
          <Button variant="subtle" fullWidth>Back to hub</Button>
        </Link>
      </div>
    </motion.div>
  );
}

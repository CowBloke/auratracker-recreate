import { getGame } from '@aura/contracts';
import { prisma } from '@aura/db';
import { withRanks } from '@aura/domain';
import { NotFound } from '../lib/http-error';

const TOP_N = 50;
/** Overall rank weights aura more heavily than raw money. */
const AURA_WEIGHT = 5;

interface Row {
  userId: string;
  username: string;
  usernameColor: string;
  avatarUrl: string | null;
  value: number;
}

function buildView(rows: Row[], board: string, meId: string) {
  const ranked = withRanks(rows.map((r) => ({ ...r, isMe: r.userId === meId })));
  const me = ranked.find((r) => r.isMe) ?? null;
  return { board, entries: ranked.slice(0, TOP_N), me };
}

export async function currencyBoard(currency: 'MONEY' | 'AURA', meId: string) {
  const balances = await prisma.balance.findMany({
    where: { currency, user: { status: 'ACTIVE' } },
    orderBy: { amount: 'desc' },
    include: { user: true },
  });
  const rows: Row[] = balances.map((b) => ({
    userId: b.userId,
    username: b.user.username,
    usernameColor: b.user.usernameColor,
    avatarUrl: b.user.avatarUrl,
    value: b.amount,
  }));
  return buildView(rows, currency.toLowerCase(), meId);
}

export async function overallBoard(meId: string) {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    include: { balances: true },
  });
  const rows: Row[] = users
    .map((u) => {
      const money = u.balances.find((b) => b.currency === 'MONEY')?.amount ?? 0;
      const aura = u.balances.find((b) => b.currency === 'AURA')?.amount ?? 0;
      return {
        userId: u.id,
        username: u.username,
        usernameColor: u.usernameColor,
        avatarUrl: u.avatarUrl,
        value: money + aura * AURA_WEIGHT,
      };
    })
    .sort((a, b) => b.value - a.value);
  return buildView(rows, 'overall', meId);
}

export async function gameBoard(gameId: string, meId: string) {
  if (!getGame(gameId)) throw new NotFound('Unknown game.');
  const highs = await prisma.highScore.findMany({
    where: { gameId, user: { status: 'ACTIVE' } },
    orderBy: { bestScore: 'desc' },
    include: { user: true },
  });
  const rows: Row[] = highs.map((h) => ({
    userId: h.userId,
    username: h.user.username,
    usernameColor: h.user.usernameColor,
    avatarUrl: h.user.avatarUrl,
    value: h.bestScore,
  }));
  return buildView(rows, `game:${gameId}`, meId);
}

export async function resolveBoard(board: string, meId: string) {
  switch (board) {
    case 'money':
      return currencyBoard('MONEY', meId);
    case 'aura':
      return currencyBoard('AURA', meId);
    case 'overall':
      return overallBoard(meId);
    default:
      throw new NotFound('Unknown leaderboard.');
  }
}

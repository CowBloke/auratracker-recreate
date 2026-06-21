/**
 * Economy invariants and global caps. Centralised so the daily-cap logic, the
 * UI hints, and tests all read the same numbers.
 */
export const ECONOMY = {
  /** Starting balances granted on account approval. */
  STARTING_MONEY: 250,
  STARTING_AURA: 50,

  /** Per-user daily reward ceilings (Europe/Paris day). */
  DAILY_MONEY_CAP: 1000,
  DAILY_AURA_CAP: 200,

  /** Aura gifting: a sender may give away at most this much per day. */
  AURA_TRANSFER_DAILY_CAP: 100,
  /** Minimum aura per transfer. */
  AURA_TRANSFER_MIN: 1,

  /** Timezone whose midnight defines the "day" for all caps. */
  DAY_TIMEZONE: 'Europe/Paris',
} as const;

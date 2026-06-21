/** Domain errors carry a stable `code` that the API maps to an HTTP status. */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(currency: string) {
    super(`Not enough ${currency.toLowerCase()}.`, 'INSUFFICIENT_FUNDS', 409);
  }
}

export class DailyCapError extends DomainError {
  constructor(message: string) {
    super(message, 'DAILY_CAP_REACHED', 429);
  }
}

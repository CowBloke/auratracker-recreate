/** An error that maps directly to an HTTP response with the ApiError shape. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class Unauthorized extends HttpError {
  constructor(message = 'You must be signed in.') {
    super(401, message, 'UNAUTHORIZED');
  }
}
export class Forbidden extends HttpError {
  constructor(message = 'You do not have access to this.') {
    super(403, message, 'FORBIDDEN');
  }
}
export class NotFound extends HttpError {
  constructor(message = 'Not found.') {
    super(404, message, 'NOT_FOUND');
  }
}
export class BadRequest extends HttpError {
  constructor(message: string, fields?: Record<string, string>) {
    super(400, message, 'BAD_REQUEST', fields);
  }
}
export class Conflict extends HttpError {
  constructor(message: string, code = 'CONFLICT') {
    super(409, message, code);
  }
}
export class TooMany extends HttpError {
  constructor(message = 'Too many requests. Slow down.') {
    super(429, message, 'RATE_LIMITED');
  }
}

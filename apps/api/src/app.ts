import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { loadServerEnv } from '@aura/config';
import { DomainError } from '@aura/domain';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { resolveSession } from './auth/session';
import { CSRF_COOKIE, SESSION_COOKIE } from './auth/session';
import { HttpError } from './lib/http-error';
import { registerApi } from './router';

const env = loadServerEnv();

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/** Unsafe requests to these paths don't need CSRF (no session state yet). */
const CSRF_EXEMPT = ['/api/auth/login', '/api/auth/register', '/api/auth/csrf'];

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.isDev
      ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : true,
    trustProxy: true,
    bodyLimit: 256 * 1024,
  });

  // ── Security plugins ───────────────────────────────────────────────────────
  await app.register(helmet, {
    // The API is JSON-only and consumed cross-origin by the SPA; relax CSP here
    // (the web app sets its own) but keep the other hardening headers.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-aura-csrf'],
  });
  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    hook: 'onRequest',
  });

  // ── Session resolution (ids only; user is loaded lazily) ─────────────────────
  app.addHook('onRequest', async (req) => {
    const session = await resolveSession(req);
    if (session) req.auth = session;
  });

  // ── CSRF (double-submit cookie) for authenticated, state-changing requests ───
  app.addHook('onRequest', async (req, reply) => {
    if (SAFE_METHODS.has(req.method)) return;
    const url = req.url.split('?')[0] ?? '';
    if (CSRF_EXEMPT.includes(url)) return;
    // Only enforce once a session cookie is present (anonymous calls can't be CSRF'd).
    if (!req.cookies[SESSION_COOKIE]) return;
    const cookieToken = req.cookies[CSRF_COOKIE];
    const headerToken = req.headers['x-aura-csrf'];
    if (!cookieToken || cookieToken !== headerToken) {
      reply.code(403).send({ message: 'Invalid or missing CSRF token.', code: 'CSRF' });
    }
  });

  // ── Uniform error shape ──────────────────────────────────────────────────────
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.status).send({ message: err.message, code: err.code, fields: err.fields });
    }
    if (err instanceof DomainError) {
      return reply.code(err.status).send({ message: err.message, code: err.code });
    }
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of err.issues) fields[issue.path.join('.')] = issue.message;
      return reply.code(400).send({ message: 'Validation failed.', code: 'VALIDATION', fields });
    }
    // Fastify rate-limit / known status errors
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) {
      return reply.code(429).send({ message: 'Too many requests. Slow down.', code: 'RATE_LIMITED' });
    }
    if (status && status >= 400 && status < 500) {
      return reply.code(status).send({ message: err.message, code: 'REQUEST_ERROR' });
    }
    req.log.error(err);
    return reply.code(500).send({ message: 'Something went wrong.', code: 'INTERNAL' });
  });

  app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

  await registerApi(app);
  return app;
}

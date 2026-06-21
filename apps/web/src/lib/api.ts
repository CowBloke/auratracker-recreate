import { type ApiError, contract } from '@aura/contracts';
import { initClient, tsRestFetchApi } from '@ts-rest/core';

const CSRF_COOKIE = 'aura_csrf';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * Typed API client generated from the shared contract. Requests go same-origin
 * (Vite proxies `/api` → API) so the httpOnly session cookie rides along
 * automatically; we add the CSRF header for mutating requests.
 */
export const api = initClient(contract, {
  baseUrl: '/api',
  baseHeaders: {},
  api: (args) => {
    const headers: Record<string, string> = { ...(args.headers as Record<string, string>) };
    if (args.method !== 'GET' && args.method !== 'HEAD') {
      const csrf = readCookie(CSRF_COOKIE);
      if (csrf) headers['x-aura-csrf'] = csrf;
    }
    return tsRestFetchApi({ ...args, headers, credentials: 'include' });
  },
});

/**
 * ts-rest loses the typed `params` field for path-param routes when this large
 * contract is imported across the workspace package boundary (path literals
 * widen to `string`, so `:param` inference yields nothing). At runtime the
 * client still substitutes the URL correctly and the server validates with Zod.
 *
 * This helper restores call ergonomics for those routes: the response stays
 * fully typed (so `unwrap` narrows correctly); only the request args are loose.
 */
export function rpc<R>(
  route: (args: never) => Promise<R>,
  args: { params?: Record<string, string>; query?: Record<string, unknown>; body?: unknown },
): Promise<R> {
  return (route as unknown as (a: unknown) => Promise<R>)(args);
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** Narrow a ts-rest result to its success body, throwing a typed error otherwise. */
export function unwrap<T extends { status: number; body: unknown }>(
  result: T,
): Extract<T, { status: 200 | 201 }>['body'] {
  if (result.status === 200 || result.status === 201) {
    return result.body as Extract<T, { status: 200 | 201 }>['body'];
  }
  const body = result.body as ApiError | undefined;
  throw new ApiClientError(
    result.status,
    body?.message ?? 'Request failed.',
    body?.code,
    body?.fields,
  );
}

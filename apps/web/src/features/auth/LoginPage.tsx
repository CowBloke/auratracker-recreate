import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ApiClientError, api, unwrap } from '../../lib/api';
import { useAuth } from '../../stores/auth';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Input';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = unwrap(await api.auth.login({ body: { identifier, password } }));
      setUser(user);
      if (user.status === 'BANNED') navigate({ to: '/banned' });
      else if (user.status !== 'ACTIVE') navigate({ to: '/pending' });
      else navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
      <p className="mt-1 text-sm text-muted">Sign in to your AuraTracker account.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Username or email">
          {(id) => (
            <Input
              id={id}
              autoFocus
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="nova"
            />
          )}
        </Field>
        <Field label="Password">
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          )}
        </Field>

        {error && <p className="rounded-lg bg-rose/10 px-3 py-2 text-sm text-rose ring-1 ring-rose/20">{error}</p>}

        <Button type="submit" fullWidth loading={loading} size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/register" className="font-medium text-aura hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-6 rounded-xl border border-line-soft bg-base-2/50 p-3 text-xs text-faint">
        <span className="font-medium text-muted">Demo:</span> admin / Password123 · or nova, pixel, echo
      </div>
    </AuthLayout>
  );
}

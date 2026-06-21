import { RegisterInput } from '@aura/contracts';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ApiClientError, api, unwrap } from '../../lib/api';
import { toast } from '../../stores/ui';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { AuthLayout } from './AuthLayout';

type Form = Record<string, string>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const cleaned = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
    const parsed = RegisterInput.safeParse(cleaned);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) fe[issue.path.join('.')] = issue.message;
      setErrors(fe);
      return;
    }
    setLoading(true);
    try {
      unwrap(await api.auth.register({ body: parsed.data }));
      toast({ title: 'Account created!', description: 'An admin will review it shortly.', variant: 'success' });
      navigate({ to: '/login' });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields ?? { username: err.message });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-2xl font-semibold">Create your account</h2>
      <p className="mt-1 text-sm text-muted">New accounts are reviewed by an admin before activation.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username" error={errors.username}>
            {(id) => <Input id={id} value={form.username ?? ''} onChange={set('username')} placeholder="nova" />}
          </Field>
          <Field label="First name" error={errors.firstName}>
            {(id) => <Input id={id} value={form.firstName ?? ''} onChange={set('firstName')} placeholder="Nina" />}
          </Field>
        </div>
        <Field label="Email" error={errors.email}>
          {(id) => <Input id={id} type="email" value={form.email ?? ''} onChange={set('email')} placeholder="you@school.edu" />}
        </Field>
        <Field label="Password" error={errors.password} hint="8+ chars, with upper, lower & a number.">
          {(id) => <Input id={id} type="password" value={form.password ?? ''} onChange={set('password')} placeholder="••••••••" />}
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="School" error={errors.school}>
            {(id) => <Input id={id} value={form.school ?? ''} onChange={set('school')} placeholder="Lycée" />}
          </Field>
          <Field label="Level" error={errors.schoolLevel}>
            {(id) => <Input id={id} value={form.schoolLevel ?? ''} onChange={set('schoolLevel')} placeholder="Tle" />}
          </Field>
          <Field label="Class" error={errors.classLetter}>
            {(id) => <Input id={id} value={form.classLetter ?? ''} onChange={set('classLetter')} placeholder="A" />}
          </Field>
        </div>
        <Field label="Why do you want to join?" error={errors.motivation}>
          {(id) => (
            <Textarea
              id={id}
              rows={2}
              value={form.motivation ?? ''}
              onChange={set('motivation')}
              placeholder="Tell the admins a bit about you…"
            />
          )}
        </Field>

        <Button type="submit" fullWidth loading={loading} size="lg">
          Request access
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-aura hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

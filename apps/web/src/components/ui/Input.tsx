import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';

const fieldBase =
  'w-full rounded-xl bg-base-2/60 border border-line px-3.5 py-2.5 text-sm text-ink placeholder:text-faint ' +
  'transition-colors focus:border-aura/70 focus:bg-base-2 outline-none';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, 'resize-none', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-muted">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-xs text-rose">{error}</p>
      ) : hint ? (
        <p className="text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

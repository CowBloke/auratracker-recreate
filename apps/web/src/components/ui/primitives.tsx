import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Icon } from './Icon';

export function Card({ className, hover, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={cn('card noise overflow-hidden', hover && 'card-hover', className)} {...props}>
      {children}
    </div>
  );
}

const pillTones: Record<string, string> = {
  aura: 'text-aura bg-aura/10 ring-aura/30',
  cyan: 'text-cyan bg-cyan/10 ring-cyan/30',
  emerald: 'text-emerald bg-emerald/10 ring-emerald/30',
  amber: 'text-amber bg-amber/10 ring-amber/30',
  rose: 'text-rose bg-rose/10 ring-rose/30',
  muted: 'text-muted bg-white/5 ring-white/10',
};

export function Pill({
  tone = 'muted',
  icon,
  children,
  className,
}: {
  tone?: keyof typeof pillTones;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
        pillTones[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} className="size-3.5" />}
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  icon,
  tone = 'aura',
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
  tone?: keyof typeof pillTones;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-faint">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <span className={cn('grid size-10 place-items-center rounded-xl ring-1', pillTones[tone])}>
          <Icon name={icon} className="size-5" />
        </span>
      </div>
    </Card>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-aura', className)} />;
}

export function FullSpinner({ label }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Spinner className="size-7" />
        {label && <p className="text-sm">{label}</p>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg bg-white/5', className)} />;
}

export function EmptyState({
  icon = 'Inbox',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center"
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-aura/10 text-aura ring-1 ring-aura/20">
        <Icon name={icon} className="size-7" />
      </span>
      <h3 className="font-display text-lg">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action}
    </motion.div>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { type Toast, useUi } from '../../stores/ui';
import { Icon } from './Icon';

const tone: Record<NonNullable<Toast['variant']>, string> = {
  default: 'ring-line',
  success: 'ring-emerald/40',
  error: 'ring-rose/40',
  aura: 'ring-aura/50',
};
const accent: Record<NonNullable<Toast['variant']>, string> = {
  default: 'text-muted',
  success: 'text-emerald',
  error: 'text-rose',
  aura: 'text-aura',
};

export function Toaster() {
  const { toasts, dismissToast } = useUi();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((t) => {
          const v = t.variant ?? 'default';
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className={cn('glass pointer-events-auto flex items-start gap-3 rounded-2xl p-3.5 ring-1', tone[v])}
            >
              <span className={cn('mt-0.5 shrink-0', accent[v])}>
                <Icon name={t.icon ?? (v === 'aura' ? 'Sparkles' : v === 'success' ? 'CheckCircle2' : v === 'error' ? 'AlertCircle' : 'Bell')} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
              </div>
              <button onClick={() => dismissToast(t.id)} className="text-faint transition hover:text-ink">
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

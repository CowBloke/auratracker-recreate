import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export function Page({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn('space-y-6', className)}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {title && <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </motion.div>
  );
}

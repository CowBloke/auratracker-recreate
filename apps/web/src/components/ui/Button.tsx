import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'ghost' | 'outline' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-br from-aura to-aura-deep hover:brightness-110 ring-1 ring-white/10 shadow-[0_8px_30px_-10px_var(--color-aura)]',
  danger:
    'text-white bg-gradient-to-br from-rose to-red-600 hover:brightness-110 ring-1 ring-white/10',
  outline: 'text-ink border border-line hover:border-aura/60 hover:bg-white/[0.03]',
  subtle: 'text-ink bg-white/[0.05] hover:bg-white/[0.09] border border-white/5',
  ghost: 'text-muted hover:text-ink hover:bg-white/[0.05]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-13 px-7 text-base rounded-2xl gap-2.5',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'inline-flex items-center justify-center font-medium select-none',
        'transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </motion.button>
  ),
);
Button.displayName = 'Button';

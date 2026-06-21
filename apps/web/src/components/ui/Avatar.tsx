import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-16 text-xl', xl: 'size-24 text-3xl' };

export function Avatar({
  username,
  color,
  src,
  size = 'md',
  className,
  ring,
}: {
  username: string;
  color?: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold text-white',
        sizes[size],
        ring && 'ring-2 ring-offset-2 ring-offset-base',
        className,
      )}
      style={{
        background: src
          ? undefined
          : `linear-gradient(135deg, ${color ?? '#a78bfa'}, color-mix(in oklab, ${color ?? '#a78bfa'} 40%, #000))`,
        ...(ring ? ({ '--tw-ring-color': color ?? '#a78bfa' } as React.CSSProperties) : {}),
      }}
    >
      {src ? (
        <img src={src} alt={username} className="size-full object-cover" />
      ) : (
        initials(username)
      )}
    </span>
  );
}

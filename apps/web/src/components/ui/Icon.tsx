import * as Lucide from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type IconComponent = (props: LucideProps) => React.ReactNode;

/**
 * Render a lucide icon by its string name. Registries (games, badges) store
 * icon names as strings, so this bridges those to actual components. Falls back
 * to a sparkle if a name is unknown.
 */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const lib = Lucide as unknown as Record<string, IconComponent>;
  const Cmp = (lib[name] ?? lib.Sparkles) as IconComponent;
  return <Cmp {...props} />;
}

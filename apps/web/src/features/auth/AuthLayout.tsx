import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: '🎮', text: 'Play games, earn money & aura' },
  { icon: '🏆', text: 'Climb live leaderboards' },
  { icon: '🎁', text: 'Gift aura to your friends' },
  { icon: '🛡️', text: 'A private, moderated community' },
];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-line-soft lg:block">
        <div className="absolute inset-0">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: 380,
                height: 380,
                background: ['#7c3aed', '#38bdf8', '#34d399'][i],
                opacity: 0.18,
                left: `${[5, 50, 30][i]}%`,
                top: `${[10, 40, 70][i]}%`,
              }}
              animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
              transition={{ duration: 18 + i * 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-aura to-aura-deep ring-1 ring-white/20">
              <Sparkles className="size-6 text-white" />
            </span>
            <span className="font-display text-2xl font-semibold">
              Aura<span className="aura-text">Tracker</span>
            </span>
          </div>
          <div className="space-y-6">
            <h1 className="max-w-md font-display text-4xl font-semibold leading-tight">
              Your school's own <span className="aura-text">social gaming</span> universe.
            </h1>
            <ul className="space-y-3">
              {HIGHLIGHTS.map((h, i) => (
                <motion.li
                  key={h.text}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 text-muted"
                >
                  <span className="text-xl">{h.icon}</span>
                  {h.text}
                </motion.li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-faint">A foundation prototype · built on the AuraTracker rebuild stack.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

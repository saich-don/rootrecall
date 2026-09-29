'use client';

import * as React from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex bg-[var(--color-surface-2)] p-1 rounded-lg w-[140px] h-8"></div>;
  }

  return (
    <div className="flex bg-[var(--color-surface-2)] p-1 rounded-lg border border-[var(--color-border-subtle)]">
      <button
        onClick={() => setTheme('light')}
        className={`flex-1 flex items-center justify-center p-1 rounded-md text-xs transition-colors ${
          theme === 'light'
            ? 'bg-[var(--color-surface-1)] shadow-sm text-foreground'
            : 'text-[var(--color-text-muted)] hover:text-foreground'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex-1 flex items-center justify-center p-1 rounded-md text-xs transition-colors ${
          theme === 'dark'
            ? 'bg-[var(--color-surface-1)] shadow-sm text-foreground'
            : 'text-[var(--color-text-muted)] hover:text-foreground'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`flex-1 flex items-center justify-center p-1 rounded-md text-xs transition-colors ${
          theme === 'system'
            ? 'bg-[var(--color-surface-1)] shadow-sm text-foreground'
            : 'text-[var(--color-text-muted)] hover:text-foreground'
        }`}
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

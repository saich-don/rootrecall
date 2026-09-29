'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { AppShell } from '@/components/app-shell';

export default function Home() {
  const initializeWithSeedData = useAppStore((s) => s.initializeWithSeedData);

  useEffect(() => {
    initializeWithSeedData();
  }, [initializeWithSeedData]);

  return <AppShell />;
}

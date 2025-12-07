'use client';

import { AppShell } from '@/components/layout';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

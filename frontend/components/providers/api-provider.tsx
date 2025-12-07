'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthProvider } from '@/lib/api-client';

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthProvider(getToken);
  }, [getToken]);

  return <>{children}</>;
}

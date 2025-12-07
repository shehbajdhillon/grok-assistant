'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthProvider } from '@/lib/api-client';

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    // Wrap getToken to specify the JWT template name
    const getTokenWithTemplate = async () => {
      return getToken({ template: 'digipal_server' });
    };
    setAuthProvider(getTokenWithTemplate);
  }, [getToken]);

  return <>{children}</>;
}

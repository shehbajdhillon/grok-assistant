'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState, createContext, useContext } from 'react';
import { setAuthProvider } from '@/lib/api-client';

const AuthReadyContext = createContext(false);

export function useAuthReady() {
  return useContext(AuthReadyContext);
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    // Wrap getToken to specify the JWT template name
    const getTokenWithTemplate = async () => {
      return getToken({ template: 'digipal_server' });
    };
    setAuthProvider(getTokenWithTemplate);
    setAuthReady(true);
    console.log('Auth provider initialized');
  }, [getToken, isLoaded]);

  return (
    <AuthReadyContext.Provider value={authReady}>
      {children}
    </AuthReadyContext.Provider>
  );
}

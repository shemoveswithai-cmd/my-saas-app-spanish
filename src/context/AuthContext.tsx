import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  avatarUrl?: string;
  isAdmin: boolean;
}

export interface Subscription {
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'none';
  plan?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSubscribed: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = '/api';

  const refreshUser = async () => {
    try {
      const res = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSubscription(data.subscription);
      } else {
        setUser(null);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      setSubscription(null);
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await res.json();
    setUser(data.user);
    setSubscription(data.subscription);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const res = await fetch(`${apiUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data = await res.json();
    setUser(data.user);
    setSubscription({ status: 'inactive' });
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await fetch(`${apiUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Google login failed');
    }

    const data = await res.json();
    setUser(data.user);
    setSubscription(data.subscription);
  };

  const logout = async () => {
    await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
    setSubscription(null);
  };

  const isSubscribed = subscription?.status === 'active' || user?.isAdmin === true;

  return (
    <AuthContext.Provider value={{
      user,
      subscription,
      loading,
      login,
      signup,
      loginWithGoogle,
      logout,
      refreshUser,
      isSubscribed
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

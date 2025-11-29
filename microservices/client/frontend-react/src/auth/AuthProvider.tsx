import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AuthApi, setToken, getToken } from '../lib/api';

interface UserInfo {
  id?: string;
  email: string;
  role?: 'admin' | 'cashier' | 'teacher';
}

interface AuthContextValue {
  user: UserInfo | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role?: UserInfo['role']) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const me = await AuthApi.me();
        if (me?.user) setUser(me.user);
      } catch (_) {
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const res = await AuthApi.login(email, password);
    setUser(res?.user || { email });
  };

  const register = async (email: string, password: string, role: UserInfo['role'] = 'teacher') => {
    setError(null);
    await AuthApi.register(email, password, role);
    await login(email, password);
  };

  const logout = async () => {
    await AuthApi.logout();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(() => ({ user, loading, error, login, register, logout }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

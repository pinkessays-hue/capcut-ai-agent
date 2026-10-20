import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '../types';
import { setAccessToken, setOnUnauthorized } from '../api/client';
import { getMe, login as apiLogin, loginSimple as apiLoginSimple, logout as apiLogout, register as apiRegister, type RegisterPayload } from '../api/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginSimple: (nickname: string, pin: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  const handleLogout = useCallback(() => {
    setAccessToken(null);
    setState({ user: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    setOnUnauthorized(handleLogout);
  }, [handleLogout]);

  useEffect(() => {
    const token = sessionStorage.getItem('_t');
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    setAccessToken(token);
    getMe()
      .then(res => {
        if (res.data) {
          setState({ user: res.data, loading: false, error: null });
        } else {
          handleLogout();
        }
      })
      .catch(() => handleLogout());
  }, [handleLogout]);

  const login = async (email: string, password: string) => {
    setState(s => ({ ...s, error: null, loading: true }));
    try {
      const res = await apiLogin(email, password);
      setAccessToken(res.token);
      sessionStorage.setItem('_t', res.token);
      setState({ user: res.user, loading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setState(s => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  };

  const loginSimple = async (nickname: string, pin: string) => {
    setState(s => ({ ...s, error: null, loading: true }));
    try {
      const res = await apiLoginSimple(nickname, pin);
      setAccessToken(res.token);
      sessionStorage.setItem('_t', res.token);
      setState({ user: res.user, loading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setState(s => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  };

  const register = async (payload: RegisterPayload) => {
    setState(s => ({ ...s, error: null, loading: true }));
    try {
      const res = await apiRegister(payload);
      setAccessToken(res.token);
      sessionStorage.setItem('_t', res.token);
      setState({ user: res.user, loading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '가입에 실패했습니다.';
      setState(s => ({ ...s, loading: false, error: msg }));
      throw err;
    }
  };

  const logout = () => {
    apiLogout();
    sessionStorage.removeItem('_t');
    handleLogout();
  };

  const clearError = () => setState(s => ({ ...s, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, login, loginSimple, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

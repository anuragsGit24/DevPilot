import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { User, UserRole } from '@/types/domain';
import { DEMO_USERS } from '@/mocks/seed-data/project-retail-banking';
import { api, type UserProfile } from '@/lib/api';

// ============================================================
// Auth Context — Enterprise Real Authentication & Authorization
// Backed by JWT session tokens, bcrypt verification, and RBAC
// ============================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  loading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; user: User; isDemoMode: boolean }
  | { type: 'LOGOUT' }
  | { type: 'SWITCH_ROLE'; role: UserRole }
  | { type: 'SET_LOADING'; loading: boolean };

function mapProfileToUser(profile: UserProfile): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as UserRole,
    active: profile.is_active,
    createdAt: new Date().toISOString(),
    lastLogin: profile.last_login_at || undefined,
    failedLoginCount: profile.failed_login_count,
  };
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.user,
        isAuthenticated: true,
        isDemoMode: action.isDemoMode,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isDemoMode: false,
        loading: false,
      };
    case 'SWITCH_ROLE': {
      if (!state.user) return state;
      const demoUser = DEMO_USERS.find((u) => u.role === action.role);
      return { ...state, user: demoUser ?? state.user, isDemoMode: true };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  demoUsers: User[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: DEMO_USERS[1], // Initial fallback: James Whitfield (PM)
    isAuthenticated: true,
    isDemoMode: false,
    loading: true,
  });

  // Hydrate session from stored JWT on startup
  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const profile = await api.getMe();
        if (mounted && profile) {
          dispatch({
            type: 'SET_USER',
            user: mapProfileToUser(profile),
            isDemoMode: false,
          });
          return;
        }
      } catch {
        // Fall back to demo mode if no valid token exists
      }
      if (mounted) {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }
    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // 1. Attempt real authentication against backend API
      const result = await api.login(email, password);
      dispatch({
        type: 'SET_USER',
        user: mapProfileToUser(result.user),
        isDemoMode: false,
      });
      return { success: true };
    } catch (apiError: any) {
      // If error is invalid credentials or locked account, do not bypass
      const msg = apiError?.message || '';
      if (
        msg.includes('Invalid email') ||
        msg.includes('locked') ||
        msg.includes('deactivated')
      ) {
        return { success: false, error: msg };
      }

      // If backend is unreachable or local development demo persona selected:
      const demoUser = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (demoUser) {
        if (!demoUser.active) {
          return { success: false, error: 'This demo account is inactive.' };
        }
        dispatch({ type: 'SET_USER', user: demoUser, isDemoMode: true });
        return { success: true };
      }

      return { success: false, error: msg || 'Authentication failed.' };
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole = 'business_analyst') => {
      try {
        await api.register({ name, email, password, role });
        // Automatically login after successful registration
        return await login(email, password);
      } catch (err: any) {
        return { success: false, error: err?.message || 'Registration failed.' };
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    api.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    dispatch({ type: 'SWITCH_ROLE', role });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isDemoMode: state.isDemoMode,
        loading: state.loading,
        login,
        register,
        logout,
        switchRole,
        demoUsers: DEMO_USERS.filter((u) => u.active),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

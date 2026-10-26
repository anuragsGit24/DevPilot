import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { User, UserRole } from '@/types/domain';
import { api, type UserProfile } from '@/lib/api';

// ============================================================
// Auth Context — Enterprise Real Authentication & Authorization
// Backed by JWT session tokens, bcrypt verification, and RBAC
// ============================================================

const DEMO_PERSONA_EMAILS = new Set([
  'admin@devpilot.demo',
  'pm@devpilot.demo',
  'ba@devpilot.demo',
  'dev@devpilot.demo',
  'qa@devpilot.demo',
]);

function isDemoPersona(email: string): boolean {
  return DEMO_PERSONA_EMAILS.has(email.trim().toLowerCase());
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  loading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; user: User; isDemoMode: boolean }
  | { type: 'LOGOUT' }
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
    user: null,
    isAuthenticated: false,
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
            isDemoMode: isDemoPersona(profile.email),
          });
          return;
        }
      } catch {
        api.clearTokens();
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
        isDemoMode: isDemoPersona(result.user.email),
      });
      return { success: true };
    } catch (apiError: unknown) {
      const message = apiError instanceof Error ? apiError.message : 'Unable to reach the authentication service.';
      return {
        success: false,
        error: message,
      };
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole = 'business_analyst') => {
      try {
        await api.register({ name, email, password, role });
        // Automatically login after successful registration
        return await login(email, password);
      } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'Registration failed.' };
      }
    },
    [login],
  );

  const logout = useCallback(() => {
    api.logout();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    // Roles are issued by the backend and cannot be changed in the browser.
    void role;
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
        demoUsers: [],
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

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { User, UserRole } from '@/types/domain';
import { DEMO_USERS } from '@/mocks/seed-data/project-retail-banking';

// ============================================================
// Auth Context — Demo Mode Only
// No real authentication, JWT, or session security.
// ============================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'SWITCH_ROLE'; role: UserRole };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.user, isAuthenticated: true, isDemoMode: true };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    case 'SWITCH_ROLE': {
      if (!state.user) return state;
      const demoUser = DEMO_USERS.find((u) => u.role === action.role);
      return { ...state, user: demoUser ?? state.user };
    }
    default:
      return state;
  }
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, _password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  demoUsers: User[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: DEMO_USERS[1], // James Whitfield (PM)
    isAuthenticated: true,
    isDemoMode: true,
  });

  const login = useCallback(async (email: string, _password: string) => {
    // Demo mode: find user by email, accept any password
    const user = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'No demo account found with that email address.' };
    }
    if (!user.active) {
      return { success: false, error: 'This account is inactive. Contact your administrator.' };
    }
    dispatch({ type: 'LOGIN', user });
    return { success: true };
  }, []);

  const logout = useCallback(() => {
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
        login,
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

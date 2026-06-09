import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ApiError, apiClient, type ApiClientOptions } from "../lib/api-client";
import { readStoredAuthSession, type StoredAuthSession, writeStoredAuthSession } from "../lib/auth-storage";
import type { ApiResponse, AuthTokens, AuthUser } from "../types/api";

type AuthPayload = {
  user: AuthUser;
  tokens: AuthTokens;
};

type LoginResponse = ApiResponse<AuthPayload>;
type RegisterResponse = ApiResponse<AuthPayload>;
type RefreshResponse = ApiResponse<{ tokens: AuthTokens }>;

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};

type AuthorizedRequest = <TResponse>(path: string, options?: ApiClientOptions) => Promise<TResponse>;

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUserSession: (user: AuthUser) => Promise<void>;
  authorizedRequest: AuthorizedRequest;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let refreshPromise: Promise<StoredAuthSession> | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const storedSession = await readStoredAuthSession();

      if (isMounted) {
        setSession(storedSession);
        setIsReady(true);
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = useCallback(async (nextSession: StoredAuthSession | null) => {
    setSession(nextSession);
    await writeStoredAuthSession(nextSession);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiClient<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      const nextSession: StoredAuthSession = {
        user: response.data.user,
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken
      };

      await persistSession(nextSession);
    },
    [persistSession]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await apiClient<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          password: input.password,
          phone: input.phone || undefined
        })
      });

      const nextSession: StoredAuthSession = {
        user: response.data.user,
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken
      };

      await persistSession(nextSession);
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    const currentSession = session;

    if (currentSession?.refreshToken) {
      await apiClient("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
        token: currentSession.accessToken
      }).catch(() => {
        // Local logout should still complete when the server session is already invalid.
      });
    }

    await persistSession(null);
  }, [persistSession, session]);

  const updateUserSession = useCallback(async (user: AuthUser) => {
    if (!session) return;
    const nextSession: StoredAuthSession = {
      ...session,
      user
    };
    await persistSession(nextSession);
  }, [persistSession, session]);

  const refreshSession = useCallback(async () => {
    if (!session?.refreshToken) {
      throw new Error("Session has expired");
    }

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const refreshResponse = await apiClient<RefreshResponse>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken: session.refreshToken })
        });

        const nextSession: StoredAuthSession = {
          ...session,
          accessToken: refreshResponse.data.tokens.accessToken,
          refreshToken: refreshResponse.data.tokens.refreshToken
        };

        await persistSession(nextSession);
        return nextSession;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }, [persistSession, session]);

  const authorizedRequest = useCallback<AuthorizedRequest>(
    async (path, options = {}) => {
      if (!session?.accessToken) {
        throw new Error("Authentication is required");
      }

      try {
        return await apiClient(path, {
          ...options,
          token: session.accessToken
        });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401 || !session.refreshToken) {
          throw error;
        }

        try {
          const refreshedSession = await refreshSession();

          return apiClient(path, {
            ...options,
            token: refreshedSession.accessToken
          });
        } catch (refreshError) {
          await persistSession(null);
          throw refreshError;
        }
      }
    },
    [persistSession, refreshSession, session]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isReady,
      isAuthenticated: Boolean(session?.accessToken),
      login,
      register,
      logout,
      updateUserSession,
      authorizedRequest
    }),
    [authorizedRequest, isReady, login, logout, register, updateUserSession, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

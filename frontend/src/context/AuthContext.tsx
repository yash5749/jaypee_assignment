import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UserDto } from "../../../shared/types";
import { login, me, register, updateProfile } from "../services/auth";
import { setAuthToken, setUnauthorizedHandler } from "../services/api";
import { connectSocket, disconnectSocket } from "../sockets/socket";

interface AuthContextValue {
  user: UserDto | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<UserDto>;
  logout: () => void;
}

const TOKEN_KEY = "studyroom_token";

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback((value: string | null) => {
    if (value) {
      localStorage.setItem(TOKEN_KEY, value);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setAuthToken(value);
    setToken(value);
  }, []);

  const clearAuthState = useCallback(() => {
    persistToken(null);
    setUser(null);
    disconnectSocket();
  }, [persistToken]);

  useEffect(() => {
    setUnauthorizedHandler(clearAuthState);
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearAuthState]);

  useEffect(() => {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (!existing) {
      setLoading(false);
      return;
    }

    setAuthToken(existing);
    setToken(existing);
    connectSocket(existing);

    me()
      .then((current) => {
        setUser(current);
      })
      .catch(() => {
        clearAuthState();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clearAuthState, persistToken]);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const result = await login({ email, password });
      persistToken(result.token);
      setUser(result.user);
      connectSocket(result.token);
    },
    [persistToken]
  );

  const handleRegister = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await register({ name, email, password });
      persistToken(result.token);
      setUser(result.user);
      connectSocket(result.token);
    },
    [persistToken]
  );

  const handleLogout = useCallback(() => {
    clearAuthState();
  }, [clearAuthState]);

  const handleUpdateProfile = useCallback(async (name: string, email: string) => {
    const updated = await updateProfile({ name, email });
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login: handleLogin,
      register: handleRegister,
      updateProfile: handleUpdateProfile,
      logout: handleLogout,
    }),
    [handleLogin, handleLogout, handleRegister, handleUpdateProfile, loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

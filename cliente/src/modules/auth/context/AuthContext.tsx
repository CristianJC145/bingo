import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthUser, fetchProfile, login as loginRequest } from "../services/auth.service";
import { TokenService } from "../../../shared/services/token.service";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const tokenService = new TokenService();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tokenService.get()) { setIsLoading(false); return; }
    fetchProfile()
      .then(setUser)
      .catch(() => { tokenService.delete(); setUser(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const { token, user: authUser } = await loginRequest(username, password);
    tokenService.set(token);
    setUser(authUser);
  }, []);

  const signOut = useCallback(() => {
    tokenService.delete();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAdmin: user?.role === "admin", signIn, signOut }),
    [user, isLoading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};

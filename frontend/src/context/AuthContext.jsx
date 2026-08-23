import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService.js";
import { setAuthToken } from "../services/api.js";
import { connectSocket, disconnectSocket } from "../services/socket.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    authService
      .getMe()
      .then((me) => {
        setUser(me);
        setIsAuthenticated(true);
        connectSocket(me._id);
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password });
    setAuthToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    connectSocket(data.user._id);
    return data.user;
  }, []);

  const completeRegistration = useCallback(async (payload) => {
    const data = await authService.verifyRegistrationOtp(payload);
    setAuthToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    connectSocket(data.user._id);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential, role) => {
    const data = await authService.googleAuth({ credential, role });
    setAuthToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    connectSocket(data.user._id);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      disconnectSocket();
    }
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  const value = {
    user,
    isAuthenticated,
    checkingSession,
    login,
    completeRegistration,
    loginWithGoogle,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

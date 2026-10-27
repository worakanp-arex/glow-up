import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authService from "../services/authService.js";
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

  // A new sign-in must not inherit the live connection of whoever was signed in
  // before in this tab: reconnect so notifications follow the new account.
  const startSession = useCallback((signedInUser) => {
    disconnectSocket();
    setUser(signedInUser);
    setIsAuthenticated(true);
    connectSocket(signedInUser._id);
    return signedInUser;
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password });
    return startSession(data.user);
  }, [startSession]);

  const completeRegistration = useCallback(async (payload) => {
    const data = await authService.verifyRegistrationOtp(payload);
    return startSession(data.user);
  }, [startSession]);

  const loginWithGoogle = useCallback(async (credential, role, pdpaConsent) => {
    const data = await authService.googleAuth({ credential, role, pdpaConsent });
    return startSession(data.user);
  }, [startSession]);

  // The session is the server's cookie, which only the server can clear. If the
  // request fails (network, server down) the person is still signed in on this
  // device, so say so rather than showing a signed-out screen that comes back
  // to life on reload; the caller handles the error.
  // A 401 means the session had already ended, which is what was wanted.
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      if (error.response?.status !== 401) throw error;
    }
    setUser(null);
    setIsAuthenticated(false);
    disconnectSocket();
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

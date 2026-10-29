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

  // การล็อกอินใหม่ต้องไม่สืบทอดการเชื่อมต่อสดของผู้ที่ล็อกอินอยู่ก่อนหน้า
  // ในแท็บนี้: เชื่อมต่อใหม่เพื่อให้การแจ้งเตือนตามบัญชีใหม่
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

  // เซสชันคือ cookie ของเซิร์ฟเวอร์ ซึ่งมีเพียงเซิร์ฟเวอร์ที่ล้างได้ หาก
  // คำขอล้มเหลว (เครือข่าย เซิร์ฟเวอร์ล่ม) ผู้ใช้ยังล็อกอินอยู่บน
  // อุปกรณ์นี้ จึงบอกตามจริง แทนที่จะแสดงหน้าจอที่ออกจากระบบแล้วซึ่งกลับ
  // มาเป็นล็อกอินเมื่อโหลดใหม่ ผู้เรียกจัดการ error เอง
  // 401 หมายถึงเซสชันสิ้นสุดไปแล้ว ซึ่งก็คือสิ่งที่ต้องการ
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

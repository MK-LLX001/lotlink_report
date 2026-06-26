"use client";
import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getUserProfile, type AppUser, ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS } from "@/lib/authService";
import { subscribeToMenus, type AppMenu } from "@/lib/menuService";

const IDLE_TIMEOUT_MS    = 8*20 * 60 * 1000; // 20 นาที ไม่มีการเคลื่อนไหว
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 ชั่วโมง นับจาก login

const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

interface AuthCtx {
  user:    AppUser | null;
  loading: boolean;
  menus:   AppMenu[];
  perm:    (key: string) => boolean;
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true, menus: [], perm: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [menus,   setMenus]   = useState<AppMenu[]>([]);
  const profileUnsubRef  = useRef<(() => void) | null>(null);
  const menusUnsubRef    = useRef<(() => void) | null>(null);
  const idleTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forceSignOut = useCallback(async () => {
    idleTimerRef.current    && clearTimeout(idleTimerRef.current);
    sessionTimerRef.current && clearTimeout(sessionTimerRef.current);
    profileUnsubRef.current?.();
    profileUnsubRef.current = null;
    menusUnsubRef.current?.();
    menusUnsubRef.current = null;
    setUser(null);
    setMenus([]);
    await signOut(auth);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => forceSignOut(), IDLE_TIMEOUT_MS);
  }, [forceSignOut]);

  const startSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = setTimeout(() => forceSignOut(), SESSION_TIMEOUT_MS);
  }, [forceSignOut]);

  // ติด/ถอด event listeners สำหรับ idle detection
  useEffect(() => {
    if (!user) {
      // ไม่มี user — หยุด timers และถอด listeners ทั้งหมด
      idleTimerRef.current    && clearTimeout(idleTimerRef.current);
      sessionTimerRef.current && clearTimeout(sessionTimerRef.current);
      IDLE_EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer));
      return;
    }
    // มี user — เริ่ม timers และติด listeners
    resetIdleTimer();
    startSessionTimer();
    IDLE_EVENTS.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    return () => {
      idleTimerRef.current    && clearTimeout(idleTimerRef.current);
      IDLE_EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [user, resetIdleTimer, startSessionTimer]);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      // cleanup ก่อนเสมอ
      profileUnsubRef.current?.();
      profileUnsubRef.current = null;
      menusUnsubRef.current?.();
      menusUnsubRef.current = null;

      if (fbUser) {
        // Initial profile fetch
        const profile = await getUserProfile(fbUser.uid);
        if (!profile || !profile.active) {
          setUser(null);
          setMenus([]);
          setLoading(false);
          await signOut(auth);
          return;
        }
        setUser(profile);
        setLoading(false);

        // Realtime: user profile (permissions, active status)
        const userDocRef = doc(db, "users", fbUser.uid);
        profileUnsubRef.current = onSnapshot(userDocRef, async (snap) => {
          if (!snap.exists()) {
            setUser(null);
            setMenus([]);
            await signOut(auth);
            return;
          }
          const data = snap.data();
          if (!data.active) {
            setUser(null);
            setMenus([]);
            await signOut(auth);
            return;
          }
          const isAdmin = data.isAdmin === true || data.role === "admin";
          setUser({
            uid:         fbUser.uid,
            email:       data.email       ?? "",
            displayName: data.displayName ?? "",
            isAdmin,
            active:      data.active ?? true,
            permissions: isAdmin
              ? { ...ADMIN_PERMISSIONS }
              : { ...DEFAULT_PERMISSIONS, ...(data.permissions ?? {}) },
            createdAt:   data.createdAt,
          });
        });


        menusUnsubRef.current = subscribeToMenus((m) => setMenus(m));

      } else {
        setUser(null);
        setMenus([]);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      profileUnsubRef.current?.();
      menusUnsubRef.current?.();
      idleTimerRef.current    && clearTimeout(idleTimerRef.current);
      sessionTimerRef.current && clearTimeout(sessionTimerRef.current);
    };
  }, []);

  const perm = (key: string): boolean => {
    if (!user) return false;
    if (user.isAdmin) return true;
    return user.permissions[key] === true;
  };

  return (
    <AuthContext.Provider value={{ user, loading, menus, perm }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "gestor" | "colaborador" | "cliente";

const ALL_MODULES = { hub: true, board: true, comercial: true, marketing: true, cs: true, financeiro: true };
const DEFAULT_MODULES = { hub: true, board: true, comercial: false, marketing: false, cs: false, financeiro: false };

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  allowedModules: Record<string, boolean>;
  loading: boolean;
  isAdmin: boolean;
  canWrite: boolean;
  canAccessModule: (module: string) => boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  roles: [],
  allowedModules: DEFAULT_MODULES,
  loading: true,
  isAdmin: false,
  canWrite: false,
  canAccessModule: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allowedModules, setAllowedModules] = useState<Record<string, boolean>>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);

  const loadAccess = async (_uid: string, email: string) => {
    try {
      const { data: accessData } = await supabase
        .from("user_access" as never)
        .select("modules, role")
        .eq("email", email)
        .maybeSingle();
      const access = accessData as { role: Role; modules: Record<string, boolean> } | null;
      const role: Role = access?.role ?? "colaborador";
      setRoles([role]);
      if (role === "admin") {
        setAllowedModules(ALL_MODULES);
      } else if (access?.modules && Object.keys(access.modules).length > 0) {
        setAllowedModules({ hub: true, ...access.modules });
      } else {
        setAllowedModules(DEFAULT_MODULES);
      }
    } catch {
      setAllowedModules({ hub: true, board: false, comercial: false, marketing: false, cs: false, financeiro: false });
    }
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) loadAccess(s.user.id, s.user.email ?? "").finally(() => setLoading(false));
        else setLoading(false);
      })
      .catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadAccess(s.user.id, s.user.email ?? "");
      else { setRoles([]); setAllowedModules(DEFAULT_MODULES); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const canWrite = roles.includes("admin") || roles.includes("gestor");

  const canAccessModule = useCallback(
    (module: string) => isAdmin || !!allowedModules[module],
    [isAdmin, allowedModules]
  );

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ user, session, roles, allowedModules, loading, isAdmin, canWrite, canAccessModule, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

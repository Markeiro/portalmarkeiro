import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/types";

const DEFAULT_MODULES: Record<string, boolean> = {
  dashboard: true,
  crm: false,
  clientes: false,
  campanhas: false,
  metricas: false,
  conteudo: false,
  automacao: false,
  configuracoes: false,
};

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  allowedModules: Record<string, boolean>;
  loading: boolean;
  isAdmin: boolean;
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
  canAccessModule: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allowedModules, setAllowedModules] = useState<Record<string, boolean>>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);

  const loadAccess = async (uid: string, email: string) => {
    try {
      const [{ data: roleData }, { data: accessData }] = await Promise.all([
        supabase.from("user_roles" as never).select("role").eq("user_id", uid),
        supabase.from("user_access" as never).select("modules, role").eq("email", email).maybeSingle(),
      ]);
      const fetchedRoles: Role[] = ((roleData as { role: Role }[] | null)?.map((r) => r.role) ?? []);
      setRoles(fetchedRoles);
      if (fetchedRoles.includes("admin")) {
        setAllowedModules(Object.fromEntries(Object.keys(DEFAULT_MODULES).map((k) => [k, true])));
      } else if ((accessData as unknown as { modules: Record<string, boolean> } | null)?.modules) {
        setAllowedModules({ dashboard: true, ...(accessData as unknown as { modules: Record<string, boolean> }).modules });
      } else {
        setAllowedModules({ dashboard: true, clientes: true, campanhas: true, metricas: true });
      }
    } catch {
      setAllowedModules({ dashboard: true });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadAccess(s.user.id, s.user.email ?? "").finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadAccess(s.user.id, s.user.email ?? "");
      else { setRoles([]); setAllowedModules(DEFAULT_MODULES); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");

  const canAccessModule = useCallback(
    (module: string) => isAdmin || !!allowedModules[module],
    [isAdmin, allowedModules]
  );

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ user, session, roles, allowedModules, loading, isAdmin, canAccessModule, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Building2, Megaphone, BarChart3,
  FileImage, Zap, Settings, LogOut, Menu, X, ChevronRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  module: string;
}

const navItems: NavItem[] = [
  { to: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard, module: "dashboard" },
  { to: "/crm",          label: "CRM",         icon: TrendingUp,      module: "crm" },
  { to: "/clientes",     label: "Clientes",    icon: Building2,       module: "clientes" },
  { to: "/campanhas",    label: "Campanhas",   icon: Megaphone,       module: "campanhas" },
  { to: "/metricas",     label: "Métricas",    icon: BarChart3,       module: "metricas" },
  { to: "/conteudo",     label: "Conteúdo",    icon: FileImage,       module: "conteudo" },
  { to: "/automacao",    label: "Automação",   icon: Zap,             module: "automacao" },
];

export default function AppShell() {
  const { user, isAdmin, canAccessModule, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sessão encerrada");
    navigate("/login");
  };

  const displayName = user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "Usuário";
  const displayEmail = user?.email ?? "";
  const initials = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-brand/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-copper flex items-center justify-center shrink-0">
            <span className="text-white font-display font-bold text-sm">M</span>
          </div>
          <div>
            <p className="font-display font-bold text-white text-base leading-none">Markeiro</p>
            <p className="text-brand-light text-xs mt-0.5">Portal de Marketing</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            if (!canAccessModule(item.module)) return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-brand-light hover:bg-white/10 hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-copper" : "text-brand-light group-hover:text-copper")} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-copper" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mt-4 pt-4 border-t border-brand/20 space-y-0.5">
          {(isAdmin || canAccessModule("configuracoes")) && (
            <NavLink
              to="/configuracoes"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                  isActive ? "bg-white/15 text-white" : "text-brand-light hover:bg-white/10 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Settings className={cn("w-4 h-4 shrink-0", isActive ? "text-copper" : "text-brand-light group-hover:text-copper")} />
                  <span>Configurações</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-copper ml-auto" />}
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-brand/20">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-copper flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <p className="text-brand-light text-xs truncate">{displayEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-brand-light hover:text-white transition-colors"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-cream-light">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-brand-dark">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-brand-dark flex flex-col z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-brand-light hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-cream-medium">
          <button onClick={() => setSidebarOpen(true)} className="text-charcoal-mid">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-copper flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-display font-bold text-charcoal text-sm">Markeiro</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

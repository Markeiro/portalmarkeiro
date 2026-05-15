import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/markeiro-logo.svg";
import {
  LayoutDashboard, ListOrdered, FileSpreadsheet, Building2, FolderKanban,
  Tags, DollarSign, TrendingUp, Upload, Settings, LogOut, Menu, X, Receipt, Landmark,
  Sun, Moon, Layers, Users, PlusCircle, Briefcase, Megaphone, FileText, HeartHandshake, KanbanSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/useTheme";

const hubItems = [
  { to: "/hub", label: "Hub Dashboard", icon: Layers, end: true },
  { to: "/hub/projetos", label: "Projetos & Clientes", icon: Users },
  { to: "/hub/projetos/novo", label: "Novo Projeto", icon: PlusCircle },
];

const boardItems = [
  { to: "/hub/board", label: "Board de Tarefas", icon: KanbanSquare },
];

const comercialItems = [
  { to: "/comercial", label: "CRM & Pipeline", icon: Briefcase, end: true },
  { to: "/propostas", label: "Propostas", icon: FileText },
  { to: "/propostas/nova", label: "Nova Proposta", icon: PlusCircle },
];

const marketingItems = [
  { to: "/marketing", label: "Marketing", icon: Megaphone, end: true },
];

const csItems = [
  { to: "/cs", label: "Customer Success", icon: HeartHandshake, end: true },
];

const financeItems = [
  { to: "/dashboard", label: "Dashboard Financeiro", icon: LayoutDashboard, end: true },
  { to: "/lancamentos", label: "Lançamentos", icon: ListOrdered },
  { to: "/contas", label: "Contas a Pagar/Receber", icon: Receipt },
  { to: "/impostos", label: "Impostos", icon: Landmark },
  { to: "/dre", label: "DRE", icon: FileSpreadsheet },
  { to: "/bancos", label: "Bancos", icon: Building2 },
  { to: "/projetos", label: "Projetos Financeiros", icon: FolderKanban },
  { to: "/centros-de-custo", label: "Centros de Custo", icon: Tags },
  { to: "/cambio", label: "Câmbio USD", icon: DollarSign },
  { to: "/projecoes", label: "Projeções", icon: TrendingUp },
  { to: "/importar", label: "Importar (IA)", icon: Upload },
  { to: "/configuracoes", label: "Configurações Financeiras", icon: Settings },
];

const configItems = [
  { to: "/configuracoes-gerais", label: "Configurações Gerais", icon: Settings },
];

export const AppShell = () => {
  const { user, roles, signOut, canAccessModule } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => { await signOut(); nav("/auth"); };

  const Sidebar = (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-sidebar-border">
        <img src={logo} alt="Markeiro" className="h-9 w-auto" />
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {canAccessModule("hub") && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pt-1 pb-2">Hub de Projetos</p>
            {hubItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive ? "bg-primary/15 text-primary border border-primary/20 shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </>
        )}
        {canAccessModule("board") && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pt-4 pb-2">Board de Tarefas</p>
            {boardItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setOpen(false)}
                className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive ? "bg-primary/15 text-primary border border-primary/20 shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </>
        )}
        {canAccessModule("comercial") && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pt-4 pb-2">Comercial</p>
            {comercialItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive ? "bg-primary/15 text-primary border border-primary/20 shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </>
        )}
        {canAccessModule("marketing") && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pt-4 pb-2">Marketing</p>
            {marketingItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive ? "bg-primary/15 text-primary border border-primary/20 shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </>
        )}
        {canAccessModule("cs") && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pt-4 pb-2">Customer Success</p>
            {csItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive ? "bg-primary/15 text-primary border border-primary/20 shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </>
        )}
        {canAccessModule("financeiro") && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pt-4 pb-2">Financeiro</p>
            {financeItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
                className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive ? "bg-primary/15 text-primary border border-primary/20 shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" />{label}
              </NavLink>
            ))}
          </>
        )}
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pt-4 pb-2">Configurações</p>
        {configItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            className={({ isActive }) => cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive ? "bg-primary/15 text-primary border border-primary/20 shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            )}>
            <Icon className="h-4 w-4" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <div className="flex gap-1 mt-1">
            {roles.map(r => <Badge key={r} variant="outline" className="text-[10px] py-0 h-4">{r}</Badge>)}
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={toggleTheme}
          className="w-full justify-start gap-2 text-sidebar-foreground hover:text-foreground"
          title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {theme === "dark"
            ? <><Sun className="h-4 w-4" /> Modo Claro</>
            : <><Moon className="h-4 w-4" /> Modo Escuro</>
          }
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2 text-sidebar-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background bg-gradient-glow">
      <div className="hidden lg:block">{Sidebar}</div>
      {/* Mobile */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button variant="outline" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} />}
      {open && <div className="lg:hidden fixed inset-y-0 left-0 z-40">{Sidebar}</div>}

      <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 pt-14 lg:pt-8 animate-fade-in overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

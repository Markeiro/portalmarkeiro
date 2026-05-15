import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Plus, Pencil, ShieldCheck, Users, Loader2, Search,
  Lock, Edit3, Crown, Trash2, History, Eye, EyeOff, UserCog,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const MODULES = [
  { key: "hub",        label: "Hub de Projetos" },
  { key: "board",      label: "Board de Tarefas" },
  { key: "comercial",  label: "Comercial" },
  { key: "marketing",  label: "Marketing" },
  { key: "cs",         label: "Customer Success" },
  { key: "financeiro", label: "Financeiro" },
];

const DEFAULT_MODULES: Record<string, boolean> = {
  hub: true, board: true, comercial: false,
  marketing: false, cs: false, financeiro: false,
};

const ACCESS_TYPES = [
  {
    value: "admin" as const,
    label: "Admin",
    description: "Acesso total — cria, edita e visualiza tudo sem restrições",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    badgeClass: "bg-amber-400/10 text-amber-400 border-amber-400/30",
    platformRole: "admin",
    boardRole: "master",
  },
  {
    value: "colaborador" as const,
    label: "Colaborador",
    description: "Pode criar e editar, mas somente nos módulos habilitados",
    icon: Edit3,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    badgeClass: "bg-blue-400/10 text-blue-400 border-blue-400/30",
    platformRole: "financeiro",
    boardRole: "master",
  },
  {
    value: "leitura" as const,
    label: "Leitura",
    description: "Somente visualizar, sem ações, nos módulos habilitados",
    icon: Lock,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    badgeClass: "bg-muted/60 text-muted-foreground border-border/50",
    platformRole: "leitura",
    boardRole: "member",
  },
] as const;

type AccessTypeValue = "admin" | "colaborador" | "leitura";

function dbRoleToAccessType(platformRole: string): AccessTypeValue {
  if (platformRole === "admin") return "admin";
  if (platformRole === "financeiro") return "colaborador";
  return "leitura";
}

// ─── Avatar helpers ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-600", "bg-orange-500", "bg-pink-500",
];

function avatarColor(name: string) {
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(n => n[0] ?? "").join("").toUpperCase() || "?";
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  accessType: AccessTypeValue;
  modules: Record<string, boolean>;
  accessId: string | null;
  isLastAdmin: boolean;
}

interface HistoryRow {
  id: string;
  target_email: string;
  admin_email: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 animate-pulse">
      <div className="h-9 w-9 rounded-full bg-muted/50 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 bg-muted/50 rounded" />
        <div className="h-3 w-48 bg-muted/30 rounded" />
      </div>
      <div className="h-6 w-24 bg-muted/30 rounded-full" />
      <div className="h-4 w-16 bg-muted/20 rounded" />
      <div className="h-7 w-14 bg-muted/20 rounded" />
    </div>
  );
}

// ─── UserForm ────────────────────────────────────────────────────────────────

function UserForm({
  editUser, allHistory, onSave, onClose, onLogHistory,
}: {
  editUser: UserRow | null;
  allHistory: HistoryRow[];
  onSave: () => void;
  onClose: () => void;
  onLogHistory: (email: string, action: string, details: string) => Promise<void>;
}) {
  const [fullName, setFullName]     = useState(editUser?.full_name || "");
  const [email, setEmail]           = useState(editUser?.email || "");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [accessType, setAccessType] = useState<AccessTypeValue>(editUser?.accessType || "colaborador");
  const [modules, setModules]       = useState<Record<string, boolean>>(
    editUser?.modules || { ...DEFAULT_MODULES }
  );
  const [saving, setSaving] = useState(false);

  const isAdminType = accessType === "admin";
  const accessDef   = ACCESS_TYPES.find(a => a.value === accessType)!;
  const userHistory = editUser
    ? allHistory.filter(h => h.target_email === editUser.email)
    : [];

  const toggleMod = (key: string) => setModules(m => ({ ...m, [key]: !m[key] }));

  const handleSave = async () => {
    if (!editUser && (!fullName.trim() || !email.trim() || !password.trim())) {
      toast.error("Nome, e-mail e senha são obrigatórios");
      return;
    }
    setSaving(true);

    try {
    const effectiveModules = isAdminType
      ? Object.fromEntries(MODULES.map(m => [m.key, true]))
      : modules;

    if (!editUser) {
      // Create via edge function
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            full_name: fullName.trim(),
            role: accessDef.platformRole,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Erro ao criar usuário");
        setSaving(false);
        return;
      }

      await (supabase as any).from("hub_user_access").insert({
        email: email.trim(),
        role: accessDef.boardRole,
        modules: effectiveModules,
      });

      toast.success("Usuário criado — e-mail de boas-vindas enviado");
    } else {
      // Update platform role
      const prevType = editUser.accessType;
      const prevDef  = ACCESS_TYPES.find(a => a.value === prevType);

      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", editUser.id);
      if (delErr) { toast.error("Erro ao atualizar acesso: " + delErr.message); setSaving(false); return; }

      const { error: insErr } = await supabase.from("user_roles").insert({
        user_id: editUser.id, role: accessDef.platformRole as any,
      });
      if (insErr) { toast.error("Erro ao atualizar acesso: " + insErr.message); setSaving(false); return; }

      // Upsert hub_user_access by email — handles both new and existing records
      const { error: accessErr } = await (supabase as any).from("hub_user_access").upsert({
        email: editUser.email,
        role: accessDef.boardRole,
        modules: effectiveModules,
        active: true,
      }, { onConflict: "email" });
      if (accessErr) toast.warning("Aviso: módulos podem não ter sido salvos — " + accessErr.message);

      const details = prevType !== accessType
        ? `Acesso alterado de "${prevDef?.label}" para "${accessDef.label}"`
        : "Módulos/permissões atualizados";
      await onLogHistory(editUser.email, "editado", details);
      toast.success("Usuário atualizado");
    }

    setSaving(false);
    onSave();
    onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado ao salvar");
      setSaving(false);
    }
  };

  const actionColor = (action: string) => {
    if (action === "criado")   return "bg-emerald-400";
    if (action === "excluído") return "bg-red-400";
    return "bg-blue-400";
  };
  const actionTextColor = (action: string) => {
    if (action === "criado")   return "text-emerald-400";
    if (action === "excluído") return "text-red-400";
    return "text-blue-400";
  };

  return (
    <div className="space-y-5">
      {/* Header — edit shows avatar, create shows fields */}
      {editUser ? (
        <div className="flex items-center gap-3 pb-1">
          <div className={`h-12 w-12 rounded-full ${avatarColor(editUser.full_name)} flex items-center justify-center text-white font-bold text-base shrink-0`}>
            {initials(editUser.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base leading-tight truncate">{editUser.full_name}</p>
            <p className="text-sm text-muted-foreground truncate">{editUser.email}</p>
          </div>
          {editUser.isLastAdmin && (
            <Badge variant="outline" className="shrink-0 bg-amber-400/10 text-amber-400 border-amber-400/30 text-xs">
              <Lock className="h-3 w-3 mr-1" /> Proprietário
            </Badge>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="João Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="joao@empresa.com"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Senha inicial</Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O usuário receberá as credenciais por e-mail automaticamente.
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* Access type selector */}
      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Nível de acesso
        </Label>
        <div className="grid gap-2">
          {ACCESS_TYPES.map(type => {
            const Icon     = type.icon;
            const selected = accessType === type.value;
            const locked   = editUser?.isLastAdmin && type.value !== "admin";
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => !locked && setAccessType(type.value)}
                disabled={locked}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                  locked
                    ? "opacity-40 cursor-not-allowed border-border/30"
                    : selected
                      ? `${type.border} ${type.bg} shadow-sm`
                      : "border-border/50 hover:border-border hover:bg-muted/20"
                }`}
              >
                <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${selected ? type.bg : "bg-muted/40"}`}>
                  <Icon className={`h-3.5 w-3.5 ${selected ? type.color : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${selected ? type.color : "text-foreground"}`}>
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {type.description}
                  </p>
                </div>
                <div className={`mt-1 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                  selected ? type.border : "border-border/40"
                }`}>
                  {selected && (
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      type.value === "admin" ? "bg-amber-400" :
                      type.value === "colaborador" ? "bg-blue-400" : "bg-slate-400"
                    }`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Module toggles */}
      {!isAdminType ? (
        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Módulos habilitados
          </Label>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            {MODULES.map((mod, i) => (
              <div
                key={mod.key}
                className={`flex items-center justify-between px-3 py-2.5 ${
                  i < MODULES.length - 1 ? "border-b border-border/30" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${modules[mod.key] ? "bg-primary" : "bg-muted-foreground/25"}`} />
                  <span className="text-sm">{mod.label}</span>
                </div>
                <Switch
                  checked={!!modules[mod.key]}
                  onCheckedChange={() => toggleMod(mod.key)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5 flex items-center gap-2">
          <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Admin tem acesso irrestrito a todos os módulos automaticamente.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
            : editUser ? "Salvar alterações" : "Criar usuário"
          }
        </Button>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>

      {/* Per-user history timeline — only on edit */}
      {editUser && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Histórico de alterações
            </p>
            {userHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 py-1">
                Nenhuma alteração registrada ainda.
              </p>
            ) : (
              <div className="space-y-0 max-h-52 overflow-y-auto pr-1">
                {userHistory.map((h, i) => (
                  <div key={h.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < userHistory.length - 1 && (
                      <div className="absolute left-[7px] top-4 bottom-0 w-px bg-border/40" />
                    )}
                    <div className={`h-3.5 w-3.5 rounded-full ${actionColor(h.action)} shrink-0 mt-0.5 z-10 ring-2 ring-background`} />
                    <div className="flex-1 min-w-0 -mt-px">
                      <p className="text-xs text-foreground/80">
                        <span className="font-medium">
                          {h.admin_email?.split("@")[0] || "Sistema"}
                        </span>
                        {" "}
                        <span className={actionTextColor(h.action)}>{h.action}</span>
                        {" "}este usuário
                      </p>
                      {h.details && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{h.details}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                        {new Date(h.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesGerais() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [history, setHistory]       = useState<HistoryRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [openForm, setOpenForm]     = useState(false);
  const [editUser, setEditUser]     = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const load = async () => {
    setLoading(true);
    const [
      { data: profiles },
      { data: roleRows },
      { data: accesses },
      { data: hist },
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
      (supabase as any).from("hub_user_access").select("*"),
      (supabase as any).from("user_access_history").select("*")
        .order("created_at", { ascending: false }).limit(200),
    ]);

    const adminCount = (roleRows || []).filter((r: any) => r.role === "admin").length;

    const merged: UserRow[] = (profiles || []).map((p: any) => {
      const platformRole = roleRows?.find((r: any) => r.user_id === p.id)?.role || "leitura";
      const access       = accesses?.find((a: any) => a.email === p.email);
      const accessType   = dbRoleToAccessType(platformRole);
      return {
        id:          p.id,
        full_name:   p.full_name || "",
        email:       p.email || "",
        accessType,
        modules:     access?.modules || { ...DEFAULT_MODULES },
        accessId:    access?.id || null,
        isLastAdmin: accessType === "admin" && adminCount <= 1,
      };
    });

    setUsers(merged);
    setHistory(hist || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logHistory = async (targetEmail: string, action: string, details: string) => {
    await (supabase as any).from("user_access_history").insert({
      target_email: targetEmail,
      admin_email:  currentUser?.email || null,
      action,
      details,
    });
    const { data } = await (supabase as any)
      .from("user_access_history").select("*")
      .order("created_at", { ascending: false }).limit(200);
    setHistory(data || []);
  };

  const openEdit  = (u: UserRow) => { setEditUser(u); setOpenForm(true); };
  const handleClose = () => { setOpenForm(false); setEditUser(null); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase.rpc("delete_user_cascade" as any, {
      p_user_id:     deleteTarget.id,
      p_user_email:  deleteTarget.email,
      p_admin_email: currentUser?.email || "",
    });

    if (error) {
      toast.error(error.message || "Erro ao remover usuário");
      setDeleting(false);
      return;
    }

    toast.success(`${deleteTarget.full_name} foi removido`);
    setDeleteTarget(null);
    setDeleting(false);
    load();
  };

  // Stats
  const adminCount   = users.filter(u => u.accessType === "admin").length;
  const colabCount   = users.filter(u => u.accessType === "colaborador").length;
  const leituraCount = users.filter(u => u.accessType === "leitura").length;

  const filtered = users.filter(u =>
    !search
      || u.full_name.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações Gerais"
        description="Gerencie os usuários e permissões de acesso à plataforma"
      />

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total de usuários", value: users.length,  icon: Users,  color: "text-foreground",    bg: "" },
          { label: "Admin",             value: adminCount,    icon: Crown,  color: "text-amber-400",     bg: "bg-amber-400/8" },
          { label: "Colaborador",       value: colabCount,    icon: Edit3,  color: "text-blue-400",      bg: "bg-blue-400/8" },
          { label: "Leitura",           value: leituraCount,  icon: Lock,   color: "text-slate-400",     bg: "bg-slate-400/8" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`p-4 border-border/50 ${s.bg}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <Icon className={`h-4 w-4 mt-0.5 ${s.color} opacity-50`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* User list card */}
      <Card className="bg-gradient-surface border-border/50 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-border/30">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="pl-8 h-8 text-sm bg-muted/20 border-border/40"
            />
          </div>
          {isAdmin && (
            <Button
              size="sm"
              className="bg-gradient-brand text-primary-foreground shrink-0"
              onClick={() => { setEditUser(null); setOpenForm(true); }}
            >
              <Plus className="h-4 w-4 mr-1" /> Novo usuário
            </Button>
          )}
        </div>

        {/* List */}
        <div className="divide-y divide-border/20">
          {loading ? (
            <div className="py-1">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <Users className="h-9 w-9 mb-3 opacity-15" />
              <p className="text-sm font-medium">
                {search ? "Nenhum resultado encontrado" : "Nenhum usuário cadastrado"}
              </p>
              {search && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Tente buscar por outro nome ou e-mail
                </p>
              )}
            </div>
          ) : (
            filtered.map(u => {
              const def    = ACCESS_TYPES.find(a => a.value === u.accessType)!;
              const Icon   = def.icon;
              const isSelf = u.email === currentUser?.email;
              const canDelete = !u.isLastAdmin && !isSelf;
              const enabledModules = MODULES.filter(m => u.modules?.[m.key]);

              return (
                <div
                  key={u.id}
                  className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/10 transition-colors"
                >
                  {/* Avatar */}
                  <div className={`h-9 w-9 rounded-full ${avatarColor(u.full_name)} flex items-center justify-center text-white text-xs font-bold shrink-0 select-none`}>
                    {initials(u.full_name)}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm leading-tight">
                        {u.full_name || "—"}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary leading-none">
                          Você
                        </span>
                      )}
                      {u.isLastAdmin && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-3 w-3 text-amber-400 shrink-0 cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Único administrador — protegido contra exclusão
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                  </div>

                  {/* Role badge */}
                  <Badge
                    variant="outline"
                    className={`text-xs flex items-center gap-1.5 shrink-0 ${def.badgeClass}`}
                  >
                    <Icon className="h-3 w-3" />
                    {def.label}
                  </Badge>

                  {/* Modules */}
                  <div className="w-28 shrink-0 text-right">
                    {u.accessType === "admin" ? (
                      <span className="text-xs text-muted-foreground/50">Todos</span>
                    ) : enabledModules.length === 0 ? (
                      <span className="text-xs text-muted-foreground/40">Nenhum</span>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground cursor-default hover:text-foreground transition-colors">
                            {enabledModules.length} módulo{enabledModules.length !== 1 ? "s" : ""}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          <div className="space-y-1">
                            {enabledModules.map(m => (
                              <p key={m.key} className="flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-primary inline-block shrink-0" />
                                {m.label}
                              </p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Actions — appear on row hover */}
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={!canDelete}
                            onClick={() => canDelete && setDeleteTarget(u)}
                          >
                            <Trash2 className={`h-3.5 w-3.5 ${canDelete ? "text-destructive" : "text-muted-foreground/25"}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {u.isLastAdmin
                            ? "Único administrador — protegido"
                            : isSelf
                              ? "Não é possível excluir sua própria conta"
                              : "Excluir usuário"
                          }
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer count */}
        {!loading && users.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border/20 bg-muted/5">
            <p className="text-[11px] text-muted-foreground/40">
              {filtered.length} de {users.length} usuário{users.length !== 1 ? "s" : ""}
              {search ? ` — filtrando por "${search}"` : ""}
            </p>
          </div>
        )}
      </Card>

      {/* Subtle legend */}
      <div className="flex items-start gap-2.5 px-1">
        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
          <strong className="text-muted-foreground/60">Admin</strong> — acesso total, sem restrições. Pelo menos um Admin deve existir sempre.{" "}
          <strong className="text-muted-foreground/60">Colaborador</strong> — cria e edita somente nos módulos habilitados.{" "}
          <strong className="text-muted-foreground/60">Leitura</strong> — somente visualizar.{" "}
          E-mail de boas-vindas enviado automaticamente ao criar um usuário.
        </p>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={openForm} onOpenChange={v => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              {editUser ? "Editar usuário" : "Novo usuário"}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            editUser={editUser}
            allHistory={history}
            onSave={load}
            onClose={handleClose}
            onLogHistory={logHistory}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Excluir usuário
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 mt-1">
                <p className="text-sm text-muted-foreground">
                  O acesso deste usuário será permanentemente removido da plataforma.
                </p>
                {deleteTarget && (
                  <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <div className={`h-10 w-10 rounded-full ${avatarColor(deleteTarget.full_name)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {initials(deleteTarget.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground leading-tight">
                        {deleteTarget.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{deleteTarget.email}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground/60">Esta ação não pode ser desfeita.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Excluindo...</>
                : "Sim, excluir"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

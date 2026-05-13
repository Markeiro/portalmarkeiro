import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

const MODULES = [
  { key: "crm",         label: "CRM" },
  { key: "clientes",    label: "Clientes" },
  { key: "campanhas",   label: "Campanhas" },
  { key: "metricas",    label: "Métricas" },
  { key: "conteudo",    label: "Conteúdo" },
  { key: "automacao",   label: "Automação" },
  { key: "configuracoes", label: "Configurações" },
];

interface UserAccess {
  id: string;
  email: string;
  role: string;
  modules: Record<string, boolean>;
  active: boolean;
}

function useUsers() {
  return useQuery<UserAccess[]>({
    queryKey: ["user-access"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_access" as never).select("*").order("email");
      if (error) throw error;
      return (data ?? []) as UserAccess[];
    },
  });
}

const EMPTY_MODULES = Object.fromEntries(MODULES.map((m) => [m.key, false]));

export default function Configuracoes() {
  const { isAdmin } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", role: "colaborador", modules: EMPTY_MODULES });

  const handleToggleModule = (key: string) =>
    setForm((p) => ({ ...p, modules: { ...p.modules, [key]: !p.modules[key] } }));

  const handleSave = async () => {
    if (!form.email) return toast.error("Email é obrigatório");
    setSaving(true);
    const { error } = await (supabase.from("user_access" as never) as any).upsert({
      email: form.email, role: form.role, modules: form.modules, active: true,
    }, { onConflict: "email" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editId ? "Permissões atualizadas!" : "Usuário adicionado!");
    qc.invalidateQueries({ queryKey: ["user-access"] });
    setOpen(false);
    setEditId(null);
    setForm({ email: "", role: "colaborador", modules: EMPTY_MODULES });
  };

  const handleEdit = (u: UserAccess) => {
    setEditId(u.id);
    setForm({ email: u.email, role: u.role, modules: { ...EMPTY_MODULES, ...u.modules } });
    setOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-16">
        <p className="text-charcoal font-medium">Acesso restrito</p>
        <p className="text-sm text-muted mt-1">Apenas administradores podem acessar as configurações</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Usuários, permissões e integrações" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários e Permissões</CardTitle>
            <Button size="sm" onClick={() => { setEditId(null); setForm({ email: "", role: "colaborador", modules: EMPTY_MODULES }); setOpen(true); }}>
              <UserPlus className="w-4 h-4" />Convidar
            </Button>
          </CardHeader>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-cream rounded-xl animate-pulse" />)}
            </div>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted">Nenhum usuário cadastrado</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-cream hover:bg-cream-medium transition-colors">
                  <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0 font-bold text-brand text-sm">
                    {u.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{u.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant={u.role === "admin" ? "copper" : "brand"} className="text-xs">{u.role}</Badge>
                      {Object.entries(u.modules ?? {}).filter(([, v]) => v).map(([k]) => (
                        <span key={k} className="text-xs text-muted">{MODULES.find((m) => m.key === k)?.label ?? k}</span>
                      )).slice(0, 3)}
                    </div>
                  </div>
                  <Button variant="ghost" size="xs" onClick={() => handleEdit(u)}>Editar</Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {[
              { name: "Meta Business Manager", icon: "f", color: "bg-blue-600", status: "pendente", desc: "Conectar conta para sincronizar campanhas e métricas" },
              { name: "Google Ads MCC", icon: "G", color: "bg-red-500", status: "pendente", desc: "Conta gerenciadora para todos os clientes" },
              { name: "WhatsApp Business", icon: "W", color: "bg-green-600", status: "pendente", desc: "Automações e notificações via WhatsApp" },
              { name: "Supabase", icon: "S", color: "bg-brand", status: "ativo", desc: "Banco de dados e autenticação" },
            ].map((int) => (
              <div key={int.name} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${int.color} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-sm">{int.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal">{int.name}</p>
                  <p className="text-xs text-muted truncate">{int.desc}</p>
                </div>
                <Badge variant={int.status === "ativo" ? "success" : "warning"}>{int.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Platform info */}
        <Card className="xl:col-span-2">
          <CardTitle className="mb-4">Sobre a plataforma</CardTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Plataforma", value: "Markeiro Portal" },
              { label: "Versão", value: "1.0.0" },
              { label: "Ambiente", value: import.meta.env.MODE },
              { label: "Supabase", value: "fjuwgqenztbpdphfppmi" },
            ].map((i) => (
              <div key={i.label}>
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{i.label}</p>
                <p className="font-medium text-charcoal">{i.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Editar usuário" : "Convidar usuário"} size="md">
        <div className="space-y-4">
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="usuario@email.com"
            disabled={!!editId}
          />
          <Select
            label="Perfil"
            value={form.role}
            onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
            options={[
              { value: "admin", label: "Administrador" },
              { value: "gestor", label: "Gestor" },
              { value: "colaborador", label: "Colaborador" },
              { value: "cliente", label: "Cliente (portal)" },
            ]}
          />
          <div>
            <p className="text-sm font-medium text-charcoal-mid mb-2">Módulos permitidos</p>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((m) => (
                <label key={m.key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => handleToggleModule(m.key)}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center cursor-pointer ${form.modules[m.key] ? "bg-brand" : "bg-cream-medium"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${form.modules[m.key] ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className="text-sm text-charcoal">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}><Save className="w-4 h-4" />Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}

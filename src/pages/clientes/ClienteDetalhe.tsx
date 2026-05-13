import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { brl, dateBR } from "@/lib/utils";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Cliente, Campanha } from "@/types";

const statusVariant: Record<string, "success" | "info" | "warning" | "muted"> = {
  ativo: "success", onboarding: "info", pausado: "warning", inativo: "muted",
};

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({});

  const { data: cliente, isLoading } = useQuery<Cliente>({
    queryKey: ["cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes" as never).select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Cliente;
    },
    enabled: !!id,
  });

  const { data: campanhas = [] } = useQuery<Campanha[]>({
    queryKey: ["campanhas-cliente", id],
    queryFn: async () => {
      const { data } = await supabase.from("campanhas" as never).select("*").eq("cliente_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as Campanha[];
    },
    enabled: !!id,
  });

  const startEdit = () => { setForm(cliente ?? {}); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    if (!form.nome) return toast.error("Nome é obrigatório");
    setSaving(true);
    const { error } = await supabase.from("clientes" as never).update(form as never).eq("id", id!);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cliente atualizado!");
    qc.invalidateQueries({ queryKey: ["cliente", id] });
    qc.invalidateQueries({ queryKey: ["clientes"] });
    setEditing(false);
  };

  if (isLoading) return <PageSpinner />;
  if (!cliente) return <div className="text-center py-16 text-muted">Cliente não encontrado</div>;

  const set = (k: keyof Cliente) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title={editing ? "Editar cliente" : cliente.nome}
        subtitle={editing ? undefined : cliente.segmento}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            {editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={cancelEdit}><X className="w-4 h-4" />Cancelar</Button>
                <Button size="sm" onClick={handleSave} loading={saving}><Save className="w-4 h-4" />Salvar</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEdit}><Edit2 className="w-4 h-4" />Editar</Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações gerais</CardTitle>
              {!editing && <Badge variant={statusVariant[cliente.status] ?? "default"}>{cliente.status}</Badge>}
            </CardHeader>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nome" value={form.nome ?? ""} onChange={set("nome")} className="sm:col-span-2" />
                <Input label="Segmento" value={form.segmento ?? ""} onChange={set("segmento")} />
                <Input label="Plano" value={form.plano ?? ""} onChange={set("plano")} />
                <Input label="MRR (R$)" type="number" value={String(form.mrr ?? "")} onChange={(e) => setForm((p) => ({ ...p, mrr: parseFloat(e.target.value) || 0 }))} />
                <Select label="Status" value={form.status ?? "ativo"} onValueChange={(v) => setForm((p) => ({ ...p, status: v as Cliente["status"] }))} options={[{ value: "ativo", label: "Ativo" }, { value: "onboarding", label: "Onboarding" }, { value: "pausado", label: "Pausado" }, { value: "inativo", label: "Inativo" }]} />
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-medium text-charcoal-mid">Observações</label>
                  <textarea value={form.notas ?? ""} onChange={set("notas")} rows={3} className="w-full rounded-lg border border-cream-medium bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/40" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {[
                  { label: "Segmento", value: cliente.segmento || "—" },
                  { label: "Plano", value: cliente.plano || "—" },
                  { label: "MRR", value: brl(cliente.mrr) },
                  { label: "Desde", value: cliente.inicio_contrato ? dateBR(cliente.inicio_contrato) : "—" },
                  { label: "Status", value: cliente.status },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs text-muted uppercase tracking-wide mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-charcoal">{f.value}</p>
                  </div>
                ))}
                {cliente.notas && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Observações</p>
                    <p className="text-sm text-charcoal-mid">{cliente.notas}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Campanhas</CardTitle>
              <span className="text-xs text-muted">{campanhas.length} campanha{campanhas.length !== 1 ? "s" : ""}</span>
            </CardHeader>
            {campanhas.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">Nenhuma campanha para este cliente</p>
            ) : (
              <div className="space-y-2">
                {campanhas.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-cream hover:bg-cream-medium transition-colors">
                    <div>
                      <p className="text-sm font-medium text-charcoal">{c.nome}</p>
                      <p className="text-xs text-muted">{c.plataforma} · {brl(c.orcamento_mensal)}/mês</p>
                    </div>
                    <Badge variant={c.status === "ativa" ? "success" : c.status === "pausada" ? "warning" : "muted"}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Contact sidebar */}
        <div className="space-y-6">
          <Card>
            <CardTitle className="mb-4">Contato</CardTitle>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted mb-0.5">Nome</p>
                <p className="text-sm font-medium text-charcoal">{cliente.contato_nome || "—"}</p>
              </div>
              {cliente.contato_email && (
                <a href={`mailto:${cliente.contato_email}`} className="flex items-center gap-2 text-sm text-brand hover:underline">
                  <Mail className="w-4 h-4" /> {cliente.contato_email}
                </a>
              )}
              {cliente.contato_whatsapp && (
                <a href={`https://wa.me/55${cliente.contato_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand hover:underline">
                  <Phone className="w-4 h-4" /> {cliente.contato_whatsapp}
                </a>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-4">Resumo financeiro</CardTitle>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted">MRR</span>
                <span className="text-sm font-semibold text-charcoal">{brl(cliente.mrr)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Campanhas</span>
                <span className="text-sm font-semibold text-charcoal">{campanhas.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted">Budget total</span>
                <span className="text-sm font-semibold text-charcoal">
                  {brl(campanhas.filter((c) => c.status === "ativa").reduce((acc, c) => acc + (c.orcamento_mensal || 0), 0))}/mês
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

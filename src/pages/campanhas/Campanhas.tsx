import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { brl } from "@/lib/utils";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Campanha, Cliente } from "@/types";

const plataformas = [
  { value: "meta", label: "Meta Ads" },
  { value: "google", label: "Google Ads" },
  { value: "tiktok", label: "TikTok Ads" },
  { value: "linkedin", label: "LinkedIn Ads" },
  { value: "organico", label: "Orgânico / SEO" },
];

const objetivos = ["Leads", "Vendas", "Tráfego", "Alcance", "Engajamento", "App installs"];

const statusOptions = [
  { value: "ativa", label: "Ativa" },
  { value: "pausada", label: "Pausada" },
  { value: "rascunho", label: "Rascunho" },
  { value: "encerrada", label: "Encerrada" },
];

const statusVariant: Record<string, "success" | "warning" | "muted"> = {
  ativa: "success", pausada: "warning", encerrada: "muted", rascunho: "muted",
};

const platformColors: Record<string, string> = {
  meta: "bg-blue-100 text-blue-700", google: "bg-red-100 text-red-700",
  tiktok: "bg-pink-100 text-pink-700", linkedin: "bg-blue-100 text-blue-800",
  organico: "bg-green-100 text-green-700",
};

function useCampanhas() {
  return useQuery<(Campanha & { clientes?: { nome: string } })[]>({
    queryKey: ["campanhas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campanhas" as never).select("*, clientes(nome)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Campanha & { clientes?: { nome: string } })[];
    },
  });
}

function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes" as never).select("id, nome").eq("status", "ativo").order("nome");
      return (data ?? []) as Cliente[];
    },
  });
}

const EMPTY = {
  nome: "", cliente_id: "", plataforma: "meta", objetivo: "Leads",
  status: "rascunho", orcamento_mensal: "", inicio: "", notas: "",
};

export default function Campanhas() {
  const { data: campanhas = [], isLoading } = useCampanhas();
  const { data: clientes = [] } = useClientes();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = campanhas.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSave = async () => {
    if (!form.nome || !form.cliente_id) return toast.error("Nome e cliente são obrigatórios");
    setSaving(true);
    const { error } = await supabase.from("campanhas" as never).insert({
      nome: form.nome, cliente_id: form.cliente_id, plataforma: form.plataforma,
      objetivo: form.objetivo, status: form.status,
      orcamento_mensal: parseFloat(form.orcamento_mensal) || 0,
      inicio: form.inicio || null,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Campanha criada!");
    qc.invalidateQueries({ queryKey: ["campanhas"] });
    qc.invalidateQueries({ queryKey: ["dashboard-campanhas"] });
    setOpen(false);
    setForm(EMPTY);
  };

  if (isLoading) return <PageSpinner />;

  const ativas = campanhas.filter((c) => c.status === "ativa");
  const budgetTotal = ativas.reduce((acc, c) => acc + (c.orcamento_mensal || 0), 0);

  return (
    <div>
      <PageHeader
        title="Campanhas"
        subtitle={`${ativas.length} ativas · ${brl(budgetTotal)}/mês em budget`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" />Nova campanha</Button>}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Input
          placeholder="Buscar campanha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="max-w-xs"
        />
        <div className="flex rounded-lg border border-cream-medium overflow-hidden bg-white">
          {["todos", "ativa", "pausada", "rascunho"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 text-sm capitalize transition-colors ${filterStatus === s ? "bg-brand text-white" : "text-muted hover:bg-cream"}`}>
              {s === "todos" ? "Todas" : s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-16">
          <Megaphone className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-charcoal font-medium mb-1">{search ? "Nenhuma campanha encontrada" : "Nenhuma campanha ainda"}</p>
          <p className="text-sm text-muted mb-4">Crie e gerencie campanhas de mídia paga e orgânica</p>
          {!search && <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4" />Criar campanha</Button>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-charcoal truncate">{c.nome}</p>
                  <p className="text-xs text-muted mt-0.5 truncate">{(c as { clientes?: { nome: string } }).clientes?.nome ?? "—"}</p>
                </div>
                <Badge variant={statusVariant[c.status] ?? "default"}>{c.status}</Badge>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${platformColors[c.plataforma] ?? "bg-cream text-muted"}`}>
                  {plataformas.find((p) => p.value === c.plataforma)?.label ?? c.plataforma}
                </span>
                <span className="text-xs text-muted">{c.objetivo}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-cream">
                <span className="text-xs text-muted">Budget mensal</span>
                <span className="text-sm font-semibold text-charcoal">{brl(c.orcamento_mensal)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova campanha" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome da campanha *" value={form.nome} onChange={set("nome")} placeholder="Ex: Leads Loja A - Jun/25" className="sm:col-span-2" />
          <Select
            label="Cliente *"
            value={form.cliente_id}
            onValueChange={(v) => setForm((p) => ({ ...p, cliente_id: v }))}
            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
            placeholder="Selecione o cliente"
            className="sm:col-span-2"
          />
          <Select label="Plataforma" value={form.plataforma} onValueChange={(v) => setForm((p) => ({ ...p, plataforma: v }))} options={plataformas} />
          <Select label="Objetivo" value={form.objetivo} onValueChange={(v) => setForm((p) => ({ ...p, objetivo: v }))} options={objetivos.map((o) => ({ value: o, label: o }))} />
          <Input label="Budget mensal (R$)" type="number" value={form.orcamento_mensal} onChange={set("orcamento_mensal")} placeholder="0,00" />
          <Select label="Status inicial" value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))} options={statusOptions} />
          <Input label="Data de início" type="date" value={form.inicio} onChange={set("inicio")} className="sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Criar campanha</Button>
        </div>
      </Modal>
    </div>
  );
}

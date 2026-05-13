import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Building2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
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
import type { Cliente } from "@/types";

const segmentos = ["Móveis planejados", "Colchões e camas", "Estofados", "Decoração", "Iluminação", "Construção civil", "Outro"];
const planos = ["Starter", "Essencial", "Pro", "Enterprise"];

function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes" as never).select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

const statusVariant: Record<string, "success" | "info" | "warning" | "muted"> = {
  ativo: "success", onboarding: "info", pausado: "warning", inativo: "muted",
};

const statusLabel: Record<string, string> = {
  ativo: "Ativo", onboarding: "Onboarding", pausado: "Pausado", inativo: "Inativo",
};

interface FormState {
  nome: string; segmento: string; plano: string;
  contato_nome: string; contato_email: string; contato_whatsapp: string;
  mrr: string; status: string; notas: string;
}

const EMPTY: FormState = {
  nome: "", segmento: "", plano: "Essencial",
  contato_nome: "", contato_email: "", contato_whatsapp: "",
  mrr: "", status: "onboarding", notas: "",
};

export default function Clientes() {
  const { data: clientes = [], isLoading } = useClientes();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.segmento?.toLowerCase().includes(search.toLowerCase())
  );

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.nome) return toast.error("Nome é obrigatório");
    setSaving(true);
    const { error } = await supabase.from("clientes" as never).insert({
      nome: form.nome,
      segmento: form.segmento,
      plano: form.plano,
      contato_nome: form.contato_nome,
      contato_email: form.contato_email,
      contato_whatsapp: form.contato_whatsapp,
      mrr: parseFloat(form.mrr) || 0,
      status: form.status,
      notas: form.notas,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cliente cadastrado!");
    qc.invalidateQueries({ queryKey: ["clientes"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setOpen(false);
    setForm(EMPTY);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente${clientes.length !== 1 ? "s" : ""} cadastrado${clientes.length !== 1 ? "s" : ""}`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" />Novo cliente</Button>}
      />

      <div className="mb-5">
        <Input
          placeholder="Buscar por nome ou segmento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-16">
          <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-charcoal font-medium mb-1">{search ? "Nenhum resultado" : "Nenhum cliente ainda"}</p>
          <p className="text-sm text-muted mb-4">{search ? "Tente outro termo" : "Cadastre o primeiro cliente da Markeiro"}</p>
          {!search && <Button onClick={() => setOpen(true)} size="sm"><Plus className="w-4 h-4" />Cadastrar cliente</Button>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-cream">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0 font-display font-bold text-brand">
                      {c.nome[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-charcoal truncate">{c.nome}</p>
                      <p className="text-xs text-muted truncate">{c.segmento}</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant[c.status] ?? "default"}>{statusLabel[c.status] ?? c.status}</Badge>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-muted">MRR</p>
                    <p className="text-sm font-semibold text-charcoal">{brl(c.mrr)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Plano</p>
                    <p className="text-sm font-semibold text-charcoal">{c.plano}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted">Contato</p>
                    <p className="text-sm text-charcoal truncate">{c.contato_nome || "—"}</p>
                  </div>
                </div>
                <Link to={`/clientes/${c.id}`} className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-cream hover:bg-cream-medium text-brand text-sm font-medium transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver detalhes
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo cliente" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome da empresa *" value={form.nome} onChange={set("nome")} placeholder="Ex: Móveis Horizonte" className="sm:col-span-2" />
          <Select label="Segmento" value={form.segmento} onValueChange={(v) => setForm((p) => ({ ...p, segmento: v }))} options={segmentos.map((s) => ({ value: s, label: s }))} placeholder="Selecione..." />
          <Select label="Plano" value={form.plano} onValueChange={(v) => setForm((p) => ({ ...p, plano: v }))} options={planos.map((p) => ({ value: p, label: p }))} />
          <Input label="Responsável (nome)" value={form.contato_nome} onChange={set("contato_nome")} placeholder="Ex: João Silva" />
          <Input label="Email do responsável" type="email" value={form.contato_email} onChange={set("contato_email")} placeholder="joao@empresa.com" />
          <Input label="WhatsApp" value={form.contato_whatsapp} onChange={set("contato_whatsapp")} placeholder="(11) 99999-9999" />
          <Input label="MRR (R$)" type="number" value={form.mrr} onChange={set("mrr")} placeholder="0,00" />
          <Select label="Status" value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))} options={[{ value: "onboarding", label: "Onboarding" }, { value: "ativo", label: "Ativo" }, { value: "pausado", label: "Pausado" }]} />
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium text-charcoal-mid">Observações</label>
            <textarea value={form.notas} onChange={set("notas")} rows={3} className="w-full rounded-lg border border-cream-medium bg-white px-3 py-2 text-sm text-charcoal placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none" placeholder="Anotações sobre o cliente..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Cadastrar cliente</Button>
        </div>
      </Modal>
    </div>
  );
}

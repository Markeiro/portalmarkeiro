import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
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
import type { Contato } from "@/types";

const etapas: { key: Contato["etapa"]; label: string; color: string }[] = [
  { key: "prospecto",   label: "Prospecto",   color: "bg-blue-50 border-blue-200" },
  { key: "qualificado", label: "Qualificado", color: "bg-purple-50 border-purple-200" },
  { key: "proposta",    label: "Proposta",    color: "bg-amber-50 border-amber-200" },
  { key: "negociacao",  label: "Negociação",  color: "bg-orange-50 border-orange-200" },
  { key: "fechado",     label: "Fechado",     color: "bg-green-50 border-green-200" },
];

const etapaBadge: Record<string, "info" | "brand" | "warning" | "copper" | "success" | "danger" | "muted"> = {
  prospecto: "info", qualificado: "brand", proposta: "warning",
  negociacao: "copper", fechado: "success", perdido: "danger",
};

function useContatos() {
  return useQuery<Contato[]>({
    queryKey: ["contatos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contatos" as never).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Contato[];
    },
  });
}

const EMPTY = { nome: "", email: "", whatsapp: "", empresa: "", cargo: "", etapa: "prospecto" as Contato["etapa"], valor_estimado: "", origem: "", notas: "" };

export default function CRM() {
  const { data: contatos = [], isLoading } = useContatos();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = contatos.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.empresa?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.nome) return toast.error("Nome é obrigatório");
    setSaving(true);
    const { error } = await supabase.from("contatos" as never).insert({
      nome: form.nome, email: form.email, whatsapp: form.whatsapp,
      empresa: form.empresa, cargo: form.cargo, etapa: form.etapa,
      valor_estimado: parseFloat(form.valor_estimado) || null,
      origem: form.origem, notas: form.notas,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contato adicionado ao CRM!");
    qc.invalidateQueries({ queryKey: ["contatos"] });
    setOpen(false);
    setForm(EMPTY);
  };

  const handleEtapaChange = async (id: string, etapa: Contato["etapa"]) => {
    await supabase.from("contatos" as never).update({ etapa } as never).eq("id", id);
    qc.invalidateQueries({ queryKey: ["contatos"] });
  };

  const totalPipeline = filtered.filter((c) => !["fechado", "perdido"].includes(c.etapa))
    .reduce((acc, c) => acc + (c.valor_estimado ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="CRM / Pipeline"
        subtitle={`${filtered.length} contatos · Pipeline: ${brl(totalPipeline)}`}
        actions={
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-cream-medium overflow-hidden">
              {(["kanban", "lista"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${view === v ? "bg-brand text-white" : "bg-white text-muted hover:bg-cream"}`}>{v}</button>
              ))}
            </div>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" />Contato</Button>
          </div>
        }
      />

      <div className="mb-5">
        <Input placeholder="Buscar contato ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} className="max-w-sm" />
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {etapas.map((etapa) => {
            const cards = filtered.filter((c) => c.etapa === etapa.key);
            const value = cards.reduce((acc, c) => acc + (c.valor_estimado ?? 0), 0);
            return (
              <div key={etapa.key} className={`rounded-xl border ${etapa.color} min-w-[240px] w-60 shrink-0 p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-charcoal-mid">{etapa.label}</span>
                  <span className="text-xs text-muted bg-white rounded-full px-2 py-0.5 border">{cards.length}</span>
                </div>
                {value > 0 && <p className="text-xs text-muted mb-3">{brl(value)}</p>}
                <div className="space-y-2">
                  {cards.map((c) => (
                    <div key={c.id} className="bg-white rounded-lg p-3 border border-cream-medium shadow-sm cursor-pointer hover:shadow transition-shadow">
                      <p className="text-sm font-semibold text-charcoal truncate">{c.nome}</p>
                      {c.empresa && <p className="text-xs text-muted truncate">{c.empresa}</p>}
                      {c.valor_estimado && (
                        <p className="text-xs font-medium text-copper mt-1">{brl(c.valor_estimado)}</p>
                      )}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {etapas.filter((e) => e.key !== etapa.key).slice(0, 2).map((e) => (
                          <button key={e.key} onClick={() => handleEtapaChange(c.id, e.key)} className="text-xs text-muted hover:text-brand transition-colors">
                            → {e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <p className="text-xs text-muted text-center py-4">Vazio</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card padding="none">
          <table className="w-full">
            <thead className="bg-cream">
              <tr>
                {["Nome", "Empresa", "Etapa", "Valor", "Origem"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-4 py-3 first:rounded-tl-xl last:rounded-tr-xl">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-cream/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-charcoal">{c.nome}</p>
                    {c.email && <p className="text-xs text-muted">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-charcoal-mid">{c.empresa || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={etapaBadge[c.etapa] ?? "default"}>{c.etapa}</Badge></td>
                  <td className="px-4 py-3 text-sm text-charcoal">{c.valor_estimado ? brl(c.valor_estimado) : "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted">{c.origem || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !isLoading && (
            <p className="text-center py-12 text-sm text-muted">Nenhum contato encontrado</p>
          )}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo contato" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome *" value={form.nome} onChange={set("nome")} placeholder="João Silva" className="sm:col-span-2" />
          <Input label="Empresa" value={form.empresa} onChange={set("empresa")} placeholder="Nome da empresa" />
          <Input label="Cargo" value={form.cargo} onChange={set("cargo")} placeholder="Ex: Diretor" />
          <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="joao@empresa.com" />
          <Input label="WhatsApp" value={form.whatsapp} onChange={set("whatsapp")} placeholder="(11) 99999-9999" />
          <Input label="Valor estimado (R$)" type="number" value={form.valor_estimado} onChange={set("valor_estimado")} placeholder="0,00" />
          <Input label="Origem" value={form.origem} onChange={set("origem")} placeholder="Ex: Indicação, Instagram..." />
          <Select label="Etapa" value={form.etapa} onValueChange={(v) => setForm((p) => ({ ...p, etapa: v as Contato["etapa"] }))} options={etapas.map((e) => ({ value: e.key, label: e.label }))} className="sm:col-span-2" />
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium text-charcoal-mid">Observações</label>
            <textarea value={form.notas} onChange={set("notas")} rows={2} className="w-full rounded-lg border border-cream-medium bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Adicionar ao CRM</Button>
        </div>
      </Modal>
    </div>
  );
}

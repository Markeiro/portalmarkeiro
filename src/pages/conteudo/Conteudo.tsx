import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileImage, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Tarefa, Cliente } from "@/types";

const colunas: { key: Tarefa["status"]; label: string; color: string }[] = [
  { key: "backlog",    label: "Backlog",    color: "bg-gray-50 border-gray-200" },
  { key: "producao",  label: "Produção",   color: "bg-blue-50 border-blue-200" },
  { key: "revisao",   label: "Revisão",    color: "bg-yellow-50 border-yellow-200" },
  { key: "aprovacao", label: "Aprovação",  color: "bg-orange-50 border-orange-200" },
  { key: "publicado", label: "Publicado",  color: "bg-green-50 border-green-200" },
];

const tipoLabel: Record<string, string> = {
  post: "Post", story: "Story", reels: "Reels", ads: "Ads", email: "E-mail", lp: "LP", outro: "Outro",
};

const prioridadeBadge: Record<string, "muted" | "info" | "warning" | "danger"> = {
  baixa: "muted", media: "info", alta: "warning", urgente: "danger",
};

function useTarefas() {
  return useQuery<Tarefa[]>({
    queryKey: ["tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tarefas" as never).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tarefa[];
    },
  });
}

function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes" as never).select("id, nome").order("nome");
      return (data ?? []) as Cliente[];
    },
  });
}

const EMPTY = { titulo: "", tipo: "post", cliente_id: "", prioridade: "media", data_entrega: "", descricao: "" };

export default function Conteudo() {
  const { data: tarefas = [], isLoading } = useTarefas();
  const { data: clientes = [] } = useClientes();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = tarefas.filter((t) => t.titulo.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!form.titulo) return toast.error("Título é obrigatório");
    setSaving(true);
    const { error } = await supabase.from("tarefas" as never).insert({
      titulo: form.titulo, tipo: form.tipo,
      cliente_id: form.cliente_id || null, prioridade: form.prioridade,
      data_entrega: form.data_entrega || null,
      descricao: form.descricao, status: "backlog",
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tarefa criada!");
    qc.invalidateQueries({ queryKey: ["tarefas"] });
    setOpen(false);
    setForm(EMPTY);
  };

  const handleMoveStatus = async (id: string, status: Tarefa["status"]) => {
    await supabase.from("tarefas" as never).update({ status } as never).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tarefas"] });
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Produção de Conteúdo"
        subtitle="Board de tarefas de conteúdo e criativos"
        actions={<Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" />Nova tarefa</Button>}
      />

      <div className="mb-5">
        <Input placeholder="Buscar tarefa..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} className="max-w-sm" />
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {colunas.map((col) => {
          const cards = filtered.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border ${col.color} min-w-[220px] w-56 shrink-0 p-3`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-charcoal-mid">{col.label}</span>
                <span className="text-xs text-muted bg-white rounded-full px-2 py-0.5 border">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((t) => (
                  <div key={t.id} className="bg-white rounded-lg p-3 border border-cream-medium shadow-sm">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-medium text-charcoal line-clamp-2">{t.titulo}</p>
                      <Badge variant={prioridadeBadge[t.prioridade] ?? "default"} className="shrink-0 text-xs">{t.prioridade}</Badge>
                    </div>
                    <p className="text-xs text-muted mb-2">{tipoLabel[t.tipo] ?? t.tipo}</p>
                    {t.data_entrega && <p className="text-xs text-copper font-medium">📅 {t.data_entrega}</p>}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {colunas.filter((c) => c.key !== col.key).slice(0, 2).map((c) => (
                        <button key={c.key} onClick={() => handleMoveStatus(t.id, c.key)} className="text-xs text-muted hover:text-brand transition-colors">→ {c.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {cards.length === 0 && <p className="text-xs text-muted text-center py-4">Vazio</p>}
              </div>
            </div>
          );
        })}
      </div>

      {tarefas.length === 0 && (
        <div className="text-center py-8">
          <FileImage className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-charcoal font-medium mb-1">Nenhuma tarefa ainda</p>
          <p className="text-sm text-muted mb-4">Crie tarefas de conteúdo e acompanhe a produção</p>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova tarefa de conteúdo" size="md">
        <div className="space-y-4">
          <Input label="Título *" value={form.titulo} onChange={set("titulo")} placeholder="Ex: Post Instagram - Black Friday" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo" value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))} options={Object.entries(tipoLabel).map(([k, v]) => ({ value: k, label: v }))} />
            <Select label="Prioridade" value={form.prioridade} onValueChange={(v) => setForm((p) => ({ ...p, prioridade: v }))} options={[{ value: "baixa", label: "Baixa" }, { value: "media", label: "Média" }, { value: "alta", label: "Alta" }, { value: "urgente", label: "Urgente" }]} />
          </div>
          <Select label="Cliente" value={form.cliente_id} onValueChange={(v) => setForm((p) => ({ ...p, cliente_id: v }))} options={[{ value: "", label: "Sem cliente específico" }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]} />
          <Input label="Prazo" type="date" value={form.data_entrega} onChange={set("data_entrega")} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-charcoal-mid">Descrição</label>
            <textarea value={form.descricao} onChange={set("descricao")} rows={2} className="w-full rounded-lg border border-cream-medium bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/40" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Criar tarefa</Button>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderKanban, ChevronRight, Pencil, FileText, Upload, ExternalLink } from "lucide-react";
import { brl, dateBR } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo", pausado: "Pausado", concluido: "Concluído", cancelado: "Cancelado",
};
const STATUS_COLORS: Record<string, string> = {
  ativo: "text-success", pausado: "text-warning", concluido: "text-primary", cancelado: "text-muted-foreground",
};

export default function Projetos() {
  const navigate = useNavigate();
  const { canWrite, user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [editProject, setEditProject] = useState<any | null>(null);
  const [contractUploading, setContractUploading] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("projects").select("*").order("name"),
      supabase.from("transactions").select("project_id, type, amount_brl"),
    ]);
    setProjects(p || []); setTx(t || []);
  };
  useEffect(() => { load(); }, []);

  const stats = (id: string) => {
    const ms = tx.filter(t => t.project_id === id);
    const r = ms.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.amount_brl), 0);
    const c = ms.filter(t => t.type === "saida").reduce((s, t) => s + Number(t.amount_brl), 0);
    return { receita: r, custo: c, margem: r - c, marginPct: r > 0 ? ((r - c) / r * 100) : 0 };
  };

  const openContract = async (path: string) => {
    const { data } = await supabase.storage.from("contracts").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Contrato não encontrado");
  };

  const uploadContract = async (projectId: string, file: File) => {
    setContractUploading(true);
    const path = `${projectId}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("contracts").upload(path, file);
    if (upErr) { toast.error("Erro no upload: " + upErr.message); setContractUploading(false); return; }
    const { error } = await supabase.from("projects").update({ contract_url: path }).eq("id", projectId);
    if (error) toast.error(error.message);
    else { toast.success("Contrato enviado"); load(); }
    setContractUploading(false);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { data: proj, error } = await supabase.from("projects").insert({
      name: f.get("name") as string,
      client: f.get("client") as string || null,
      status: (f.get("status") as string) || "ativo",
      monthly_revenue_brl: parseFloat(f.get("mrr") as string) || null,
      budget_brl: parseFloat(f.get("budget") as string) || null,
      total_contract_value_brl: parseFloat(f.get("contract_value") as string) || null,
      start_date: f.get("start") as string || null,
      entry_date: f.get("entry_date") as string || null,
      tokens_used_usd: parseFloat(f.get("tokens") as string) || 0,
      notes: f.get("notes") as string || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }

    // Upload contrato se houver
    const contractFile = f.get("contract") as File;
    if (contractFile && contractFile.size > 0 && proj) {
      await uploadContract(proj.id, contractFile);
    } else {
      toast.success("Projeto criado");
    }
    setOpenCreate(false);
    load();
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("projects").update({
      name: f.get("name") as string,
      client: f.get("client") as string || null,
      status: f.get("status") as string,
      monthly_revenue_brl: parseFloat(f.get("mrr") as string) || null,
      budget_brl: parseFloat(f.get("budget") as string) || null,
      total_contract_value_brl: parseFloat(f.get("contract_value") as string) || null,
      start_date: f.get("start") as string || null,
      end_date: f.get("end") as string || null,
      entry_date: f.get("entry_date") as string || null,
      tokens_used_usd: parseFloat(f.get("tokens") as string) || 0,
      notes: f.get("notes") as string || null,
    }).eq("id", editProject.id);
    if (error) { toast.error(error.message); return; }

    // Novo contrato
    const contractFile = f.get("contract") as File;
    if (contractFile && contractFile.size > 0) {
      await uploadContract(editProject.id, contractFile);
    } else {
      toast.success("Projeto atualizado");
    }
    setEditProject(null);
    load();
  };

  const ProjectForm = ({ project, onSubmit, label }: { project?: any; onSubmit: any; label: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label>Nome do Projeto</Label><Input name="name" required defaultValue={project?.name} /></div>
      <div className="space-y-2"><Label>Cliente</Label><Input name="client" defaultValue={project?.client} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Data de Entrada do Cliente</Label>
          <Input type="date" name="entry_date" defaultValue={project?.entry_date || project?.start_date} />
        </div>
        <div className="space-y-2"><Label>Status</Label>
          <Select name="status" defaultValue={project?.status || "ativo"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>MRR (R$)</Label><Input type="number" step="0.01" name="mrr" defaultValue={project?.monthly_revenue_brl} /></div>
        <div className="space-y-2"><Label>Valor Total Contrato (R$)</Label><Input type="number" step="0.01" name="contract_value" defaultValue={project?.total_contract_value_brl} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Início contrato</Label><Input type="date" name="start" defaultValue={project?.start_date} /></div>
        <div className="space-y-2"><Label>Fim contrato</Label><Input type="date" name="end" defaultValue={project?.end_date} /></div>
      </div>
      <div className="space-y-2"><Label>Tokens gastos (USD)</Label>
        <Input type="number" step="0.01" name="tokens" defaultValue={project?.tokens_used_usd || 0} placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label>Contrato (PDF) {project?.contract_url ? "— envie novo para substituir" : ""}</Label>
        <Input type="file" name="contract" accept="application/pdf,.pdf" />
        {project?.contract_url && (
          <Button type="button" size="sm" variant="outline" onClick={() => openContract(project.contract_url)} className="w-full mt-1">
            <ExternalLink className="h-4 w-4 mr-2" /> Ver contrato atual
          </Button>
        )}
      </div>
      <div className="space-y-2"><Label>Observações</Label><Input name="notes" defaultValue={project?.notes} /></div>
      <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground" disabled={contractUploading}>
        {contractUploading ? "Enviando contrato..." : label}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Projetos" description="Métricas, contratos e lucro por cliente"
        actions={canWrite && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Novo Projeto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
              <ProjectForm onSubmit={handleCreate} label="Criar projeto" />
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => {
          const s = stats(p.id);
          return (
            <Card key={p.id} className="p-5 bg-gradient-surface border-border/50 hover:shadow-elegant hover:border-primary/40 transition-all">
              <div className="flex items-start justify-between">
                <Link to={`/projetos/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0"><FolderKanban className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.client || "—"}</p>
                    {p.entry_date && <p className="text-xs text-muted-foreground">Entrada: {dateBR(p.entry_date)}</p>}
                  </div>
                </Link>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {canWrite && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditProject(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {p.contract_url && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openContract(p.contract_url)} title="Ver contrato">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  )}
                  {p.hub_project_id && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/hub/projetos/${p.hub_project_id}`)} title="Ver no Hub">
                      <ExternalLink className="h-3.5 w-3.5 text-emerald-500" />
                    </Button>
                  )}
                  <Link to={`/projetos/${p.id}`}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                <div><p className="text-muted-foreground">Receita</p><p className="font-semibold text-success tabular-nums">{brl(s.receita)}</p></div>
                <div><p className="text-muted-foreground">Custo</p><p className="font-semibold text-destructive tabular-nums">{brl(s.custo)}</p></div>
                <div><p className="text-muted-foreground">Margem</p><p className={`font-semibold tabular-nums ${s.margem >= 0 ? "text-success" : "text-destructive"}`}>{s.marginPct.toFixed(0)}%</p></div>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] || ""}`}>{STATUS_LABELS[p.status] || p.status}</Badge>
                {p.monthly_revenue_brl && <Badge variant="outline" className="text-xs">MRR {brl(p.monthly_revenue_brl)}</Badge>}
                {p.total_contract_value_brl && <Badge variant="outline" className="text-xs">Contrato {brl(p.total_contract_value_brl)}</Badge>}
                {p.tokens_used_usd > 0 && <Badge variant="outline" className="text-xs text-primary">Tokens US$ {Number(p.tokens_used_usd).toFixed(2)}</Badge>}
              </div>
            </Card>
          );
        })}
        {!projects.length && <p className="text-muted-foreground col-span-full text-center py-8">Nenhum projeto cadastrado.</p>}
      </div>

      <Dialog open={!!editProject} onOpenChange={v => !v && setEditProject(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Projeto</DialogTitle></DialogHeader>
          {editProject && <ProjectForm project={editProject} onSubmit={handleEdit} label="Salvar alterações" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus, X, Pencil, Trash2, User, Calendar, Briefcase,
  Search, Loader2, CheckSquare, Square, Clock, BarChart2, Kanban,
  MoreHorizontal, Check, AlertCircle, History, ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column {
  id: string;
  name: string;
  color: string;
  column_type: "todo" | "active" | "done";
  sort_order: number;
}

interface CheckItem {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  sort_order: number;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: string | null;
  project_id: string | null;
  column_id: string | null;
  status: string;
  type: string;
  priority: string;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  time_estimate_min: number | null;
  sort_order: number;
  created_at: string;
  hub_projects?: { name: string } | null;
  checklist?: CheckItem[];
}

interface Project { id: string; name: string }

interface Member { id: string; full_name: string; email: string }

interface HistoryItem {
  id: string;
  task_id: string;
  task_title: string;
  user_email: string | null;
  action: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  baixa: "bg-muted-foreground/40",
  normal: "bg-primary/60",
  alta: "bg-destructive",
};

const BLANK_TASK = {
  title: "", description: "", assignee: "", project_id: "",
  type: "geral", priority: "normal", due_date: "", time_estimate_min: "",
};

function minutesToDisplay(min: number | null): string {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

function diffMin(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HubBoard() {
  const { user } = useAuth();
  const [columns, setColumns]   = useState<Column[]>([]);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers]   = useState<Member[]>([]);
  const [history, setHistory]   = useState<HistoryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState<"board" | "metrics">("board");

  // Filters
  const [search, setSearch]               = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  // Column management
  const [editingCol, setEditingCol] = useState<Column | null>(null);
  const [addingCol, setAddingCol]   = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<"todo" | "active" | "done">("active");

  // Task modal
  const [selectedTask, setSelectedTask]   = useState<Task | null>(null);
  const [taskForm, setTaskForm]           = useState(BLANK_TASK);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm]   = useState(false);
  const [newTaskColId, setNewTaskColId]   = useState<string>("");
  const [saving, setSaving]               = useState(false);

  // Checklist
  const [newCheckText, setNewCheckText] = useState("");

  // Move confirmation
  const [confirmMove, setConfirmMove] = useState<{ task: Task; toColId: string } | null>(null);

  // Drag
  const dragTask = useRef<Task | null>(null);
  const [tableError, setTableError] = useState(false);

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    try {
      const [{ data: cols, error: ce }, { data: td, error: te }, { data: pd }, { data: hd }, { data: md }] = await Promise.all([
        (supabase as any).from("hub_board_columns").select("*").order("sort_order"),
        (supabase as any).from("hub_board_tasks").select("*, hub_projects(name), hub_task_checklist(*)").order("sort_order"),
        supabase.from("hub_projects").select("id, name").order("name"),
        (supabase as any).from("hub_task_history").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
      ]);
      if (ce || te) { setTableError(true); setLoading(false); return; }
      const tasksWithCheck = (td || []).map((t: any) => ({
        ...t,
        checklist: (t.hub_task_checklist || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
      setColumns(cols || []);
      setTasks(tasksWithCheck);
      setProjects(pd || []);
      setHistory(hd || []);
      setMembers((md || []).filter((m: any) => m.full_name));
    } catch { setTableError(true); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const visible = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAssignee && t.assignee !== filterAssignee) return false;
    return true;
  });

  const byCol      = (colId: string) => visible.filter(t => t.column_id === colId);
  const assignees  = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[];
  const doneColIds = columns.filter(c => c.column_type === "done").map(c => c.id);

  // ─── History logging ───────────────────────────────────────────────────────

  const logHistory = async (
    taskId: string, taskTitle: string,
    action: string, fromVal?: string, toVal?: string,
  ) => {
    await (supabase as any).from("hub_task_history").insert({
      task_id: taskId, task_title: taskTitle,
      user_email: user?.email || null,
      action, from_value: fromVal || null, to_value: toVal || null,
    });
  };

  // ─── Column CRUD ───────────────────────────────────────────────────────────

  const addColumn = async () => {
    if (!newColName.trim()) return;
    const maxOrder = Math.max(0, ...columns.map(c => c.sort_order));
    const { error } = await (supabase as any).from("hub_board_columns").insert({
      name: newColName.trim(), color: "#18aa61", sort_order: maxOrder + 1, column_type: newColType,
    });
    if (error) { toast.error(error.message); return; }
    setAddingCol(false); setNewColName(""); setNewColType("active");
    load();
  };

  const updateColumn = async () => {
    if (!editingCol) return;
    await (supabase as any).from("hub_board_columns")
      .update({ name: editingCol.name, column_type: editingCol.column_type })
      .eq("id", editingCol.id);
    setEditingCol(null); load();
  };

  const deleteColumn = async (col: Column) => {
    const count = tasks.filter(t => t.column_id === col.id).length;
    if (count > 0 && !confirm(`Esta coluna tem ${count} tarefa(s). Excluir mesmo assim?`)) return;
    await (supabase as any).from("hub_board_columns").delete().eq("id", col.id);
    load();
  };

  // ─── Task CRUD ─────────────────────────────────────────────────────────────

  const openNewTask = (colId: string) => {
    setEditingTaskId(null);
    setTaskForm(BLANK_TASK);
    setNewTaskColId(colId);
    setShowTaskForm(true);
  };

  const openEditTask = (t: Task) => {
    setEditingTaskId(t.id);
    setTaskForm({
      title: t.title, description: t.description ?? "", assignee: t.assignee ?? "",
      project_id: t.project_id ?? "", type: t.type, priority: t.priority,
      due_date: t.due_date ?? "", time_estimate_min: String(t.time_estimate_min ?? ""),
    });
    setNewTaskColId(t.column_id ?? "");
    setShowTaskForm(true);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) { toast.error("Título obrigatório"); return; }
    setSaving(true);

    const col = columns.find(c => c.id === newTaskColId);
    const now = new Date().toISOString();
    const payload: any = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      assignee: taskForm.assignee.trim() || null,
      project_id: taskForm.project_id || null,
      type: taskForm.type, priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      column_id: newTaskColId || null,
      time_estimate_min: taskForm.time_estimate_min ? parseInt(taskForm.time_estimate_min) : null,
    };

    if (editingTaskId) {
      const existing = tasks.find(t => t.id === editingTaskId);
      if (col?.column_type === "done" && !existing?.completed_at) payload.completed_at = now;
      if (col?.column_type !== "todo" && !existing?.started_at) payload.started_at = now;
      await (supabase as any).from("hub_board_tasks").update(payload).eq("id", editingTaskId);
      await logHistory(editingTaskId, payload.title, "Tarefa editada");
      toast.success("Tarefa atualizada");
    } else {
      const maxOrder = Math.max(0, ...tasks.filter(t => t.column_id === newTaskColId).map(t => t.sort_order));
      if (col?.column_type !== "todo") payload.started_at = now;
      const { data } = await (supabase as any).from("hub_board_tasks")
        .insert({ ...payload, sort_order: maxOrder + 1 }).select().single();
      if (data) await logHistory(data.id, payload.title, "Tarefa criada", undefined, col?.name);
      toast.success("Tarefa criada");
    }

    setSaving(false); setShowTaskForm(false); setEditingTaskId(null); load();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Excluir tarefa?")) return;
    const task = tasks.find(t => t.id === id);
    if (task) await logHistory(id, task.title, "Tarefa excluída");
    await (supabase as any).from("hub_board_tasks").delete().eq("id", id);
    if (selectedTask?.id === id) setSelectedTask(null);
    load();
  };

  // ─── Move task (with confirmation for done columns) ────────────────────────

  const requestMove = (task: Task, toColId: string) => {
    if (task.column_id === toColId) return;
    const fromCol = columns.find(c => c.id === task.column_id);
    const toCol   = columns.find(c => c.id === toColId);
    if (toCol?.column_type === "done" || fromCol?.column_type === "done") {
      setConfirmMove({ task, toColId });
    } else {
      executeMove(task, toColId);
    }
  };

  const executeMove = async (task: Task, toColId: string) => {
    const fromCol = columns.find(c => c.id === task.column_id);
    const toCol   = columns.find(c => c.id === toColId);
    const now = new Date().toISOString();
    const update: any = { column_id: toColId };

    if (toCol?.column_type !== "todo" && !task.started_at) update.started_at = now;
    if (toCol?.column_type === "done" && !task.completed_at) update.completed_at = now;
    if (toCol?.column_type !== "done" && task.completed_at) update.completed_at = null;

    await (supabase as any).from("hub_board_tasks").update(update).eq("id", task.id);
    await logHistory(task.id, task.title, "Movido de coluna", fromCol?.name, toCol?.name);
    setConfirmMove(null);
    load();
  };

  // ─── Drag & Drop ───────────────────────────────────────────────────────────

  const onDrop = (toColId: string) => {
    if (!dragTask.current) return;
    requestMove(dragTask.current, toColId);
    dragTask.current = null;
  };

  // ─── Checklist ─────────────────────────────────────────────────────────────

  const addCheckItem = async (taskId: string) => {
    if (!newCheckText.trim()) return;
    const task = tasks.find(t => t.id === taskId);
    const maxOrder = Math.max(0, ...(task?.checklist || []).map(c => c.sort_order));
    await (supabase as any).from("hub_task_checklist").insert({
      task_id: taskId, title: newCheckText.trim(), sort_order: maxOrder + 1,
    });
    if (task) await logHistory(taskId, task.title, `Checklist adicionado: "${newCheckText.trim()}"`);
    setNewCheckText("");
    load();
  };

  const toggleCheck = async (item: CheckItem, taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const now = new Date().toISOString();
    await (supabase as any).from("hub_task_checklist").update({
      done: !item.done, done_at: !item.done ? now : null,
    }).eq("id", item.id);
    if (task) await logHistory(taskId, task.title, `Checklist ${!item.done ? "marcado" : "desmarcado"}: "${item.title}"`);
    load();
  };

  const deleteCheck = async (id: string) => {
    await (supabase as any).from("hub_task_checklist").delete().eq("id", id);
    load();
  };

  // ─── Metrics ───────────────────────────────────────────────────────────────

  const metricsByUser = assignees.map(a => {
    const userTasks = tasks.filter(t => t.assignee === a);
    const done = userTasks.filter(t => t.column_id && doneColIds.includes(t.column_id));
    const overdue = userTasks.filter(t =>
      t.due_date && t.due_date < new Date().toISOString().slice(0, 10) &&
      !(t.column_id && doneColIds.includes(t.column_id))
    );
    const completionTimes = done
      .filter(t => t.started_at && t.completed_at)
      .map(t => diffMin(t.started_at!, t.completed_at!));
    const avgMin = completionTimes.length
      ? Math.round(completionTimes.reduce((s, v) => s + v, 0) / completionTimes.length)
      : null;
    const taskIds = userTasks.map(t => t.id);
    const historyCount = history.filter(h => taskIds.includes(h.task_id)).length;
    return { name: a, total: userTasks.length, done: done.length, overdue: overdue.length, avgMin, historyCount };
  });

  // ─── Guards ────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-muted-foreground p-6">Carregando board...</div>;

  if (tableError) return (
    <div className="space-y-6 max-w-2xl mx-auto pt-8">
      <PageHeader title="Board de Tarefas" description="Kanban da equipe" />
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-3">
        <p className="font-semibold text-amber-400 text-sm">Tabela não encontrada</p>
        <p className="text-sm text-muted-foreground">Execute o SQL no Supabase ou peça ao Claude para rodar via Management API.</p>
        <button onClick={() => { setTableError(false); setLoading(true); load(); }}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          Tentar novamente
        </button>
      </div>
    </div>
  );

  const confirmMoveFromCol = columns.find(c => c.id === confirmMove?.task.column_id);
  const confirmMoveToCol   = columns.find(c => c.id === confirmMove?.toColId);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Board de Tarefas" description="Kanban da equipe — gerencie e acompanhe tarefas" />
        <div className="flex gap-2">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === "board" ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Kanban className="h-4 w-4" /> Board
          </button>
          <button
            onClick={() => setView("metrics")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === "metrics" ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <BarChart2 className="h-4 w-4" /> Métricas
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card className="p-3 bg-gradient-surface border-border/50">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar tarefa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          <Select value={filterAssignee || "__all__"} onValueChange={v => setFilterAssignee(v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.full_name}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || filterAssignee) && (
            <Button variant="ghost" size="sm" className="h-8" onClick={() => { setSearch(""); setFilterAssignee(""); }}>
              <X className="h-3.5 w-3.5 mr-1" /> Limpar
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {visible.length} tarefa{visible.length !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>

      {/* ══════════════════════════════ BOARD VIEW ═══════════════════════════ */}
      {view === "board" && (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {columns.map(col => {
            const colTasks = byCol(col.id);
            const isDone   = col.column_type === "done";
            return (
              <div
                key={col.id}
                className="flex-shrink-0 w-72 rounded-xl border border-border/60 bg-card/40 flex flex-col"
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(col.id)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 p-3 border-b border-border/40">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                  {editingCol?.id === col.id ? (
                    <div className="flex gap-1 flex-1">
                      <Input
                        value={editingCol.name}
                        onChange={e => setEditingCol({ ...editingCol, name: e.target.value })}
                        className="h-6 text-xs flex-1"
                        onKeyDown={e => { if (e.key === "Enter") updateColumn(); if (e.key === "Escape") setEditingCol(null); }}
                        autoFocus
                      />
                      <button onClick={updateColumn} className="text-primary"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditingCol(null)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-sm flex-1">{col.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{colTasks.length}</Badge>
                      {isDone && <Check className="h-3.5 w-3.5 text-success" />}
                      <button onClick={() => setEditingCol(col)} className="text-muted-foreground hover:text-foreground p-0.5">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteColumn(col)} className="text-muted-foreground hover:text-destructive p-0.5">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px]">
                  {colTasks.map(task => {
                    const checkDone  = (task.checklist || []).filter(c => c.done).length;
                    const checkTotal = (task.checklist || []).length;
                    const isOverdue  = task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && !isDone;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => { dragTask.current = task; }}
                        className="bg-card border border-border/50 rounded-lg p-3 cursor-grab hover:border-primary/30 transition-colors group"
                      >
                        <div className="flex items-start gap-2 mb-1.5">
                          <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || "bg-muted-foreground/40"}`} />
                          <p
                            className="text-sm font-medium leading-snug flex-1 cursor-pointer"
                            onClick={() => setSelectedTask(task)}
                          >
                            {task.title}
                          </p>

                          {/* "..." dropdown menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                onClick={e => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                                <CheckSquare className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditTask(task)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Editar tarefa
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[10px] font-normal text-muted-foreground py-1">
                                Mover para coluna
                              </DropdownMenuLabel>
                              {columns.filter(c => c.id !== col.id).map(c => (
                                <DropdownMenuItem key={c.id} onClick={() => requestMove(task, c.id)}>
                                  <ArrowRight className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                  {c.name}
                                  {c.column_type === "done" && (
                                    <Check className="h-3 w-3 ml-auto text-success" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteTask(task.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div
                          className="flex flex-wrap gap-1.5 cursor-pointer"
                          onClick={() => setSelectedTask(task)}
                        >
                          {task.assignee && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5">
                              <User className="h-2.5 w-2.5" />{task.assignee}
                            </span>
                          )}
                          {task.hub_projects?.name && (
                            <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5">
                              <Briefcase className="h-2.5 w-2.5" />{task.hub_projects.name}
                            </span>
                          )}
                          {task.due_date && (
                            <span className={`flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 ${isOverdue ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted/40"}`}>
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(task.due_date + "T12:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {checkTotal > 0 && (
                            <span className={`flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 ${checkDone === checkTotal ? "text-success bg-success/10" : "text-muted-foreground bg-muted/40"}`}>
                              <CheckSquare className="h-2.5 w-2.5" />{checkDone}/{checkTotal}
                            </span>
                          )}
                          {task.completed_at && task.started_at && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {minutesToDisplay(diffMin(task.started_at, task.completed_at))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/30 border-2 border-dashed border-border/20 rounded-lg min-h-[60px]">
                      Nenhuma tarefa
                    </div>
                  )}
                </div>

                {/* Add task */}
                <button
                  onClick={() => openNewTask(col.id)}
                  className="flex items-center gap-2 p-3 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-t border-border/30 rounded-b-xl"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova tarefa
                </button>
              </div>
            );
          })}

          {/* Add column */}
          <div className="flex-shrink-0 w-56">
            {addingCol ? (
              <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
                <Input
                  placeholder="Nome da coluna" value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addColumn(); if (e.key === "Escape") setAddingCol(false); }}
                  className="h-8 text-sm" autoFocus
                />
                <Select value={newColType} onValueChange={v => setNewColType(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Fila (início)</SelectItem>
                    <SelectItem value="active">Em andamento</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addColumn} className="flex-1 h-7 text-xs">Criar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingCol(false)} className="h-7 text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCol(true)}
                className="w-full flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-border/40 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Plus className="h-4 w-4" /> Nova coluna
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════ METRICS VIEW ══════════════════════════ */}
      {view === "metrics" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total de tarefas", value: tasks.length, color: "text-foreground" },
              { label: "Concluídas", value: tasks.filter(t => t.column_id && doneColIds.includes(t.column_id)).length, color: "text-success" },
              { label: "Em andamento", value: tasks.filter(t => t.column_id && !doneColIds.includes(t.column_id) && t.started_at).length, color: "text-primary" },
              { label: "Atrasadas", value: tasks.filter(t => t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && !(t.column_id && doneColIds.includes(t.column_id))).length, color: "text-destructive" },
            ].map(m => (
              <Card key={m.label} className="p-4 bg-gradient-surface border-border/50 text-center">
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              </Card>
            ))}
          </div>

          {/* Per-user performance */}
          {metricsByUser.length > 0 ? (
            <Card className="bg-gradient-surface border-border/50 overflow-hidden">
              <div className="p-4 border-b border-border/40">
                <h3 className="font-semibold text-sm">Desempenho por Responsável</h3>
              </div>
              <div className="divide-y divide-border/30">
                {metricsByUser.map(m => {
                  const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
                  return (
                    <div key={m.name} className="p-4 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{m.name}</span>
                      </div>
                      <div className="flex gap-4 text-sm flex-wrap flex-1">
                        <span className="text-muted-foreground">{m.total} tarefas</span>
                        <span className="text-success">{m.done} concluídas</span>
                        {m.overdue > 0 && (
                          <span className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />{m.overdue} atrasadas
                          </span>
                        )}
                        {m.avgMin !== null && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />Média: {minutesToDisplay(m.avgMin)}
                          </span>
                        )}
                        <span className="text-muted-foreground flex items-center gap-1">
                          <History className="h-3.5 w-3.5" />{m.historyCount} ações
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              Nenhuma tarefa com responsável atribuído ainda.
            </div>
          )}

          {/* History log */}
          {history.length > 0 && (
            <Card className="bg-gradient-surface border-border/50 overflow-hidden">
              <div className="p-4 border-b border-border/40 flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Histórico de Ações</h3>
                <span className="ml-auto text-xs text-muted-foreground">{history.length} registros</span>
              </div>
              <div className="divide-y divide-border/20 max-h-[400px] overflow-y-auto">
                {history.map(h => (
                  <div key={h.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/10">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                      {(h.user_email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-medium text-foreground">{h.user_email?.split("@")[0] || "Sistema"}</span>
                        {" "}<span className="text-muted-foreground">{h.action}</span>
                        {h.from_value && h.to_value && (
                          <span className="text-muted-foreground">
                            {" "}·{" "}
                            <span className="text-foreground/70">{h.from_value}</span>
                            {" "}<ArrowRight className="h-2.5 w-2.5 inline" />{" "}
                            <span className="text-primary">{h.to_value}</span>
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {h.task_title} · {new Date(h.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* All tasks table */}
          <Card className="bg-gradient-surface border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/40">
              <h3 className="font-semibold text-sm">Todas as tarefas</h3>
            </div>
            <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
              {tasks.map(t => {
                const col = columns.find(c => c.id === t.column_id);
                const dur = t.started_at && t.completed_at ? diffMin(t.started_at, t.completed_at) : null;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 text-sm hover:bg-muted/20">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{t.assignee || "—"}</span>
                    {col && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0" style={{ borderColor: col.color + "60", color: col.color }}>
                        {col.name}
                      </Badge>
                    )}
                    {dur !== null && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />{minutesToDisplay(dur)}
                      </span>
                    )}
                    {t.due_date && (
                      <span className={`text-xs shrink-0 ${t.due_date < new Date().toISOString().slice(0, 10) && col?.column_type !== "done" ? "text-destructive" : "text-muted-foreground"}`}>
                        {new Date(t.due_date + "T12:00").toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                );
              })}
              {tasks.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma tarefa criada.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ MOVE CONFIRMATION ═══════════════════════════════════ */}
      <AlertDialog open={!!confirmMove} onOpenChange={open => !open && setConfirmMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmMoveToCol?.column_type === "done" ? "Confirmar conclusão" : "Reabrir tarefa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMoveToCol?.column_type === "done"
                ? `Você está marcando "${confirmMove?.task.title}" como concluída. O tempo de conclusão será registrado.`
                : `Você está movendo "${confirmMove?.task.title}" de "${confirmMoveFromCol?.name}" para "${confirmMoveToCol?.name}". O tempo de conclusão será resetado.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmMove && executeMove(confirmMove.task, confirmMove.toColId)}
            >
              {confirmMoveToCol?.column_type === "done" ? "Sim, concluir" : "Sim, mover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══════════════ TASK FORM MODAL ═════════════════════════════════════ */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTaskForm(false)}>
          <Card className="w-full max-w-lg p-6 space-y-4 bg-card border-border max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editingTaskId ? "Editar tarefa" : "Nova tarefa"}</h2>
              <button onClick={() => setShowTaskForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            <div>
              <Label className="text-xs">Coluna</Label>
              <Select value={newTaskColId || "__none__"} onValueChange={v => setNewTaskColId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem coluna</SelectItem>
                  {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Descreva a tarefa..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} className="mt-1 text-sm resize-none" rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Responsável</Label>
                <Select
                  value={taskForm.assignee || "__none__"}
                  onValueChange={v => setTaskForm(f => ({ ...f, assignee: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {members.map(m => (
                      <SelectItem key={m.id} value={m.full_name}>
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {m.full_name.charAt(0).toUpperCase()}
                          </span>
                          {m.full_name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prazo</Label>
                <Input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={taskForm.type} onValueChange={v => setTaskForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pessoal">Pessoal</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="projeto">Projeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridade</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Estimativa (min)</Label>
                <Input type="number" value={taskForm.time_estimate_min} onChange={e => setTaskForm(f => ({ ...f, time_estimate_min: e.target.value }))} placeholder="ex: 60" className="mt-1" />
              </div>
            </div>

            {taskForm.type === "projeto" && (
              <div>
                <Label className="text-xs">Projeto / Cliente</Label>
                <Select value={taskForm.project_id || "__none__"} onValueChange={v => setTaskForm(f => ({ ...f, project_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={saveTask} disabled={saving} className="flex-1">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : editingTaskId ? "Salvar" : "Criar tarefa"}
              </Button>
              <Button variant="outline" onClick={() => setShowTaskForm(false)}>Cancelar</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ TASK DETAIL MODAL ═══════════════════════════════════ */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <Card className="w-full max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {columns.find(c => c.id === selectedTask.column_id)?.name ?? "Sem coluna"}
                  </p>
                  <h2 className="font-semibold text-base">{selectedTask.title}</h2>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setSelectedTask(null); openEditTask(selectedTask); }} className="p-1.5 hover:bg-muted rounded">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => setSelectedTask(null)} className="p-1.5 hover:bg-muted rounded">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {selectedTask.description && (
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {selectedTask.assignee && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{selectedTask.assignee}</span>}
                {selectedTask.due_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(selectedTask.due_date + "T12:00").toLocaleDateString("pt-BR")}</span>}
                {selectedTask.started_at && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Iniciado: {new Date(selectedTask.started_at).toLocaleString("pt-BR")}</span>}
                {selectedTask.completed_at && <span className="flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" />Concluído: {new Date(selectedTask.completed_at).toLocaleString("pt-BR")}</span>}
                {selectedTask.started_at && selectedTask.completed_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />Duração: {minutesToDisplay(diffMin(selectedTask.started_at, selectedTask.completed_at))}
                  </span>
                )}
                {selectedTask.time_estimate_min && <span>Estimativa: {minutesToDisplay(selectedTask.time_estimate_min)}</span>}
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Checklist</p>
                {(tasks.find(t => t.id === selectedTask.id)?.checklist || []).map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button onClick={() => toggleCheck(item, selectedTask.id)} className="shrink-0">
                      {item.done
                        ? <CheckSquare className="h-4 w-4 text-success" />
                        : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                    {item.done_at && (
                      <span className="text-[10px] text-muted-foreground">{new Date(item.done_at).toLocaleString("pt-BR")}</span>
                    )}
                    <button onClick={() => deleteCheck(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Adicionar item..."
                    value={newCheckText}
                    onChange={e => setNewCheckText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCheckItem(selectedTask.id); }}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" onClick={() => addCheckItem(selectedTask.id)} className="h-7 text-xs px-2">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Task history */}
              {history.filter(h => h.task_id === selectedTask.id).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Histórico</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {history.filter(h => h.task_id === selectedTask.id).map(h => (
                      <div key={h.id} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground/60 shrink-0 mt-0.5 tabular-nums">
                          {new Date(h.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground/80">{h.user_email?.split("@")[0] || "Sistema"}</span>
                          {" "}{h.action}
                          {h.from_value && h.to_value && (
                            <span className="text-primary"> → {h.to_value}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

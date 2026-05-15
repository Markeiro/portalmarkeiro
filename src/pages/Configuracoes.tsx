import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Plus, Trash2, Pencil, Bell, Mail, MessageSquare,
  CheckCircle, XCircle, Clock, Info,
} from "lucide-react";
import { brl, dateBR } from "@/lib/format";

// ─── helpers ────────────────────────────────────────────────────────
const FREQ_LABELS: Record<string, string> = {
  daily: "Diário", weekly: "Semanal", monthly: "Mensal", once: "Uma vez",
};
const CH_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  whatsapp: <MessageSquare className="h-3.5 w-3.5" />,
};

// ─── ReminderForm ────────────────────────────────────────────────────
function ReminderForm({ item, onSubmit, label }: { item?: any; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; label: string }) {
  const [channels, setChannels] = useState<string[]>(item?.channels || ["email"]);

  const toggleChannel = (ch: string) =>
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="channels" value={channels.join(",")} />

      <div className="space-y-2"><Label>Título</Label><Input name="title" required defaultValue={item?.title} placeholder="Ex: Vencimento DAS" /></div>
      <div className="space-y-2"><Label>Descrição / mensagem</Label>
        <textarea name="description" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none" defaultValue={item?.description} placeholder="Texto que será enviado no lembrete..." />
      </div>

      <div className="space-y-2">
        <Label>Canais</Label>
        <div className="flex gap-3">
          {["email", "whatsapp"].map(ch => (
            <button key={ch} type="button" onClick={() => toggleChannel(ch)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${channels.includes(ch) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
              {CH_ICONS[ch]} {ch === "email" ? "E-mail" : "WhatsApp"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Destinatários (um por linha)</Label>
        <textarea name="recipients" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[64px] resize-none"
          defaultValue={item?.recipients?.join("\n") || ""} placeholder="email@empresa.com&#10;+5511999999999" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Frequência</Label>
          <Select name="frequency" defaultValue={item?.frequency || "monthly"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="once">Uma vez</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Dia do mês</Label>
          <Input type="number" name="day_of_month" min={1} max={31} defaultValue={item?.day_of_month || 18}
            placeholder="Ex: 18 (2 dias antes do DAS)" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Horário de envio</Label>
          <Input type="time" name="send_time" defaultValue={item?.send_time || "08:00"} />
        </div>
        <div className="space-y-2">
          <Label>Data início</Label>
          <Input type="date" name="start_date" defaultValue={item?.start_date} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Data fim (opcional)</Label>
        <Input type="date" name="end_date" defaultValue={item?.end_date} />
      </div>

      <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">{label}</Button>
    </form>
  );
}

// ─── Main ────────────────────────────────────────────────────────────
export default function Configuracoes() {
  const { isAdmin, canWrite } = useAuth();
  const [banks, setBanks] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);
  const [ccs, setCcs] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [reminderLogs, setReminderLogs] = useState<any[]>([]);

  const [openBank, setOpenBank] = useState(false);
  const [openRec, setOpenRec] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);
  const [editBank, setEditBank] = useState<any | null>(null);
  const [editRec, setEditRec] = useState<any | null>(null);
  const [editReminder, setEditReminder] = useState<any | null>(null);

  const load = async () => {
    const [b, rr, cc, rem, remLog] = await Promise.all([
      supabase.from("bank_accounts").select("*").order("name"),
      supabase.from("recurring_rules").select("*, bank_accounts(name), cost_centers(name)").order("next_run"),
      supabase.from("cost_centers").select("*").eq("active", true),
      supabase.from("reminder_rules").select("*").order("created_at", { ascending: false }),
      supabase.from("reminder_logs").select("*, reminder_rules(title)").order("sent_at", { ascending: false }).limit(50),
    ]);
    setBanks(b.data || []);
    setRecurring(rr.data || []); setCcs(cc.data || []);
    setReminders(rem.data || []); setReminderLogs(remLog.data || []);
  };

  useEffect(() => { load(); }, []);

  // ── Banks ─────────────────────────────────────────────────────────
  const bankPayload = (f: FormData) => ({
    name: f.get("name") as string, bank: f.get("bank") as string,
    currency: f.get("currency") as any,
    opening_balance: parseFloat(f.get("ob") as string) || 0,
    opening_date: f.get("date") as string,
    color: f.get("color") as string || "#10D982",
    is_card: f.get("card") === "on",
  });

  const addBank = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { error } = await supabase.from("bank_accounts").insert(bankPayload(new FormData(e.currentTarget)));
    if (error) toast.error(error.message); else { toast.success("Conta criada"); setOpenBank(false); load(); }
  };

  const handleEditBank = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { error } = await supabase.from("bank_accounts").update(bankPayload(new FormData(e.currentTarget))).eq("id", editBank.id);
    if (error) toast.error(error.message); else { toast.success("Conta atualizada"); setEditBank(null); load(); }
  };

  const delBank = async (id: string) => {
    if (!confirm("Excluir conta?")) return;
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  // ── Recurring ─────────────────────────────────────────────────────
  const recPayload = (f: FormData) => ({
    description: f.get("desc") as string,
    type: f.get("type") as any,
    amount: parseFloat(f.get("amount") as string),
    currency: (f.get("currency") as any) || "BRL",
    frequency: "monthly",
    day_of_month: parseInt(f.get("day") as string),
    next_run: f.get("next") as string,
    bank_account_id: (f.get("bank") as string) || null,
    cost_center_id: (f.get("cc") as string) || null,
  });

  const addRec = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { error } = await supabase.from("recurring_rules").insert(recPayload(new FormData(e.currentTarget)));
    if (error) toast.error(error.message); else { toast.success("Recorrência criada"); setOpenRec(false); load(); }
  };

  const handleEditRec = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { error } = await supabase.from("recurring_rules").update(recPayload(new FormData(e.currentTarget))).eq("id", editRec.id);
    if (error) toast.error(error.message); else { toast.success("Atualizada"); setEditRec(null); load(); }
  };

  const delRec = async (id: string) => {
    if (!confirm("Excluir recorrência?")) return;
    const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  // ── Reminders ─────────────────────────────────────────────────────
  const parseReminderForm = (f: FormData) => ({
    title: f.get("title") as string,
    description: f.get("description") as string || null,
    channels: (f.get("channels") as string || "email").split(",").filter(Boolean),
    recipients: (f.get("recipients") as string || "").split("\n").map(s => s.trim()).filter(Boolean),
    frequency: f.get("frequency") as string || "monthly",
    day_of_month: parseInt(f.get("day_of_month") as string) || null,
    send_time: f.get("send_time") as string || "08:00",
    start_date: f.get("start_date") as string || null,
    end_date: f.get("end_date") as string || null,
  });

  const addReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { error } = await supabase.from("reminder_rules").insert({ ...parseReminderForm(new FormData(e.currentTarget)), active: true });
    if (error) toast.error(error.message); else { toast.success("Lembrete criado"); setOpenReminder(false); load(); }
  };

  const handleEditReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { error } = await supabase.from("reminder_rules").update(parseReminderForm(new FormData(e.currentTarget))).eq("id", editReminder.id);
    if (error) toast.error(error.message); else { toast.success("Lembrete atualizado"); setEditReminder(null); load(); }
  };

  const delReminder = async (id: string) => {
    if (!confirm("Excluir lembrete?")) return;
    const { error } = await supabase.from("reminder_rules").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const toggleReminder = async (id: string, active: boolean) => {
    const { error } = await supabase.from("reminder_rules").update({ active }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  // ── BankForm shared ───────────────────────────────────────────────
  const BankForm = ({ item, onSubmit }: { item?: any; onSubmit: any }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2"><Label>Nome (apelido)</Label><Input name="name" required defaultValue={item?.name} /></div>
      <div className="space-y-2"><Label>Banco</Label><Input name="bank" required defaultValue={item?.bank} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Moeda</Label>
          <Select name="currency" defaultValue={item?.currency || "BRL"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Saldo inicial (R$)</Label><Input type="number" step="0.01" name="ob" defaultValue={item?.opening_balance ?? 0} /></div>
      </div>
      <div className="space-y-2"><Label>Data abertura</Label><Input type="date" name="date" required defaultValue={item?.opening_date} /></div>
      <div className="space-y-2"><Label>Cor</Label><Input type="color" name="color" defaultValue={item?.color || "#10D982"} /></div>
      <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">{item ? "Salvar alterações" : "Criar conta"}</Button>
    </form>
  );

  const RecForm = ({ item, onSubmit }: { item?: any; onSubmit: any }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2"><Label>Descrição</Label><Input name="desc" required defaultValue={item?.description} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Tipo</Label>
          <Select name="type" required defaultValue={item?.type || "saida"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" name="amount" required defaultValue={item?.amount} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Dia do mês</Label><Input type="number" name="day" min="1" max="31" defaultValue={item?.day_of_month ?? 5} /></div>
        <div className="space-y-2"><Label>Próxima execução</Label><Input type="date" name="next" required defaultValue={item?.next_run} /></div>
      </div>
      <div className="space-y-2"><Label>Banco</Label>
        <Select name="bank" defaultValue={item?.bank_account_id || ""}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Centro de Custo</Label>
        <Select name="cc" defaultValue={item?.cost_center_id || ""}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{ccs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">{item ? "Salvar alterações" : "Criar recorrência"}</Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações Financeiras" description="Contas bancárias, recorrências e lembretes automáticos" />

      {/* ── Contas bancárias ── */}
      <Card className="p-5 bg-gradient-surface border-border/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg flex items-center gap-2"><Building2 className="h-5 w-5" />Contas Bancárias</h3>
          {canWrite && (
            <Dialog open={openBank} onOpenChange={setOpenBank}>
              <DialogTrigger asChild><Button size="sm" className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Conta</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Nova Conta</DialogTitle></DialogHeader><BankForm onSubmit={addBank} /></DialogContent>
            </Dialog>
          )}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Banco</TableHead><TableHead>Moeda</TableHead><TableHead>Saldo Inicial</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {banks.map(b => (
              <TableRow key={b.id}>
                <TableCell><span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: b.color }} />{b.name}</TableCell>
                <TableCell>{b.bank}</TableCell>
                <TableCell><Badge variant="outline">{b.currency}</Badge></TableCell>
                <TableCell className="tabular-nums">{brl(Number(b.opening_balance))}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {canWrite && <Button variant="ghost" size="icon" onClick={() => setEditBank(b)}><Pencil className="h-4 w-4" /></Button>}
                    {canWrite && <Button variant="ghost" size="icon" onClick={() => delBank(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ── Recorrências ── */}
      <Card className="p-5 bg-gradient-surface border-border/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg">Recorrências</h3>
          {canWrite && (
            <Dialog open={openRec} onOpenChange={setOpenRec}>
              <DialogTrigger asChild><Button size="sm" className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Recorrência</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Nova Recorrência</DialogTitle></DialogHeader><RecForm onSubmit={addRec} /></DialogContent>
            </Dialog>
          )}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Próxima</TableHead><TableHead>Centro</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {recurring.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.description}</TableCell>
                <TableCell><Badge variant={r.type === "entrada" ? "default" : "destructive"} className="text-xs">{r.type}</Badge></TableCell>
                <TableCell className="tabular-nums">{brl(Number(r.amount))}</TableCell>
                <TableCell className="text-xs">{r.next_run}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.cost_centers?.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {canWrite && <Button variant="ghost" size="icon" onClick={() => setEditRec(r)}><Pencil className="h-4 w-4" /></Button>}
                    {canWrite && <Button variant="ghost" size="icon" onClick={() => delRec(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!recurring.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma recorrência.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {/* ── Lembretes ── */}
      <Card className="p-5 bg-gradient-surface border-border/50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-display text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Lembretes Automáticos</h3>
          {canWrite && (
            <Dialog open={openReminder} onOpenChange={setOpenReminder}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-brand text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Novo lembrete</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo Lembrete</DialogTitle></DialogHeader>
                <ReminderForm onSubmit={addReminder} label="Criar lembrete" />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Info UazAPI */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 flex gap-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong className="text-foreground">WhatsApp via UazAPI:</strong> os lembretes de WhatsApp são enviados via UazAPI, que você já assina. Configure a variável <code className="bg-muted px-1 rounded">UAZAPI_TOKEN</code> e <code className="bg-muted px-1 rounded">UAZAPI_INSTANCE</code> nas Edge Functions do Supabase. O número deve estar no formato <code className="bg-muted px-1 rounded">+5511999999999</code>.</p>
            <p><strong className="text-foreground">E-mail:</strong> configurado via Resend (variável <code className="bg-muted px-1 rounded">RESEND_API_KEY</code>). Os envios acontecem diariamente pela Edge Function <code className="bg-muted px-1 rounded">send-reminders</code>.</p>
          </div>
        </div>

        <div className="space-y-3">
          {reminders.map(rem => (
            <div key={rem.id} className={`border rounded-lg p-4 ${rem.active ? "border-border/50" : "border-border/20 opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{rem.title}</p>
                    <Badge variant="outline" className="text-xs">{FREQ_LABELS[rem.frequency] || rem.frequency}</Badge>
                    {rem.day_of_month && <Badge variant="outline" className="text-xs">Dia {rem.day_of_month}</Badge>}
                    {rem.channels?.map((ch: string) => (
                      <Badge key={ch} variant="outline" className="text-xs flex items-center gap-1">
                        {CH_ICONS[ch]} {ch === "email" ? "E-mail" : "WhatsApp"}
                      </Badge>
                    ))}
                  </div>
                  {rem.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rem.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    Destinatários: {rem.recipients?.join(", ") || "—"}
                    {rem.send_time && ` • Envio: ${rem.send_time}`}
                    {rem.last_sent_at && ` • Último envio: ${dateBR(rem.last_sent_at.substring(0, 10))}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={rem.active} onCheckedChange={v => toggleReminder(rem.id, v)} />
                  {canWrite && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditReminder(rem)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => delReminder(rem.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!reminders.length && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhum lembrete configurado. Crie lembretes para DAS, vencimentos, pró-labore, etc.
            </p>
          )}
        </div>
      </Card>

      {/* ── Histórico de envios ── */}
      {reminderLogs.length > 0 && (
        <Card className="p-5 bg-gradient-surface border-border/50">
          <h3 className="font-display text-lg mb-3 flex items-center gap-2"><Clock className="h-5 w-5" />Histórico de Envios</h3>
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lembrete</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminderLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{log.reminder_rules?.title || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        {CH_ICONS[log.channel]} {log.channel}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.recipient}</TableCell>
                    <TableCell>
                      {log.status === "sent"
                        ? <span className="flex items-center gap-1 text-xs text-success"><CheckCircle className="h-3.5 w-3.5" /> Enviado</span>
                        : <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3.5 w-3.5" /> Falhou</span>
                      }
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.sent_at ? new Date(log.sent_at).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Dialogs ─────────────────────────────────────────────────── */}
      <Dialog open={!!editBank} onOpenChange={v => !v && setEditBank(null)}>
        <DialogContent><DialogHeader><DialogTitle>Editar Conta Bancária</DialogTitle></DialogHeader>
          {editBank && <BankForm item={editBank} onSubmit={handleEditBank} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRec} onOpenChange={v => !v && setEditRec(null)}>
        <DialogContent><DialogHeader><DialogTitle>Editar Recorrência</DialogTitle></DialogHeader>
          {editRec && <RecForm item={editRec} onSubmit={handleEditRec} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editReminder} onOpenChange={v => !v && setEditReminder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Lembrete</DialogTitle></DialogHeader>
          {editReminder && <ReminderForm item={editReminder} onSubmit={handleEditReminder} label="Salvar alterações" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

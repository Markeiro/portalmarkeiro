import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DRE_GROUPS: { key: string; label: string; sign: 1 | -1; sub?: string }[] = [
  { key: "receita_bruta", label: "(+) Receita Bruta (MRR)", sign: 1 },
  { key: "outras_receitas", label: "(+) Outras Receitas", sign: 1 },
  { key: "deducoes", label: "(-) Impostos e Deduções", sign: -1 },
  { key: "_receita_liquida", label: "(=) Receita Líquida", sign: 1 },
  { key: "custos", label: "(-) Custos (Software/Serviços)", sign: -1 },
  { key: "_lucro_bruto", label: "(=) Lucro Bruto", sign: 1 },
  { key: "despesas_operacionais", label: "(-) Despesas Operacionais", sign: -1 },
  { key: "despesas_pessoal", label: "(-) Pessoal e Pró-labore", sign: -1 },
  { key: "despesas_admin", label: "(-) Despesas Administrativas", sign: -1 },
  { key: "despesas_financeiras", label: "(-) Despesas Financeiras", sign: -1 },
  { key: "outras_despesas", label: "(-) Outras Despesas", sign: -1 },
  { key: "_lucro_liquido", label: "(=) Lucro Líquido", sign: 1 },
];

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function DRE() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [tx, setTx] = useState<any[]>([]);
  const [ccs, setCcs] = useState<any[]>([]);
  const [openEntry, setOpenEntry] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: txData }, { data: ccData }] = await Promise.all([
        supabase.from("transactions")
          .select("date, amount_brl, type, cost_centers(dre_group, name)")
          .gte("date", `${year}-01-01`).lte("date", `${year}-12-31`),
        supabase.from("cost_centers").select("*").eq("active", true),
      ]);
      setTx(txData || []);
      setCcs(ccData || []);
    })();
  }, [year]);

  const handleManualEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const grpKey = f.get("grupo") as string;
    const grp = DRE_GROUPS.find(g => g.key === grpKey);
    if (!grp || grp.key.startsWith("_")) return;
    // Find cost center with matching dre_group
    const cc = ccs.find(c => c.dre_group === grpKey);
    if (!cc) {
      toast.error(`Nenhum Centro de Custo com grupo DRE "${grp.label}" encontrado. Configure em Centros de Custo.`);
      return;
    }
    const month = f.get("mes") as string;
    const valor = parseFloat(f.get("valor") as string);
    const date = `${year}-${month}-01`;
    const { error } = await supabase.from("transactions").insert({
      date,
      description: (f.get("descricao") as string) || `Ajuste DRE — ${grp.label}`,
      type: grp.sign > 0 ? "entrada" : "saida",
      status: "pago",
      amount_brl: valor,
      amount_original: valor,
      currency: "BRL",
      cost_center_id: cc.id,
      source: "manual",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Lançamento DRE adicionado");
      setOpenEntry(false);
      const { data } = await supabase.from("transactions")
        .select("date, amount_brl, type, cost_centers(dre_group, name)")
        .gte("date", `${year}-01-01`).lte("date", `${year}-12-31`);
      setTx(data || []);
    }
  };

  // Build matrix [group][month] = sum
  const matrix: Record<string, number[]> = {};
  DRE_GROUPS.forEach(g => matrix[g.key] = Array(12).fill(0));

  tx.forEach(t => {
    const m = parseInt(t.date.substring(5, 7)) - 1;
    const grp = t.cost_centers?.dre_group;
    if (grp && matrix[grp]) {
      matrix[grp][m] += Number(t.amount_brl);
    }
  });

  // Computed
  for (let m = 0; m < 12; m++) {
    const recBruta = matrix.receita_bruta[m] + matrix.outras_receitas[m];
    matrix._receita_liquida[m] = recBruta - matrix.deducoes[m];
    matrix._lucro_bruto[m] = matrix._receita_liquida[m] - matrix.custos[m];
    matrix._lucro_liquido[m] = matrix._lucro_bruto[m]
      - matrix.despesas_operacionais[m] - matrix.despesas_pessoal[m]
      - matrix.despesas_admin[m] - matrix.despesas_financeiras[m] - matrix.outras_despesas[m];
  }

  const exportCsv = () => {
    const rows = [["Linha", ...MONTHS, "Total"]];
    DRE_GROUPS.forEach(g => {
      const row = [g.label, ...matrix[g.key].map(v => v.toFixed(2)),
        matrix[g.key].reduce((s, v) => s + v, 0).toFixed(2)];
      rows.push(row);
    });
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `DRE_${year}.csv`; a.click();
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, "F");
    doc.setTextColor(16, 217, 130);
    doc.setFontSize(20);
    doc.text("SolicitAí — DRE", 40, 38);
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(11);
    doc.text(`Ano ${year} • Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 40, 52);

    autoTable(doc, {
      startY: 80,
      head: [["Linha", ...MONTHS, "Total"]],
      body: DRE_GROUPS.map(g => {
        const total = matrix[g.key].reduce((s, v) => s + v, 0);
        return [g.label, ...matrix[g.key].map(v => v === 0 ? "—" : brl(v)), brl(total)];
      }),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [16, 217, 130], textColor: [15, 23, 42] },
      columnStyles: { 0: { cellWidth: 160, fontStyle: "bold" } },
      didParseCell: (data) => {
        const key = DRE_GROUPS[data.row.index]?.key;
        if (key?.startsWith("_")) {
          data.cell.styles.fillColor = [16, 217, 130, 0.1] as any;
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index > 0) data.cell.styles.halign = "right";
      },
    });
    doc.save(`DRE_${year}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="DRE" description={`Demonstração de Resultados — ${year}`}
        actions={
          <>
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Dialog open={openEntry} onOpenChange={setOpenEntry}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="h-4 w-4 mr-1" />Lançamento Manual</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Lançamento Manual no DRE</DialogTitle></DialogHeader>
                <form onSubmit={handleManualEntry} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Grupo DRE</Label>
                    <Select name="grupo" required defaultValue="receita_bruta">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DRE_GROUPS.filter(g => !g.key.startsWith("_")).map(g =>
                          <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">O Centro de Custo com esse grupo DRE deve existir em Centros de Custo.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Mês</Label>
                    <Select name="mes" required defaultValue={String(new Date().getMonth() + 1).padStart(2, "0")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS_FULL.map((m, i) => <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input name="descricao" placeholder="Ex: Receita de consultoria, Ajuste contábil..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" name="valor" required />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-brand text-primary-foreground">Criar lançamento</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> CSV</Button>
            <Button variant="outline" onClick={exportPdf}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          </>
        } />

      <Card className="bg-gradient-surface border-border/50 overflow-x-auto w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">Linha</TableHead>
              {MONTHS.map(m => <TableHead key={m} className="text-right">{m}</TableHead>)}
              <TableHead className="text-right font-bold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DRE_GROUPS.map(g => {
              const isTotal = g.key.startsWith("_");
              const total = matrix[g.key].reduce((s, v) => s + v, 0);
              return (
                <TableRow key={g.key} className={isTotal ? "bg-primary/5 font-semibold" : ""}>
                  <TableCell className={isTotal ? "font-display" : ""}>{g.label}</TableCell>
                  {matrix[g.key].map((v, i) => (
                    <TableCell key={i} className="text-right tabular-nums text-xs">
                      {v === 0 ? <span className="text-muted-foreground">—</span> : brl(v)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums font-bold">{brl(total)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, CheckCircle, Circle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import { dateBR } from "@/lib/utils";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Cliente } from "@/types";

const ONBOARDING_ETAPAS = [
  { etapa: 1, nome: "Kickoff realizado", descricao: "Reunião inicial com o cliente para alinhamento de metas e processos" },
  { etapa: 2, nome: "Acesso às contas", descricao: "Acesso ao BM, Google Ads, Analytics, Instagram/Facebook da empresa" },
  { etapa: 3, nome: "Briefing de marca", descricao: "Manual de marca, paleta de cores, fontes e tom de voz" },
  { etapa: 4, nome: "Auditoria de conta", descricao: "Análise de campanhas antigas, histórico de performance e oportunidades" },
  { etapa: 5, nome: "Estratégia validada", descricao: "Proposta de mix de mídia, orçamento e calendário editorial aprovados" },
  { etapa: 6, nome: "Primeira campanha ativa", descricao: "Go-live da primeira campanha patrocinada no Meta ou Google" },
  { etapa: 7, nome: "Relatório 30 dias", descricao: "Apresentação dos primeiros resultados e ajustes de estratégia" },
];

function useClientes() {
  return useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes" as never).select("id, nome, status").order("nome");
      return (data ?? []) as Cliente[];
    },
  });
}

function useOnboarding(clienteId: string) {
  return useQuery({
    queryKey: ["onboarding", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data } = await supabase.from("onboarding_flows" as never).select("*").eq("cliente_id", clienteId).order("etapa");
      return (data ?? []) as { id: string; etapa: number; concluida: boolean; data_conclusao?: string }[];
    },
    enabled: !!clienteId,
  });
}

export default function Automacao() {
  const { data: clientes = [], isLoading } = useClientes();
  const [selectedCliente, setSelectedCliente] = useState("");
  const qc = useQueryClient();

  const { data: onboardingData = [], isLoading: loadingOnboarding } = useOnboarding(selectedCliente);

  const handleToggleEtapa = async (etapaNum: number, atual: boolean) => {
    if (!selectedCliente) return;
    const existing = onboardingData.find((d) => d.etapa === etapaNum);
    if (existing) {
      await supabase.from("onboarding_flows" as never).update({
        concluida: !atual,
        data_conclusao: !atual ? new Date().toISOString().split("T")[0] : null,
      } as never).eq("id", existing.id);
    } else {
      const etapaInfo = ONBOARDING_ETAPAS.find((e) => e.etapa === etapaNum)!;
      await supabase.from("onboarding_flows" as never).insert({
        cliente_id: selectedCliente,
        etapa: etapaNum,
        nome: etapaInfo.nome,
        descricao: etapaInfo.descricao,
        concluida: true,
        data_conclusao: new Date().toISOString().split("T")[0],
      } as never);
    }
    qc.invalidateQueries({ queryKey: ["onboarding", selectedCliente] });
    toast.success("Etapa atualizada!");
  };

  const concluidas = onboardingData.filter((d) => d.concluida).length;
  const pct = ONBOARDING_ETAPAS.length > 0 ? Math.round((concluidas / ONBOARDING_ETAPAS.length) * 100) : 0;

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Automação & Onboarding"
        subtitle="Gestão do processo de onboarding e fluxos automatizados"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Onboarding */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding de Clientes</CardTitle>
              {selectedCliente && (
                <span className="text-sm font-medium text-brand">{pct}% concluído</span>
              )}
            </CardHeader>

            <div className="mb-5">
              <Select
                label="Selecione o cliente"
                value={selectedCliente}
                onValueChange={setSelectedCliente}
                options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                placeholder="Escolha um cliente..."
              />
            </div>

            {selectedCliente && (
              <>
                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-muted mb-1.5">
                    <span>{concluidas} de {ONBOARDING_ETAPAS.length} etapas</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 bg-cream-medium rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {loadingOnboarding ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-cream rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ONBOARDING_ETAPAS.map((etapa) => {
                      const data = onboardingData.find((d) => d.etapa === etapa.etapa);
                      const concluida = data?.concluida ?? false;
                      return (
                        <button
                          key={etapa.etapa}
                          onClick={() => handleToggleEtapa(etapa.etapa, concluida)}
                          className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${concluida ? "bg-green-50 border-green-200" : "bg-white border-cream-medium hover:bg-cream"}`}
                        >
                          {concluida
                            ? <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                            : <Circle className="w-5 h-5 text-cream-medium shrink-0 mt-0.5" />
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted">#{etapa.etapa}</span>
                              <p className={`text-sm font-medium ${concluida ? "text-success line-through" : "text-charcoal"}`}>
                                {etapa.nome}
                              </p>
                            </div>
                            <p className="text-xs text-muted mt-0.5 line-clamp-1">{etapa.descricao}</p>
                          </div>
                          {data?.data_conclusao && (
                            <span className="text-xs text-muted shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {dateBR(data.data_conclusao)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!selectedCliente && (
              <div className="text-center py-10">
                <Zap className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">Selecione um cliente para ver o progresso do onboarding</p>
              </div>
            )}
          </Card>
        </div>

        {/* Automations */}
        <div className="space-y-4">
          <Card>
            <CardTitle className="mb-4">Fluxos automáticos</CardTitle>
            <div className="space-y-3">
              {[
                { nome: "Boas-vindas WhatsApp", trigger: "Novo onboarding", status: "ativo" },
                { nome: "Relatório semanal", trigger: "Toda segunda-feira", status: "ativo" },
                { nome: "Alerta de budget", trigger: "90% do budget gasto", status: "inativo" },
                { nome: "NPS 30 dias", trigger: "30 dias após início", status: "rascunho" },
              ].map((flow) => (
                <div key={flow.nome} className="flex items-start justify-between gap-2 py-2.5 border-b border-cream last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{flow.nome}</p>
                    <p className="text-xs text-muted truncate">{flow.trigger}</p>
                  </div>
                  <Badge variant={flow.status === "ativo" ? "success" : flow.status === "inativo" ? "muted" : "warning"} className="shrink-0">
                    {flow.status}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3 text-center">Integração WhatsApp Business em desenvolvimento</p>
          </Card>

          <Card>
            <CardTitle className="mb-4">Templates de LP</CardTitle>
            <div className="space-y-2">
              {["Móveis Planejados", "Colchões Premium", "Estofados & Sofás", "Decoração e Objetos", "Iluminação"].map((t, i) => (
                <div key={t} className="flex items-center justify-between py-2 border-b border-cream last:border-0">
                  <span className="text-sm text-charcoal">{t}</span>
                  <Badge variant={i < 2 ? "success" : "muted"}>{i < 2 ? "pronto" : "em breve"}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

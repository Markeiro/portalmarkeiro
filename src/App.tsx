import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/AppShell";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Lancamentos from "./pages/Lancamentos";
import DRE from "./pages/DRE";
import Bancos from "./pages/Bancos";
import Projetos from "./pages/Projetos";
import ProjetoDetalhe from "./pages/ProjetoDetalhe";
import CentrosCusto from "./pages/CentrosCusto";
import Cambio from "./pages/Cambio";
import Projecoes from "./pages/Projecoes";
import Importar from "./pages/Importar";
import Configuracoes from "./pages/Configuracoes";
import ConfiguracoesGerais from "./pages/ConfiguracoesGerais";
import Contas from "./pages/Contas";
import Impostos from "./pages/Impostos";
import NotFound from "./pages/NotFound";
// Hub
import HubDashboard from "./pages/hub/HubDashboard";
import HubProjetos from "./pages/hub/HubProjetos";
import HubNovoProjeto from "./pages/hub/HubNovoProjeto";
import HubProjetoDetalhe from "./pages/hub/HubProjetoDetalhe";
import HubBoard from "./pages/hub/HubBoard";
// Comercial
import Comercial from "./pages/comercial/Comercial";
import ComercialDetalhe from "./pages/comercial/ComercialDetalhe";
// Marketing
import Marketing from "./pages/marketing/Marketing";
// Propostas
import Propostas from "./pages/propostas/Propostas";
import PropostaNova from "./pages/propostas/PropostaNova";
import PropostaDetalhe from "./pages/propostas/PropostaDetalhe";
// CS
import CS from "./pages/cs/CS";
// Client Portal (public)
import ClientPortal from "./pages/portal/ClientPortal";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/portal/:slug" element={<ClientPortal />} />
              <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/hub" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/lancamentos" element={<Lancamentos />} />
                <Route path="/contas" element={<Contas />} />
                <Route path="/impostos" element={<Impostos />} />
                <Route path="/dre" element={<DRE />} />
                <Route path="/bancos" element={<Bancos />} />
                <Route path="/projetos" element={<Projetos />} />
                <Route path="/projetos/:id" element={<ProjetoDetalhe />} />
                <Route path="/centros-de-custo" element={<CentrosCusto />} />
                <Route path="/cambio" element={<Cambio />} />
                <Route path="/projecoes" element={<Projecoes />} />
                <Route path="/importar" element={<Importar />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/configuracoes-gerais" element={<ConfiguracoesGerais />} />
                <Route path="/hub" element={<HubDashboard />} />
                <Route path="/hub/projetos" element={<HubProjetos />} />
                <Route path="/hub/projetos/novo" element={<HubNovoProjeto />} />
                <Route path="/hub/projetos/:id" element={<HubProjetoDetalhe />} />
                <Route path="/hub/board" element={<HubBoard />} />
                <Route path="/comercial" element={<Comercial />} />
                <Route path="/comercial/:id" element={<ComercialDetalhe />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/propostas" element={<Propostas />} />
                <Route path="/propostas/nova" element={<PropostaNova />} />
                <Route path="/propostas/:id" element={<PropostaDetalhe />} />
                <Route path="/cs" element={<CS />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

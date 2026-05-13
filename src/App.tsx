import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import Login from "@/pages/auth/Login";
import Dashboard from "@/pages/dashboard/Dashboard";
import CRM from "@/pages/crm/CRM";
import Clientes from "@/pages/clientes/Clientes";
import ClienteDetalhe from "@/pages/clientes/ClienteDetalhe";
import Campanhas from "@/pages/campanhas/Campanhas";
import Metricas from "@/pages/metricas/Metricas";
import Conteudo from "@/pages/conteudo/Conteudo";
import Automacao from "@/pages/automacao/Automacao";
import Configuracoes from "@/pages/configuracoes/Configuracoes";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-cream"><div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="crm" element={<CRM />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        <Route path="campanhas" element={<Campanhas />} />
        <Route path="metricas" element={<Metricas />} />
        <Route path="conteudo" element={<Conteudo />} />
        <Route path="automacao" element={<Automacao />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

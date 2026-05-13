import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-dark flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-copper flex items-center justify-center">
            <span className="text-white font-display font-bold text-lg">M</span>
          </div>
          <span className="font-display font-bold text-white text-xl">Markeiro</span>
        </div>

        <div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Marketing que<br />
            <span className="text-copper">converte.</span>
          </h2>
          <p className="text-brand-light text-lg leading-relaxed">
            Gerencie clientes, campanhas e resultados<br />em um único portal.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: "Clientes ativos", value: "40+" },
              { label: "Campanhas rodando", value: "120+" },
              { label: "Leads gerados", value: "12k+" },
              { label: "ROAS médio", value: "4.2x" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="font-display text-2xl font-bold text-copper">{s.value}</p>
                <p className="text-brand-light text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-brand-light/50 text-sm">
          © {new Date().getFullYear()} Markeiro · Assessoria de Marketing para o Mercado Moveleiro
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-display font-bold text-charcoal">Markeiro</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-charcoal mb-1">Entrar</h1>
          <p className="text-muted text-sm mb-8">Acesse o portal de marketing</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-charcoal-mid">Senha</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-cream-medium bg-white pl-9 pr-10 py-2 text-sm text-charcoal placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-charcoal transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Entrar
            </Button>
          </form>

          <p className="text-xs text-muted text-center mt-8">
            Problemas para acessar?{" "}
            <a href="mailto:contato@markeiro.com.br" className="text-brand hover:underline">
              Fale com o suporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

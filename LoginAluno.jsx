import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import EspectroAudio from "../components/EspectroAudio";

export default function LoginAluno() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { error } = await entrar(email, senha);
    setEnviando(false);
    if (error) {
      setErro("E-mail ou senha incorretos. Se é seu primeiro acesso, confira o e-mail que a coordenação enviou.");
      return;
    }
    navigate("/aluno");
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-explay-escuro md:grid-cols-2">
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradiente-explay p-8">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12] mix-blend-overlay">
          <filter id="graoLogin">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          </filter>
          <rect width="100%" height="100%" filter="url(#graoLogin)" />
        </svg>

        <Link to="/" className="relative font-poster text-lg text-explay-escuro">
          EXPLAY
        </Link>

        <h1 className="relative font-poster text-3xl leading-[0.95] text-explay-escuro sm:text-4xl">
          CADA EXPLICAÇÃO
          <br />
          É UM PASSO
          <br />
          A MAIS.
        </h1>

        <EspectroAudio numBarras={30} altura={50} cor="#12080A" className="relative" />
      </div>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-explay-laranja">
            Alcides Nascimento
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold text-white">
            Bem-vindo de volta
          </h2>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">
                E-mail
              </label>
              <input
                type="email"
                required
                className="w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none transition-colors placeholder:text-white/30 focus:border-explay-laranja"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">
                Senha
              </label>
              <input
                type="password"
                required
                className="w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-2.5 text-white outline-none transition-colors placeholder:text-white/30 focus:border-explay-laranja"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            {erro && (
              <p className="rounded-lg bg-explay-magenta/15 px-3 py-2 text-sm text-explay-magenta">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-lg bg-gradiente-explay py-3 font-display text-sm font-extrabold text-explay-escuro transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {enviando ? "Entrando..." : "ENTRAR"}
            </button>
          </form>

          <p className="mt-7 text-xs text-white/40">
            Sua conta é criada pela coordenação do cursinho.
            <br />
            É da administração?{" "}
            <Link to="/login/admin" className="font-bold text-explay-amarelo hover:underline">
              Entrar aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

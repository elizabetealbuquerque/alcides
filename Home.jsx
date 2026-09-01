import { useState } from "react";
import { Link } from "react-router-dom";
import EspectroAudio from "../components/EspectroAudio";

const PILARES = [
  {
    numero: "01",
    nome: "Professor por um dia",
    cor: "#FF6A00",
    descricao:
      "Grave uma explicação curta sobre o que aprendeu. A IA valida, e vira material de estudo pra outros alunos.",
  },
  {
    numero: "02",
    nome: "Diagnóstico automático",
    cor: "#FF1F5C",
    descricao:
      "Seus simulados mostram exatamente onde está o buraco de conhecimento: não só a matéria, o assunto certo.",
  },
  {
    numero: "03",
    nome: "Rede entre colegas",
    cor: "#FFC700",
    descricao:
      "Peça a explicação de quem já entendeu. Ninguém trava sozinho numa dúvida.",
  },
];

export default function Home() {
  const [pilarAberto, setPilarAberto] = useState(null);

  return (
    <div className="min-h-screen bg-explay-escuro">
      <div className="relative overflow-hidden bg-gradiente-explay">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12] mix-blend-overlay">
          <filter id="grao">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grao)" />
        </svg>

        <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="font-poster text-xl text-explay-escuro">EXPLAY</span>
          <div className="flex items-center gap-4">
            <Link to="/login/aluno" className="font-display text-sm font-extrabold text-explay-escuro">
              Sou aluno
            </Link>
            <Link
              to="/login/admin"
              className="rounded-lg bg-explay-escuro px-5 py-2.5 font-display text-sm font-extrabold text-white transition-transform hover:scale-105"
            >
              Administração
            </Link>
          </div>
        </header>

        <div className="relative mx-auto max-w-5xl px-6 pb-4 pt-8">
          <h1 className="font-poster text-5xl leading-[0.95] text-explay-escuro sm:text-6xl">
            EXPLICOU.
            <br />
            GABARITOU.
          </h1>
        </div>

        <div className="relative mx-auto max-w-5xl px-6 pt-8">
          <EspectroAudio numBarras={48} altura={70} cor="#12080A" />
        </div>

        <div className="relative mx-auto flex max-w-5xl justify-end px-6 pb-10 pt-6">
          <a
            href="#pilares"
            className="rounded-lg bg-explay-escuro px-6 py-3 font-display text-sm font-extrabold text-white transition-transform hover:scale-105"
          >
            PILARES →
          </a>
        </div>
      </div>

      <section id="pilares" className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-3">
          {PILARES.map((p) => {
            const aberto = pilarAberto === p.numero;
            return (
              <button
                key={p.numero}
                onClick={() => setPilarAberto(aberto ? null : p.numero)}
                className={`p-4 text-left transition-all ${
                  aberto ? "bg-explay-cardEscuro" : "bg-explay-cardEscuro/60 hover:bg-explay-cardEscuro"
                }`}
                style={aberto ? { boxShadow: `inset 0 0 0 2px ${p.cor}` } : undefined}
              >
                <span className="font-mono text-xs font-bold" style={{ color: p.cor }}>
                  {p.numero}
                </span>
                <p className="mt-2 font-display text-sm font-extrabold text-white">{p.nome}</p>
                {aberto && (
                  <p className="mt-2.5 text-xs leading-relaxed text-white/70">{p.descricao}</p>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

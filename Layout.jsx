import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { dataDeHojeISO } from "../lib/sentimentos";
import CheckinEmocional from "./CheckinEmocional";

const NAV_ALUNO = [
  { to: "/aluno", label: "Início", fim: true },
  { to: "/aluno/gravar", label: "Professor por um dia" },
  { to: "/aluno/biblioteca", label: "Biblioteca de áudios" },
  { to: "/aluno/diagnostico", label: "Meu diagnóstico" },
  { to: "/aluno/mapa", label: "Mapa do Conhecimento" },
  { to: "/aluno/pedidos", label: "Meus pedidos" },
  { to: "/aluno/estrategias", label: "Estratégias de prova" },
  { to: "/aluno/bolsas", label: "Radar Universitário" },
];

const NAV_ADMIN = [
  { to: "/admin", label: "Início", fim: true },
  { to: "/admin/alunos", label: "Alunos" },
  { to: "/admin/burnout", label: "Termômetro" },
  { to: "/admin/mapa", label: "Mapa do Conhecimento" },
];

export default function Layout({ children }) {
  const { perfil, sair } = useAuth();
  const navigate = useNavigate();
  const itens = perfil?.tipo === "coordenador" ? NAV_ADMIN : NAV_ALUNO;
  const [mostrarCheckin, setMostrarCheckin] = useState(false);

  useEffect(() => {
    async function verificarCheckinDeHoje() {
      if (perfil?.tipo !== "aluno") return;
      const { data } = await supabase
        .from("checkins_emocionais")
        .select("*")
        .eq("usuario_id", perfil.id)
        .eq("data", dataDeHojeISO());
      if (!data || data.length === 0) setMostrarCheckin(true);
    }
    verificarCheckinDeHoje();
  }, [perfil?.id]);

  async function handleSair() {
    await sair();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen">
      {mostrarCheckin && (
        <CheckinEmocional perfilId={perfil.id} aoFinalizar={() => setMostrarCheckin(false)} />
      )}

      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-explay-escuro p-6 md:flex">
        <div>
          <div className="mb-10 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradiente-explay font-display font-extrabold text-explay-escuro">
              E
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {itens.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.fim}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-explay-laranja/20 text-explay-amarelo"
                      : "text-creme-50/70 hover:bg-white/10 hover:text-creme-50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-creme-50/10 pt-4">
          <p className="mb-2 truncate text-sm font-medium text-creme-50/90">
            {perfil?.nome ?? "..."}
          </p>
          <p className="mb-4 text-xs text-creme-50/40">
            {perfil?.tipo === "coordenador" ? "Administração" : "Aluno"}
          </p>
          <button
            onClick={handleSair}
            className="w-full rounded-xl border border-creme-50/20 px-5 py-2.5 text-sm font-display font-semibold text-creme-50 transition-colors hover:border-explay-laranja hover:text-explay-amarelo"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase, modoDemo } from "../../lib/supabaseClient";
import { buscarInfoAssunto } from "../../lib/mapaConhecimento";
import { dataDeHojeISO } from "../../lib/sentimentos";
import { tocarSomConcluido } from "../../lib/somConcluido";

function StatCard({ numero, rotulo, cor, max }) {
  const largura = Math.max(6, Math.min(100, (numero / max) * 100));
  return (
    <div className="card">
      <p className="font-display text-2xl font-bold text-laranja-900">{numero}</p>
      <p className="mb-2 text-xs text-laranja-900/50">{rotulo}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-creme-200">
        <div className="h-full rounded-full" style={{ width: `${largura}%`, backgroundColor: cor }} />
      </div>
    </div>
  );
}

export default function DashboardAluno() {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const primeiroNome = perfil?.nome?.split(" ")[0] ?? "";

  const [stats, setStats] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [concluidos, setConcluidos] = useState([]);
  const [revisoesPendentes, setRevisoesPendentes] = useState([]);

  useEffect(() => {
    if (perfil?.id) {
      carregarStats();
      montarPlaylist();
      carregarRevisoesPendentes();
    }
  }, [perfil?.id]);

  const [dataSelecionada, setDataSelecionada] = useState(dataDeHojeISO());

  async function carregarRevisoesPendentes(data = dataSelecionada) {
    const ehHoje = data === dataDeHojeISO();

    // Hoje: mostra tudo que venceu (inclusive atrasado de dias anteriores).
    // Dia específico no passado: mostra exatamente o que estava agendado
    // pra aquele dia, mesmo que já tenha sido revisado ou ainda esteja
    // pendente — é uma visão histórica, não só "o que falta fazer".
    let query = supabase.from("revisoes_agendadas").select("*").eq("usuario_id", perfil.id);
    query = ehHoje ? query.lte("data_agendada", data).eq("status", "pendente") : query.eq("data_agendada", data);
    const { data: linhas } = await query;

    const comQualidade = [];
    for (const r of linhas ?? []) {
      const { data: audioOriginal } = await supabase
        .from("audios")
        .select("pontuacao_qualidade")
        .eq("id", r.audio_original_id)
        .single();
      comQualidade.push({ ...r, qualidadeAnterior: audioOriginal?.pontuacao_qualidade ?? 0 });
    }
    setRevisoesPendentes(comQualidade);
  }

  function mudarDia(deltaDias) {
    const nova = new Date(dataSelecionada + "T00:00:00");
    nova.setDate(nova.getDate() + deltaDias);
    const novaISO = nova.toISOString().slice(0, 10);
    if (novaISO > dataDeHojeISO()) return; 
    setDataSelecionada(novaISO);
    carregarRevisoesPendentes(novaISO);
  }

  function revisarAgora(revisao) {
    navigate("/aluno/gravar", {
      state: {
        revisaoPendente: {
          id: revisao.id,
          materia: revisao.materia,
          assunto: revisao.assunto,
          intervaloDias: revisao.intervalo_dias,
          qualidadeAnterior: revisao.qualidadeAnterior,
        },
      },
    });
  }

  
  
  
  async function testarRevisaoAgora() {
    const { data } = await supabase
      .from("revisoes_agendadas")
      .select("*")
      .eq("usuario_id", perfil.id)
      .eq("status", "pendente");

    for (const r of data ?? []) {
      await supabase.from("revisoes_agendadas").update({ data_agendada: dataDeHojeISO() }).eq("id", r.id);
    }
    setDataSelecionada(dataDeHojeISO());
    carregarRevisoesPendentes(dataDeHojeISO());
  }

  async function carregarStats() {
    const { data: audios } = await supabase.from("audios").select("*").eq("usuario_id", perfil.id);
    const { data: diagnosticos } = await supabase.from("diagnosticos").select("*").eq("usuario_id", perfil.id);
    const { data: solicitacoesRecebidas } = await supabase
      .from("solicitacoes_audio")
      .select("*")
      .eq("audio_dono_id", perfil.id)
      .eq("status", "compartilhado");
    const { data: checkins } = await supabase
      .from("checkins_emocionais")
      .select("data")
      .eq("usuario_id", perfil.id);

    const audiosPublicados = (audios ?? []).filter((a) => a.compartilhado).length;
    const explicacoesValidadas = (audios ?? []).filter((a) => a.status_validacao === "aprovado").length;
    const colegasAjudados = new Set((solicitacoesRecebidas ?? []).map((s) => s.solicitante_id)).size;
    const assuntosDominados = (diagnosticos ?? []).filter((d) => d.nivel_dominio >= 0.6).length;

    const diasUnicos = [...new Set((checkins ?? []).map((c) => c.data))].sort().reverse();
    let streak = 0;
    let cursor = new Date();
    for (const dia of diasUnicos) {
      const esperado = cursor.toISOString().slice(0, 10);
      if (dia === esperado) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    setStats({
      audiosPublicados,
      explicacoesValidadas,
      colegasAjudados,
      diasConsecutivos: streak,
      assuntosDominados,
    });
  }

  async function montarPlaylist() {
    const { data: diagnosticos } = await supabase
      .from("diagnosticos")
      .select("topico_id, nivel_dominio, topicos(nome, materia)")
      .eq("usuario_id", perfil.id)
      .lt("nivel_dominio", 0.6)
      .order("nivel_dominio", { ascending: true })
      .limit(1);

    const critico = diagnosticos?.[0];
    const nomeAssunto = critico?.topicos?.nome;
    const relacionado = nomeAssunto ? buscarInfoAssunto(nomeAssunto).relacionados[0] : null;

    let questao = null;
    if (critico) {
      const { data } = await supabase
        .from("questoes_simulado")
        .select("*")
        .eq("topico_id", critico.topico_id)
        .limit(1);
      questao = data?.[0];
    }

    const itens = [
      {
        texto: nomeAssunto
          ? `Ouvir uma explicação sobre ${nomeAssunto}`
          : "Ouvir uma explicação de um colega",
        link: "/aluno/diagnostico",
      },
      questao && { texto: "Resolver a questão de treino sugerida", link: "/aluno/diagnostico" },
      { texto: "Gravar uma explicação em Professor por um dia", link: "/aluno/gravar" },
      relacionado && { texto: `Revisar ${relacionado}`, link: "/aluno/gravar" },
      { texto: "Responder um desafio diário em Estratégias de prova", link: "/aluno/estrategias" },
    ].filter(Boolean);

    setPlaylist(itens);

    const { data: feitos } = await supabase
      .from("playlist_concluida")
      .select("item_indice")
      .eq("usuario_id", perfil.id)
      .eq("data", dataDeHojeISO());
    setConcluidos((feitos ?? []).map((f) => f.item_indice));
  }

  async function marcarConcluido(indice) {
    if (concluidos.includes(indice)) return;
    await supabase.from("playlist_concluida").insert({
      usuario_id: perfil.id,
      data: dataDeHojeISO(),
      item_indice: indice,
    });
    tocarSomConcluido();
    setConcluidos((prev) => [...prev, indice]);
  }

  return (
    <div>
      <p className="label-eyebrow mb-2">Painel do aluno</p>
      <h1 className="mb-6 text-3xl font-bold">
        Fala, {primeiroNome || "tudo bem"}?
      </h1>

      {playlist && playlist.length > 0 && (
        <div className="card mb-6">
          <p className="label-eyebrow mb-3">Sua playlist de hoje</p>
          <div className="space-y-2">
            {playlist.map((item, i) => {
              if (concluidos.includes(i)) return null;
              return (
                <div key={i} className="flex items-center gap-3">
                  <button
                    onClick={() => marcarConcluido(i)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-laranja-900/20 text-transparent hover:border-emerald-500"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => navigate(item.link)}
                    className="text-sm text-laranja-900 hover:underline"
                  >
                    {item.texto}
                  </button>
                </div>
              );
            })}
            {playlist.every((_, i) => concluidos.includes(i)) && (
              <p className="text-sm text-laranja-900/50">
                Você concluiu tudo por hoje. Manda ver amanhã de novo! 🎉
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card mb-6 border-2 border-brasa-600/30">
        <div className="mb-3 flex items-center justify-between">
          <p className="label-eyebrow">Hora de revisar</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => mudarDia(-1)}
              className="rounded px-2 py-1 text-xs text-laranja-900/50 hover:bg-creme-100"
            >
              ← dia anterior
            </button>
            <span className="text-xs font-semibold text-laranja-900">
              {dataSelecionada === dataDeHojeISO()
                ? "Hoje"
                : new Date(dataSelecionada + "T00:00:00").toLocaleDateString("pt-BR")}
            </span>
            <button
              onClick={() => mudarDia(1)}
              disabled={dataSelecionada === dataDeHojeISO()}
              className="rounded px-2 py-1 text-xs text-laranja-900/50 hover:bg-creme-100 disabled:opacity-30"
            >
              dia seguinte →
            </button>
          </div>
        </div>

        {revisoesPendentes.length === 0 && (
          <p className="text-sm text-laranja-900/40">
            {dataSelecionada === dataDeHojeISO()
              ? "Nada pra revisar hoje."
              : "Nenhuma revisão estava agendada pra esse dia."}
          </p>
        )}

        <div className="space-y-2">
          {revisoesPendentes.map((r) => (
            <div key={r.id} className="flex items-center justify-between">
              <p className="text-sm text-laranja-900">
                Explique de novo: <strong>{r.assunto}</strong>
                {r.status === "concluida" && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    concluída
                  </span>
                )}
              </p>
              {r.status !== "concluida" && (
                <button onClick={() => revisarAgora(r)} className="btn-secondary text-xs">
                  Revisar agora
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {modoDemo && revisoesPendentes.length === 0 && dataSelecionada === dataDeHojeISO() && (
        <button
          onClick={testarRevisaoAgora}
          className="mb-6 rounded-lg border border-dashed border-laranja-900/20 px-3 py-2 text-xs text-laranja-900/40 hover:border-laranja-900/40 hover:text-laranja-900/60"
        >
          🧪 [Modo demo] Testar "Hora de revisar" agora
        </button>
      )}

      {stats && (
        <div className="mb-8">
          <p className="label-eyebrow mb-3">Seu perfil de evolução</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard numero={stats.audiosPublicados} rotulo="Áudios publicados" cor="#FF9600" max={50} />
            <StatCard numero={stats.explicacoesValidadas} rotulo="Explicações validadas" cor="#58CC02" max={50} />
            <StatCard numero={stats.colegasAjudados} rotulo="Colegas ajudados" cor="#CE82FF" max={30} />
            <StatCard numero={stats.diasConsecutivos} rotulo="Dias consecutivos" cor="#FF4B4B" max={30} />
            <StatCard numero={stats.assuntosDominados} rotulo="Assuntos dominados" cor="#FFC800" max={20} />
          </div>
        </div>
      )}

    </div>
  );
}

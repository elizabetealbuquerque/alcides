import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { buscarInfoAssunto } from "../../lib/mapaConhecimento";

function ListaColegas({ topicoId, materia, assunto, aoFechar }) {
  const { perfil } = useAuth();
  const navigate = useNavigate();
  const [colegas, setColegas] = useState(null);
  const [enviando, setEnviando] = useState(null);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("audios")
        .select("*, usuarios(nome)")
        .eq("topico_id", topicoId)
        .eq("status_validacao", "aprovado")
        .neq("usuario_id", perfil.id);
      setColegas(data ?? []);
    }
    carregar();
  }, [topicoId, perfil.id]);

  async function pedirExplicacao(audio) {
    setEnviando(audio.id);

    
    const { data: existentes } = await supabase
      .from("solicitacoes_audio")
      .select("*")
      .eq("solicitante_id", perfil.id)
      .eq("audio_id", audio.id);

    let solicitacao = existentes?.[0];

    if (!solicitacao) {
      const { data: solicitacoes } = await supabase
        .from("solicitacoes_audio")
        .insert({
          solicitante_id: perfil.id,
          solicitante_nome: perfil.nome,
          audio_id: audio.id,
          audio_dono_id: audio.usuario_id,
          audio_dono_nome: audio.usuarios?.nome ?? "Colega",
          audio_materia: materia,
          audio_assunto: assunto,
          status: "pendente",
        })
        .select();
      solicitacao = solicitacoes?.[0];
    }

    const mensagemSugerida = `Oi! Vi que você já entende bem sobre ${assunto}. Será que pode me passar seu áudio explicando isso?`;

    navigate("/aluno/pedidos", {
      state: { abrirSolicitacaoId: solicitacao.id, mensagemSugerida },
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-laranja-900/10 bg-creme-100 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="label-eyebrow">Quem já ensinou isso</p>
        <button onClick={aoFechar} className="text-xs text-laranja-900/40 hover:underline">
          Fechar
        </button>
      </div>

      {colegas === null && <p className="text-sm text-laranja-900/40">Carregando...</p>}

      {colegas?.length === 0 && (
        <p className="text-sm text-laranja-900/50">
          Ainda ninguém gravou uma explicação aprovada sobre esse assunto.
        </p>
      )}

      <div className="space-y-2">
        {colegas?.map((audio) => (
          <div key={audio.id} className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
            <p className="text-sm font-medium text-laranja-900">{audio.usuarios?.nome}</p>
            <button
              onClick={() => pedirExplicacao(audio)}
              disabled={enviando === audio.id}
              className="btn-secondary text-xs"
            >
              {enviando === audio.id ? "Enviando..." : "Pedir explicação"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Diagnostico() {
  const { perfil } = useAuth();
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(null);

  useEffect(() => {
    async function carregar() {
      if (!perfil?.id) return;
      const { data } = await supabase
        .from("diagnosticos")
        .select("topico_id, nivel_dominio, topicos(nome, materia)")
        .eq("usuario_id", perfil.id)
        .order("nivel_dominio", { ascending: true });
      setDiagnosticos(data ?? []);
      setCarregando(false);
    }
    carregar();
  }, [perfil?.id]);

  const porMateria = diagnosticos.reduce((acc, d) => {
    const materia = d.topicos?.materia ?? "Outros";
    acc[materia] = acc[materia] ?? [];
    acc[materia].push(d);
    return acc;
  }, {});

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Meu diagnóstico</h1>

      {carregando && <p className="text-laranja-900/40">Carregando...</p>}

      {!carregando && diagnosticos.length === 0 && (
        <div className="card text-center">
          <p className="text-laranja-900/60">
            Ainda não temos simulados suficientes para gerar seu diagnóstico.
            Assim que você responder um simulado, ele aparece aqui
            automaticamente.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(porMateria).map(([materia, itens]) => (
          <div key={materia}>
            <h2 className="mb-3 font-display text-lg font-bold text-laranja-900">{materia}</h2>
            <div className="space-y-3">
              {itens.map((d) => {
                const percentual = Math.round(d.nivel_dominio * 100);
                const critico = d.nivel_dominio < 0.6;
                const chave = d.topico_id;
                return (
                  <div key={chave} className="card">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-display font-semibold text-laranja-900">
                          {d.topicos?.nome}
                        </p>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-creme-200">
                          <div
                            className={`h-full rounded-full ${critico ? "bg-brasa-600" : "bg-emerald-400"}`}
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-bold text-laranja-900">{percentual}%</p>
                        <button
                          onClick={() => setAberto(aberto === chave ? null : chave)}
                          className="text-xs text-ouro-600 hover:underline"
                        >
                          {aberto === chave ? "Fechar" : "Ver quem já ensinou isso →"}
                        </button>
                      </div>
                    </div>

                    {critico && buscarInfoAssunto(d.topicos?.nome).preRequisitos.length > 0 && (
                      <div className="mt-3 rounded-lg bg-ouro-400/10 px-4 py-3">
                        <p className="mb-2 text-xs font-semibold text-ouro-700">
                          Você provavelmente também precisa revisar
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {buscarInfoAssunto(d.topicos?.nome).preRequisitos.map((nome) => (
                            <span
                              key={nome}
                              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-laranja-800"
                            >
                              ✓ {nome}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aberto === chave && (
                      <ListaColegas
                        topicoId={d.topico_id}
                        materia={materia}
                        assunto={d.topicos?.nome}
                        aoFechar={() => setAberto(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

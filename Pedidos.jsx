import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";

export default function Pedidos() {
  const { perfil } = useAuth();
  const location = useLocation();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [ativaId, setAtivaId] = useState(location.state?.abrirSolicitacaoId ?? null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState(location.state?.mensagemSugerida ?? "");
  const scrollRef = useRef(null);

  async function carregarSolicitacoes() {
    const { data: enviados } = await supabase
      .from("solicitacoes_audio")
      .select("*")
      .eq("solicitante_id", perfil.id);
    const { data: recebidos } = await supabase
      .from("solicitacoes_audio")
      .select("*")
      .eq("audio_dono_id", perfil.id);

    const todas = [...(enviados ?? []), ...(recebidos ?? [])].sort(
      (a, b) => new Date(b.criado_em) - new Date(a.criado_em)
    );
    setSolicitacoes(todas);
    if (!ativaId && todas[0]) setAtivaId(todas[0].id);
  }

  useEffect(() => {
    if (perfil?.id) carregarSolicitacoes();
  }, [perfil?.id]);

  async function carregarMensagens() {
    if (!ativaId) return;
    const { data } = await supabase
      .from("mensagens_chat")
      .select("*")
      .eq("solicitacao_id", ativaId)
      .order("enviado_em", { ascending: true });
    setMensagens(data ?? []);
  }

  useEffect(() => {
    carregarMensagens();
  }, [ativaId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensagens]);

  const solicitacaoAtiva = solicitacoes.find((s) => s.id === ativaId);
  const souODono = solicitacaoAtiva?.audio_dono_id === perfil.id;
  const jaCompartilhado = solicitacaoAtiva?.status === "compartilhado";

  async function enviarMensagem() {
    if (!novaMensagem.trim()) return;
    await supabase.from("mensagens_chat").insert({
      solicitacao_id: ativaId,
      remetente_id: perfil.id,
      remetente_nome: perfil.nome,
      texto: novaMensagem.trim(),
    });
    setNovaMensagem("");
    carregarMensagens();
  }

  async function enviarMeuAudio() {
    await supabase.from("mensagens_chat").insert({
      solicitacao_id: ativaId,
      remetente_id: perfil.id,
      remetente_nome: perfil.nome,
      texto: "Compartilhei meu áudio com você. Pode ouvir aqui embaixo 👇",
      audio_id: solicitacaoAtiva.audio_id,
    });
    await supabase.from("solicitacoes_audio").update({ status: "compartilhado" }).eq("id", ativaId);
    
    await supabase.from("audios").update({ compartilhado: true }).eq("id", solicitacaoAtiva.audio_id);

    carregarMensagens();
    carregarSolicitacoes();
  }

  async function excluirMensagem(mensagemId) {
    if (!confirm("Excluir essa mensagem? Não dá pra desfazer.")) return;
    await supabase.from("mensagens_chat").delete().eq("id", mensagemId);
    carregarMensagens();
  }

  async function excluirPedido(solicitacaoId) {
    if (!confirm("Excluir essa conversa inteira? Não dá pra desfazer.")) return;

    const { data: mensagensDoPedido } = await supabase
      .from("mensagens_chat")
      .select("id")
      .eq("solicitacao_id", solicitacaoId);
    for (const m of mensagensDoPedido ?? []) {
      await supabase.from("mensagens_chat").delete().eq("id", m.id);
    }

    await supabase.from("solicitacoes_audio").delete().eq("id", solicitacaoId);

    if (ativaId === solicitacaoId) {
      setAtivaId(null);
      setMensagens([]);
    }
    carregarSolicitacoes();
  }

  return (
    <div>
      <p className="label-eyebrow mb-2">Pedidos de explicação</p>
      <h1 className="mb-8 text-3xl font-bold">Meus pedidos</h1>

      {solicitacoes.length === 0 ? (
        <div className="card text-center">
          <p className="text-laranja-900/60">
            Nenhum pedido ainda. Peça uma explicação a um colega direto pela
            tela de diagnóstico.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            {solicitacoes.map((s) => {
              const souSolicitante = s.solicitante_id === perfil.id;
              return (
                <div
                  key={s.id}
                  className={`group relative w-full rounded-lg text-sm transition-colors ${
                    ativaId === s.id ? "bg-laranja-600/10 text-laranja-800" : "text-laranja-900/70 hover:bg-creme-100"
                  }`}
                >
                  <button onClick={() => setAtivaId(s.id)} className="w-full px-3 py-2.5 text-left">
                    <p className="pr-5 font-medium">
                      {souSolicitante ? s.audio_dono_nome : s.solicitante_nome}
                    </p>
                    <p className="text-xs text-laranja-900/40">
                      {s.audio_materia} · {s.audio_assunto}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        s.status === "compartilhado" ? "bg-emerald-100 text-emerald-700" : "bg-ouro-400/15 text-ouro-700"
                      }`}
                    >
                      {s.status === "compartilhado" ? "Áudio compartilhado" : "Aguardando"}
                    </span>
                  </button>
                  <button
                    onClick={() => excluirPedido(s.id)}
                    title="Excluir conversa"
                    className="absolute right-2 top-2 rounded p-1 text-xs text-laranja-900/30 opacity-0 transition-opacity hover:text-brasa-600 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {solicitacaoAtiva && (
            <div className="card flex h-[28rem] flex-col">
              <div className="mb-3 border-b border-laranja-900/10 pb-3">
                <p className="text-sm font-medium text-laranja-900">
                  {souODono ? solicitacaoAtiva.solicitante_nome : solicitacaoAtiva.audio_dono_nome}
                </p>
                <p className="text-xs text-laranja-900/40">
                  {solicitacaoAtiva.audio_materia} · {solicitacaoAtiva.audio_assunto}
                </p>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
                {mensagens.map((m) => (
                  <div
                    key={m.id}
                    className={`group relative max-w-[85%] rounded-lg px-3 py-2 ${
                      m.remetente_id === perfil.id ? "ml-auto bg-laranja-600/10" : "bg-creme-100"
                    }`}
                  >
                    <p className="mb-0.5 text-xs font-semibold text-ouro-700">{m.remetente_nome}</p>
                    <p className="pr-4 text-sm text-laranja-900/80">{m.texto}</p>
                    {m.audio_id && (
                      <div className="mt-2 rounded-md bg-white px-3 py-2 text-xs text-laranja-900/60">
                        🎧 Áudio compartilhado. Abra "Professor por um dia" pra ouvir na íntegra.
                      </div>
                    )}
                    {m.remetente_id === perfil.id && (
                      <button
                        onClick={() => excluirMensagem(m.id)}
                        title="Excluir mensagem"
                        className="absolute right-1.5 top-1.5 rounded p-0.5 text-[11px] text-laranja-900/30 opacity-0 transition-opacity hover:text-brasa-600 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {souODono && !jaCompartilhado && (
                <button onClick={enviarMeuAudio} className="btn-primary mt-3 w-full text-sm">
                  Enviar meu áudio
                </button>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensagem()}
                  placeholder="Escreva uma mensagem..."
                  className="input-field"
                />
                <button onClick={enviarMensagem} className="btn-primary shrink-0">
                  Enviar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

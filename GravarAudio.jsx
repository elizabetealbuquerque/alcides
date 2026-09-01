import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { criarTranscritorAoVivo, transcricaoDisponivel } from "../../lib/transcricao";
import { validarConceitos } from "../../lib/validacaoIA";
import { CONTEUDO_FIXO } from "../../lib/conteudoFixo";
import { salvarAudio, excluirArquivoAudio } from "../../lib/audioStorage";
import { buscarInfoAssunto } from "../../lib/mapaConhecimento";
import { proximoIntervalo, calcularDataAgendada } from "../../lib/revisaoEspacada";
import MiniGravador from "../../components/MiniGravador";

const DURACAO_MAX_SEGUNDOS = 120;

const MATERIAS_ENEM = [
  "Linguagens",
  "Ciências Humanas",
  "Ciências da Natureza",
  "Matemática",
  "Redação",
];

function PainelRevisao({ perfil }) {
  const [materiaSelecionada, setMateriaSelecionada] = useState(null);
  const [carregandoAssuntos, setCarregandoAssuntos] = useState(false);
  const [assuntosDaMateria, setAssuntosDaMateria] = useState([]);
  const [assuntoSelecionado, setAssuntoSelecionado] = useState(null);

  const [estagio, setEstagio] = useState(null); 
  const [audioFoco, setAudioFoco] = useState(null);
  const [outrosAudios, setOutrosAudios] = useState([]);
  const [questao, setQuestao] = useState(null);
  const [respostaEnviada, setRespostaEnviada] = useState(null);

  async function selecionarMateria(materia) {
    setMateriaSelecionada(materia);
    setAssuntoSelecionado(null);
    setEstagio(null);
    setCarregandoAssuntos(true);

    const { data } = await supabase
      .from("diagnosticos")
      .select("topico_id, nivel_dominio, topicos(nome, materia)")
      .eq("usuario_id", perfil.id)
      .lt("nivel_dominio", 0.6)
      .order("nivel_dominio", { ascending: true });

    const filtrados = (data ?? []).filter((d) => d.topicos?.materia === materia);
    setAssuntosDaMateria(filtrados);
    setCarregandoAssuntos(false);
  }

  async function selecionarAssunto(assunto) {
    setAssuntoSelecionado(assunto);
    setRespostaEnviada(null);
    setQuestao(null);

    const { data: audiosProprio } = await supabase
      .from("audios")
      .select("*")
      .eq("usuario_id", perfil.id)
      .eq("topico_id", assunto.topico_id)
      .eq("status_validacao", "aprovado")
      .order("criado_em", { ascending: false })
      .limit(1);

    if (audiosProprio?.[0]) {
      setAudioFoco(audiosProprio[0]);
      setEstagio("proprio");
    } else {
      await buscarOutros(assunto.topico_id);
    }
  }

  async function buscarOutros(topicoId) {
    const { data } = await supabase
      .from("audios")
      .select("*, usuarios(nome)")
      .eq("topico_id", topicoId)
      .eq("compartilhado", true)
      .eq("status_validacao", "aprovado")
      .neq("usuario_id", perfil.id)
      .order("criado_em", { ascending: false })
      .limit(3);
    setOutrosAudios(data ?? []);
    setEstagio("outros");
  }

  async function handleAjudou(ajudou) {
    if (ajudou) {
      setEstagio("perguntar_treinar");
    } else {
      await buscarOutros(assuntoSelecionado.topico_id);
    }
  }

  async function handlePedirAudio(audio) {
    const topico = assuntosDaMateria.find((a) => a.topico_id === assuntoSelecionado.topico_id);

    const { data: existentes } = await supabase
      .from("solicitacoes_audio")
      .select("*")
      .eq("solicitante_id", perfil.id)
      .eq("audio_id", audio.id);

    if (!existentes?.[0]) {
      await supabase.from("solicitacoes_audio").insert({
        solicitante_id: perfil.id,
        solicitante_nome: perfil.nome,
        audio_id: audio.id,
        audio_dono_id: audio.usuario_id,
        audio_dono_nome: audio.usuarios?.nome ?? "Colega",
        audio_materia: materiaSelecionada,
        audio_assunto: topico?.topicos?.nome ?? "",
        status: "compartilhado",
      });
    }

    setAudioFoco(audio);
    setEstagio("perguntar_treinar");
  }

  async function handleTreinar(quer) {
    if (!quer) {
      setEstagio(null);
      setAssuntoSelecionado(null);
      return;
    }
    const { data } = await supabase
      .from("questoes_simulado")
      .select("*")
      .eq("topico_id", assuntoSelecionado.topico_id)
      .limit(1);
    setQuestao(data?.[0] ?? null);
    setEstagio("questao");
  }

  async function handleResponder(acertou) {
    if (questao) {
      await supabase.from("respostas_aluno").insert({
        usuario_id: perfil.id,
        questao_id: questao.id,
        acertou,
      });
    }
    setRespostaEnviada(acertou);
  }

  return (
    <div className="card mb-6 border-2 border-ouro-400/50">
      <p className="label-eyebrow mb-3">Reforço recomendado</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
        <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
          {MATERIAS_ENEM.map((materia) => (
            <button
              key={materia}
              onClick={() => selecionarMateria(materia)}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                materiaSelecionada === materia
                  ? "bg-laranja-600/10 text-laranja-800"
                  : "text-laranja-900/60 hover:bg-creme-100"
              }`}
            >
              {materia}
            </button>
          ))}
        </div>

        {materiaSelecionada && (
          <div className="border-t border-laranja-900/10 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            {!assuntoSelecionado && (
              <>
                {carregandoAssuntos && (
                  <p className="text-sm text-laranja-900/40">Carregando...</p>
                )}
                {!carregandoAssuntos && assuntosDaMateria.length === 0 && (
                  <p className="text-sm text-laranja-900/50">
                    Ainda sem dados de simulado em {materiaSelecionada}. Assim
                    que você errar questões dessa matéria, os assuntos pra
                    reforçar aparecem aqui automaticamente.
                  </p>
                )}
                <div className="space-y-2">
                  {assuntosDaMateria.map((a) => (
                    <button
                      key={a.topico_id}
                      onClick={() => selecionarAssunto(a)}
                      className="flex w-full items-center justify-between rounded-lg bg-creme-100 px-3 py-2.5 text-left transition-colors hover:bg-laranja-600/10"
                    >
                      <span className="text-sm font-medium text-laranja-900">{a.topicos?.nome}</span>
                      <span className="text-xs font-semibold text-brasa-600">
                        {Math.round(a.nivel_dominio * 100)}%
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {assuntoSelecionado && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-laranja-900">
                    {assuntoSelecionado.topicos?.nome}
                  </p>
                  <button
                    onClick={() => {
                      setAssuntoSelecionado(null);
                      setEstagio(null);
                    }}
                    className="text-xs text-laranja-900/40 hover:underline"
                  >
                    ← assuntos
                  </button>
                </div>

                {estagio === "proprio" && audioFoco && (
                  <div>
                    <p className="mb-3 text-sm text-laranja-900/80">
                      Você já gravou uma explicação sobre esse assunto. Que
                      tal reouvir antes de tentar de novo?
                    </p>
                    <div className="mb-4 rounded-lg bg-creme-100 px-4 py-3 text-sm text-laranja-900/70">
                      "{audioFoco.transcricao}"
                    </div>
                    <p className="mb-2 text-sm font-medium text-laranja-900">Isso ajudou?</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleAjudou(true)} className="btn-primary text-sm">
                        Sim, ajudou
                      </button>
                      <button onClick={() => handleAjudou(false)} className="btn-secondary text-sm">
                        Não muito
                      </button>
                    </div>
                  </div>
                )}

                {estagio === "outros" && (
                  <div>
                    <p className="mb-3 text-sm text-laranja-900/80">
                      {outrosAudios.length > 0
                        ? "Colegas que já gravaram sobre esse assunto:"
                        : "Ainda não há colegas com áudio compartilhado sobre esse assunto."}
                    </p>
                    <div className="space-y-3">
                      {outrosAudios.map((a) => (
                        <div key={a.id} className="rounded-lg bg-creme-100 px-4 py-3">
                          <p className="mb-1 text-sm font-medium text-laranja-900">{a.usuarios?.nome}</p>
                          <p className="mb-2 text-sm text-laranja-900/70">"{a.transcricao}"</p>
                          <button onClick={() => handlePedirAudio(a)} className="btn-secondary text-xs">
                            Já ouvi, quero treinar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {estagio === "perguntar_treinar" && (
                  <div>
                    <p className="mb-3 text-sm font-medium text-laranja-900">Vamos treinar?</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleTreinar(true)} className="btn-primary text-sm">
                        Sim
                      </button>
                      <button onClick={() => handleTreinar(false)} className="btn-secondary text-sm">
                        Agora não
                      </button>
                    </div>
                  </div>
                )}

                {estagio === "questao" && questao && respostaEnviada === null && (
                  <div>
                    <p className="mb-4 text-sm text-laranja-900/80">{questao.enunciado}</p>
                    <p className="mb-2 text-xs text-laranja-900/50">
                      Resolva no papel e depois marque como você se saiu:
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => handleResponder(true)} className="btn-primary text-sm">
                        Acertei
                      </button>
                      <button onClick={() => handleResponder(false)} className="btn-secondary text-sm">
                        Errei
                      </button>
                    </div>
                  </div>
                )}

                {estagio === "questao" && questao && respostaEnviada !== null && (
                  <p className="text-sm text-laranja-900/70">
                    {respostaEnviada
                      ? "Mandou bem! Continue assim."
                      : "Beleza, isso vira sinal pra reforçar esse assunto. Bora gravar ou pedir mais um áudio quando quiser."}
                  </p>
                )}

                {estagio === "questao" && !questao && (
                  <p className="text-sm text-laranja-900/60">
                    Ainda não há questão cadastrada pra esse assunto.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function GravarAudio() {
  const { perfil } = useAuth();
  const location = useLocation();
  const [materiaEscolhida, setMateriaEscolhida] = useState(null);
  const [assuntoEscolhido, setAssuntoEscolhido] = useState(null);
  const [tentativas, setTentativas] = useState(0);
  const [perguntaReflexiva, setPerguntaReflexiva] = useState(null);
  const [respostaReflexivaEnviada, setRespostaReflexivaEnviada] = useState(false);

  const [meusAudios, setMeusAudios] = useState([]);
  const [audiosColegas, setAudiosColegas] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [modoGravacao, setModoGravacao] = useState(false); 

  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [transcricaoAoVivo, setTranscricaoAoVivo] = useState("");
  const [audioBlobUrl, setAudioBlobUrl] = useState(null);
  const [audioBlobBruto, setAudioBlobBruto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const transcritorRef = useRef(null);
  const timerRef = useRef(null);

  // Se veio de "Revisar agora" (dashboard), já pré-seleciona a matéria/assunto.
  useEffect(() => {
    const alvo = location.state?.revisaoPendente;
    if (!alvo) return;
    const materia = CONTEUDO_FIXO.find((m) => m.materia === alvo.materia);
    const assunto = materia?.assuntos.find((a) => a.nome === alvo.assunto);
    if (materia && assunto) {
      setMateriaEscolhida(materia);
      escolherAssunto(assunto, materia);
    }
    
  }, []);

  function escolherMateria(materia) {
    setMateriaEscolhida(materia);
    setAssuntoEscolhido(null);
  }

  async function carregarAudiosExistentes(materia, assunto) {
    setCarregandoLista(true);
    const { data: meus } = await supabase
      .from("audios")
      .select("*")
      .eq("usuario_id", perfil.id)
      .eq("materia", materia)
      .eq("assunto", assunto)
      .order("criado_em", { ascending: true });

    const { data: colegas } = await supabase
      .from("audios")
      .select("*, usuarios(nome)")
      .eq("materia", materia)
      .eq("assunto", assunto)
      .eq("compartilhado", true)
      .neq("usuario_id", perfil.id)
      .order("criado_em", { ascending: false });

    setMeusAudios(meus ?? []);
    setAudiosColegas(colegas ?? []);
    setCarregandoLista(false);
  }

  function escolherAssunto(assunto, materiaParam) {
    const materiaAtual = materiaParam ?? materiaEscolhida;
    setAssuntoEscolhido(assunto);
    setTentativas(0);
    setResultado(null);
    setAudioBlobUrl(null);
    setTranscricaoAoVivo("");
    setModoGravacao(false);
    setPerguntaReflexiva(null);
    setRespostaReflexivaEnviada(false);
    carregarAudiosExistentes(materiaAtual.materia, assunto.nome);
  }

  function trocarMateria() {
    setMateriaEscolhida(null);
    setAssuntoEscolhido(null);
    setTentativas(0);
    setResultado(null);
    setAudioBlobUrl(null);
    setTranscricaoAoVivo("");
    setModoGravacao(false);
  }

  async function excluirMeuAudio(audio) {
    if (!confirm("Excluir esse áudio? Não dá pra desfazer.")) return;
    await excluirArquivoAudio(audio.url_audio_caminho ?? "");
    await supabase.from("audios").delete().eq("id", audio.id);
    carregarAudiosExistentes(materiaEscolhida.materia, assuntoEscolhido.nome);
  }

  async function iniciarGravacao() {
    setErro("");
    setResultado(null);
    setAudioBlobUrl(null);
    setTranscricaoAoVivo("");
    setModoGravacao(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlobBruto(blob);
        setAudioBlobUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      if (transcricaoDisponivel()) {
        const transcritor = criarTranscritorAoVivo(setTranscricaoAoVivo);
        transcritor.start();
        transcritorRef.current = transcritor;
      }

      setGravando(true);
      setSegundos(0);
      timerRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= DURACAO_MAX_SEGUNDOS) {
            pararGravacao();
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setErro("Não consegui acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  async function pararGravacao() {
    clearInterval(timerRef.current);
    setGravando(false);
    mediaRecorderRef.current?.stop();
    if (transcritorRef.current && !transcritorRef.current.indisponivel) {
      const textoFinal = await transcritorRef.current.stop();
      setTranscricaoAoVivo(textoFinal);
    }
  }

  async function enviarParaValidacao() {
    setEnviando(true);
    setErro("");

    const validacao = await validarConceitos({
      topico: `${materiaEscolhida.materia}: ${assuntoEscolhido.nome}`,
      conceitosChave: assuntoEscolhido.frases,
      transcricao: transcricaoAoVivo,
    });

    const novaTentativa = tentativas + 1;
    setTentativas(validacao.status === "aprovado" ? 0 : novaTentativa);
    setResultado({ ...validacao, tentativaNumero: novaTentativa });

    const totalConceitos = assuntoEscolhido.frases.length;
    const qualidade = totalConceitos
      ? Math.round(((validacao.conceitosPresentes?.length ?? 0) / totalConceitos) * 100)
      : null;

    try {
      const caminho = `${perfil.id}/${Date.now()}.webm`;
      const urlPronta = await salvarAudio(audioBlobBruto, caminho);

      const { data: audiosInseridos } = await supabase.from("audios").insert({
        usuario_id: perfil.id,
        topico_id: null,
        materia: materiaEscolhida.materia,
        assunto: assuntoEscolhido.nome,
        url_audio: urlPronta,
        url_audio_caminho: caminho,
        duracao_segundos: segundos,
        transcricao: transcricaoAoVivo,
        status_validacao: validacao.status,
        feedback_ia: validacao.feedback,
        compartilhado: false,
        reproducoes: 0,
        pontuacao_qualidade: qualidade,
      }).select();

      const novoAudioId = audiosInseridos?.[0]?.id;

      if (validacao.status === "aprovado") {
        carregarAudiosExistentes(materiaEscolhida.materia, assuntoEscolhido.nome);

        
        
        const revisaoPendente = location.state?.revisaoPendente;
        let proximoIntervaloDias = 3;

        if (revisaoPendente) {
          const manteveOuMelhorou = (qualidade ?? 0) >= (revisaoPendente.qualidadeAnterior ?? 0);
          proximoIntervaloDias = proximoIntervalo(revisaoPendente.intervaloDias, manteveOuMelhorou);
          await supabase.from("revisoes_agendadas").update({ status: "concluida" }).eq("id", revisaoPendente.id);
        }

        await supabase.from("revisoes_agendadas").insert({
          usuario_id: perfil.id,
          materia: materiaEscolhida.materia,
          assunto: assuntoEscolhido.nome,
          audio_original_id: novoAudioId,
          intervalo_dias: proximoIntervaloDias,
          data_agendada: calcularDataAgendada(proximoIntervaloDias),
          status: "pendente",
        });

        
        const perguntas = assuntoEscolhido.perguntasReflexivas ?? [];
        if (perguntas.length) {
          setPerguntaReflexiva(perguntas[Math.floor(Math.random() * perguntas.length)]);
        }
      }
    } catch (e) {
      console.error("[GravarAudio] Erro ao salvar:", e);
    }

    setEnviando(false);
  }

  async function enviarRespostaReflexiva(blob) {
    try {
      const caminho = `${perfil.id}/reflexiva-${Date.now()}.webm`;
      const urlPronta = await salvarAudio(blob, caminho);
      await supabase.from("respostas_reflexivas").insert({
        usuario_id: perfil.id,
        materia: materiaEscolhida.materia,
        assunto: assuntoEscolhido.nome,
        pergunta: perguntaReflexiva,
        url_audio: urlPronta,
      });
    } catch (e) {
      console.error("[GravarAudio] Erro ao salvar resposta reflexiva:", e);
    }
    setRespostaReflexivaEnviada(true);
  }

  function tentarDeNovo() {
    setAudioBlobUrl(null);
    setTranscricaoAoVivo("");
    setResultado(null);
    setSegundos(0);
    setPerguntaReflexiva(null);
    setRespostaReflexivaEnviada(false);
  }

  function gravarAgora() {
    tentarDeNovo();
    iniciarGravacao();
  }

  function voltarParaLista() {
    setModoGravacao(false);
    setAudioBlobUrl(null);
    setTranscricaoAoVivo("");
    setResultado(null);
    setSegundos(0);
    setPerguntaReflexiva(null);
    setRespostaReflexivaEnviada(false);
  }

  const mostrarGabarito = resultado && resultado.status !== "aprovado" && tentativas >= 3;
  const numeroProximaGravacao = meusAudios.length + 1;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="label-eyebrow mb-2">Professor por um dia</p>
      <h1 className="mb-8 text-3xl font-bold">Explique o que você aprendeu</h1>

      <PainelRevisao perfil={perfil} />

      {!materiaEscolhida && (
        <div className="card mb-6">
          <p className="label-eyebrow mb-4">Escolha a matéria</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CONTEUDO_FIXO.map((m) => (
              <button
                key={m.materia}
                onClick={() => escolherMateria(m)}
                className="rounded-xl border border-laranja-900/10 bg-creme-100 px-4 py-6 text-center font-display font-semibold text-laranja-900 transition-colors hover:border-laranja-600"
              >
                {m.materia}
              </button>
            ))}
          </div>
        </div>
      )}

      {materiaEscolhida && !assuntoEscolhido && (
        <div className="card mb-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="label-eyebrow">{materiaEscolhida.materia}: escolha o assunto</p>
            <button onClick={trocarMateria} className="text-xs text-laranja-900/40 hover:underline">
              Trocar matéria
            </button>
          </div>
          <div className="space-y-2">
            {materiaEscolhida.assuntos.map((a) => (
              <button
                key={a.nome}
                onClick={() => escolherAssunto(a)}
                className="w-full rounded-lg border border-laranja-900/10 bg-creme-100 px-4 py-3 text-left font-medium text-laranja-900 transition-colors hover:border-ouro-500"
              >
                {a.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {assuntoEscolhido && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="label-eyebrow">
              {materiaEscolhida.materia} · {assuntoEscolhido.nome}
            </p>
            <button onClick={trocarMateria} className="text-xs text-laranja-900/40 hover:underline">
              Trocar assunto
            </button>
          </div>

          {!modoGravacao && (
            <div className="space-y-6">
              {carregandoLista && <p className="text-sm text-laranja-900/40">Carregando...</p>}

              {!carregandoLista && meusAudios.length > 0 && (
                <div>
                  <p className="label-eyebrow mb-3">Seus áudios</p>
                  <div className="space-y-2">
                    {meusAudios.map((a, i) => (
                      <div key={a.id} className="card flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-sm font-medium text-laranja-900">
                            Gravação {i + 1}
                            {a.status_validacao === "aprovado" && (
                              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Validou
                              </span>
                            )}
                          </p>
                          <audio controls src={a.url_audio} className="h-8 w-full max-w-xs" />
                        </div>
                        <button
                          onClick={() => excluirMeuAudio(a)}
                          className="shrink-0 text-xs text-brasa-600 hover:underline"
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!carregandoLista && audiosColegas.length > 0 && (
                <div>
                  <p className="label-eyebrow mb-3">Áudios de colegas sobre esse assunto</p>
                  <div className="space-y-2">
                    {audiosColegas.map((a) => (
                      <div key={a.id} className="card py-3">
                        <p className="mb-1 text-sm font-medium text-laranja-900">{a.usuarios?.nome}</p>
                        <audio controls src={a.url_audio} className="h-8 w-full max-w-xs" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={iniciarGravacao} className="btn-primary w-full">
                {meusAudios.length > 0
                  ? `● Gravar de novo (gravação ${numeroProximaGravacao})`
                  : "● Começar a gravar"}
              </button>
            </div>
          )}

          {modoGravacao && !audioBlobUrl && !gravando && !resultado && (
            <div className="card mb-6 text-center">
              <p className="mb-4 text-sm text-laranja-900/60">
                Explique {assuntoEscolhido.nome.toLowerCase()} com suas próprias palavras.
              </p>
              <div className="mb-4 font-display text-4xl font-bold tabular-nums">
                00:00 <span className="text-lg text-laranja-900/30">/ 02:00</span>
              </div>
              <button onClick={iniciarGravacao} className="btn-primary">
                ● Começar a gravar
              </button>
              {!transcricaoDisponivel() && (
                <p className="mt-3 text-xs text-laranja-900/40">
                  Transcrição automática funciona melhor no Chrome ou Edge.
                </p>
              )}
              <div>
                <button onClick={voltarParaLista} className="mt-4 text-xs text-laranja-900/40 hover:underline">
                  ← Voltar pra lista
                </button>
              </div>
            </div>
          )}

          {gravando && (
            <div className="card mb-6 text-center">
              <div className="mb-4 font-display text-4xl font-bold tabular-nums">
                {String(Math.floor(segundos / 60)).padStart(2, "0")}:
                {String(segundos % 60).padStart(2, "0")}
                <span className="text-lg text-laranja-900/30"> / 02:00</span>
              </div>
              <button
                onClick={pararGravacao}
                className="btn-secondary border-brasa-600 text-brasa-600"
              >
                ■ Parar
              </button>
            </div>
          )}

          {transcricaoAoVivo && gravando && (
            <div className="card mb-6">
              <p className="label-eyebrow mb-2">Legenda (transcrição ao vivo)</p>
              <p className="text-sm leading-relaxed text-laranja-900/80">{transcricaoAoVivo}</p>
            </div>
          )}

          {audioBlobUrl && !resultado && (
            <>
              <div className="card mb-6">
                <p className="label-eyebrow mb-2">Legenda (transcrição)</p>
                <p className="mb-4 text-sm leading-relaxed text-laranja-900/80">
                  {transcricaoAoVivo || "(sem transcrição automática disponível)"}
                </p>
                <audio controls src={audioBlobUrl} className="w-full" />
              </div>

              {erro && (
                <p className="mb-4 rounded-lg bg-brasa-600/10 px-3 py-2 text-sm text-brasa-600">
                  {erro}
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={tentarDeNovo} className="btn-secondary">
                  Gravar de novo
                </button>
                <button
                  onClick={enviarParaValidacao}
                  disabled={enviando}
                  className="btn-primary flex-1"
                >
                  {enviando ? "Validando..." : "Enviar para validação"}
                </button>
              </div>
            </>
          )}

          {resultado && resultado.status === "aprovado" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-emerald-100 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-700">✓ Áudio salvo</p>
                <button
                  onClick={voltarParaLista}
                  title="Fechar"
                  className="rounded p-1 text-emerald-700/60 hover:text-emerald-800"
                >
                  ✕
                </button>
              </div>

              {perguntaReflexiva && !respostaReflexivaEnviada && (
                <div className="card border-2 border-ouro-400/40">
                  <p className="label-eyebrow mb-2">Antes de continuar</p>
                  <p className="mb-4 text-sm text-laranja-900/80">{perguntaReflexiva}</p>
                  <MiniGravador aoFinalizar={enviarRespostaReflexiva} textoBotao="Responder por áudio" />
                </div>
              )}

              {respostaReflexivaEnviada && (
                <p className="text-xs text-laranja-900/40">
                  Resposta enviada — isso ajuda a confirmar que você entendeu de verdade, não só decorou.
                </p>
              )}

              {buscarInfoAssunto(assuntoEscolhido.nome).relacionados.length > 0 && (
                <div className="card">
                  <p className="label-eyebrow mb-3">Você também deve revisar</p>
                  <div className="flex flex-wrap gap-2">
                    {buscarInfoAssunto(assuntoEscolhido.nome).relacionados.map((nome) => (
                      <span
                        key={nome}
                        className="rounded-full bg-creme-100 px-3 py-1.5 text-xs font-medium text-laranja-800"
                      >
                        ✓ {nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {resultado && resultado.status !== "aprovado" && !mostrarGabarito && (
            <div className="card">
              <span className="mb-3 inline-block rounded-full bg-brasa-600/10 px-3 py-1 text-xs font-semibold text-brasa-600">
                Não validou (tentativa {resultado.tentativaNumero}/3)
              </span>
              <p className="mb-4 text-sm text-laranja-900/80">
                Você esqueceu algum conceito-chave. Revise e tente de novo.
              </p>
              <button onClick={tentarDeNovo} className="btn-primary text-sm">
                Tentar de novo
              </button>
            </div>
          )}

          {mostrarGabarito && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-laranja-950/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                <span className="mb-3 inline-block rounded-full bg-brasa-600/10 px-3 py-1 text-xs font-semibold text-brasa-600">
                  Não validou depois de 3 tentativas
                </span>
                <p className="mb-4 text-sm text-laranja-900/80">
                  Sem problema! Aqui está o texto-base de{" "}
                  <strong>{assuntoEscolhido.nome}</strong>. O que está em
                  vermelho é o que ainda não apareceu na sua explicação:
                </p>
                <div className="mb-5 max-h-64 overflow-y-auto rounded-lg bg-creme-100 px-4 py-3 text-sm leading-relaxed">
                  {assuntoEscolhido.frases.map((frase, i) => {
                    const faltou = resultado.conceitosAusentes?.includes(frase);
                    return (
                      <span
                        key={i}
                        className={faltou ? "font-medium text-brasa-600" : "text-laranja-900/70"}
                      >
                        {frase}{" "}
                      </span>
                    );
                  })}
                </div>
                <button onClick={gravarAgora} className="btn-primary w-full text-sm">
                  ● Gravar agora
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

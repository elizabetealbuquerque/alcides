import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { PERGUNTAS_COMPATIBILIDADE, calcularPontuacao, tagsPrincipais, calcularCompatibilidade } from "../../lib/testeCompatibilidade";
import { ESTADOS_BRASIL, CIDADES_POR_ESTADO } from "../../lib/localizacao";

const AREAS = [
  "Linguagens",
  "Ciências Humanas",
  "Ciências da Natureza",
  "Matemática",
  "Redação",
];

export default function MapaBolsas() {
  const [notas, setNotas] = useState(Object.fromEntries(AREAS.map((a) => [a, ""])));
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [cursoDesejado, setCursoDesejado] = useState("");

  const [cursosDisponiveis, setCursosDisponiveis] = useState([]);

  const [etapa, setEtapa] = useState("formulario"); 
  const [resultados, setResultados] = useState(null);
  const [perfisDetectados, setPerfisDetectados] = useState(null);
  const [respostasTeste, setRespostasTeste] = useState({});
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    async function carregarOpcoes() {
      const { data } = await supabase.from("notas_corte").select("curso");
      const cursosUnicos = [...new Set((data ?? []).map((r) => r.curso))].sort();
      setCursosDisponiveis(cursosUnicos);
    }
    carregarOpcoes();
  }, []);

  const mediaGeral =
    Object.values(notas).filter(Boolean).length === AREAS.length
      ? Object.values(notas).reduce((acc, n) => acc + Number(n), 0) / AREAS.length
      : null;

  async function verChances() {
    if (cursoDesejado) {
      await buscarResultados({ curso: cursoDesejado });
    } else {
      setEtapa("perguntar_teste");
    }
  }

  const [foraDaFaixaCount, setForaDaFaixaCount] = useState(0);

  async function buscarResultados({ curso, pontuacao } = {}) {
    setBuscando(true);
    let query = supabase.from("notas_corte").select("*").order("nota_corte_ultima", { ascending: false });
    if (estado) query = query.eq("estado", estado);
    if (cidade) query = query.eq("cidade", cidade);
    if (curso) query = query.eq("curso", curso);
    const { data } = await query;

    let lista = data ?? [];

    
    
    if (mediaGeral != null) {
      const totalAntes = lista.length;
      lista = lista.filter((r) => mediaGeral >= r.nota_corte_ultima);
      setForaDaFaixaCount(totalAntes - lista.length);
    } else {
      setForaDaFaixaCount(0);
    }

    if (pontuacao) {
      lista = lista
        .map((r) => ({
          ...r,
          compatibilidade: calcularCompatibilidade(r.perfis, pontuacao, PERGUNTAS_COMPATIBILIDADE.length),
        }))
        .sort((a, b) => b.compatibilidade - a.compatibilidade || b.nota_corte_ultima - a.nota_corte_ultima);
    }

    setResultados(lista);
    setBuscando(false);
    setEtapa("resultados");
  }

  function responderPergunta(perguntaId, indice) {
    setRespostasTeste((prev) => ({ ...prev, [perguntaId]: indice }));
  }

  async function finalizarTeste() {
    const pontuacao = calcularPontuacao(respostasTeste);
    setPerfisDetectados(tagsPrincipais(pontuacao));
    await buscarResultados({ pontuacao });
  }

  function recomecar() {
    setEtapa("formulario");
    setResultados(null);
    setPerfisDetectados(null);
    setRespostasTeste({});
  }

  const testeCompleto = PERGUNTAS_COMPATIBILIDADE.every((p) => respostasTeste[p.id] != null);
  const cidadesDoEstado = estado ? CIDADES_POR_ESTADO[estado] ?? [] : [];

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Radar Universitário</h1>

      {etapa === "formulario" && (
        <div className="card mb-8">
          <p className="label-eyebrow mb-4">Suas notas por área</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {AREAS.map((area) => (
              <div key={area}>
                <label className="mb-1 block text-xs text-laranja-900/60">{area}</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  className="input-field"
                  value={notas[area]}
                  onChange={(e) => setNotas({ ...notas, [area]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {mediaGeral && (
            <p className="mt-4 text-sm text-laranja-900/60">
              Sua média simulada:{" "}
              <span className="font-display font-bold text-ouro-600">{mediaGeral.toFixed(0)}</span>
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-laranja-900/60">
                Estado (opcional)
              </label>
              <select
                className="input-field"
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value);
                  setCidade(""); // limpa cidade ao trocar de estado
                }}
              >
                <option value="">Todos os estados</option>
                {ESTADOS_BRASIL.map((uf) => (
                  <option key={uf.sigla} value={uf.sigla}>{uf.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-laranja-900/60">
                Cidade (opcional)
              </label>
              <select
                className="input-field"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                disabled={!estado}
              >
                <option value="">{estado ? "Todas as cidades" : "Escolha um estado primeiro"}</option>
                {cidadesDoEstado.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-laranja-900/60">
                Curso desejado (opcional)
              </label>
              <select
                className="input-field"
                value={cursoDesejado}
                onChange={(e) => setCursoDesejado(e.target.value)}
              >
                <option value="">Não sei ainda</option>
                {cursosDisponiveis.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={verChances} disabled={buscando} className="btn-primary mt-6 w-full">
            {buscando ? "Buscando..." : "Ver chances"}
          </button>
        </div>
      )}

      {etapa === "perguntar_teste" && (
        <div className="card text-center">
          <p className="mb-2 font-display text-lg font-bold text-laranja-900">
            Você não informou um curso.
          </p>
          <p className="mb-6 text-sm text-laranja-900/60">
            Quer fazer um teste rápido de compatibilidade? A gente usa suas
            respostas, sua nota e sua região pra sugerir cursos que combinam
            com você.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => setEtapa("teste")} className="btn-primary">
              Sim, fazer o teste
            </button>
            <button onClick={() => buscarResultados({})} className="btn-secondary">
              Não, só mostrar o que dá pra passar
            </button>
          </div>
        </div>
      )}

      {etapa === "teste" && (
        <div className="space-y-4">
          {PERGUNTAS_COMPATIBILIDADE.map((pergunta) => (
            <div key={pergunta.id} className="card">
              <p className="mb-3 font-medium text-laranja-900">{pergunta.texto}</p>
              <div className="space-y-2">
                {pergunta.opcoes.map((opcao, i) => (
                  <button
                    key={i}
                    onClick={() => responderPergunta(pergunta.id, i)}
                    className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                      respostasTeste[pergunta.id] === i
                        ? "border-laranja-600 bg-laranja-600/10 text-laranja-900"
                        : "border-laranja-900/10 text-laranja-900/70 hover:border-ouro-500"
                    }`}
                  >
                    {opcao.texto}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={finalizarTeste}
            disabled={!testeCompleto || buscando}
            className="btn-primary w-full"
          >
            {buscando ? "Calculando..." : "Ver cursos sugeridos"}
          </button>
        </div>
      )}

      {etapa === "resultados" && (
        <div>
          {perfisDetectados?.length > 0 && (
            <p className="mb-4 text-sm text-laranja-900/60">
              Baseado no teste, seu perfil combina com:{" "}
              <span className="font-semibold text-ouro-600">
                {perfisDetectados.join(", ")}
              </span>
              . Os cursos mais alinhados aparecem primeiro.
            </p>
          )}

          {foraDaFaixaCount > 0 && (
            <p className="mb-4 text-sm text-laranja-900/50">
              {foraDaFaixaCount} curso(s) ficaram de fora por estarem acima da
              sua nota simulada.
            </p>
          )}

          <div className="space-y-3">
            {resultados?.length === 0 && (
              <div className="card text-center">
                <p className="mb-1 font-medium text-laranja-900">
                  {foraDaFaixaCount > 0
                    ? "Nenhum curso dentro da sua faixa de nota com esses filtros."
                    : "Nenhum curso encontrado com essa combinação de filtros."}
                </p>
                <p className="mb-4 text-sm text-laranja-900/50">
                  {[
                    cursoDesejado && `curso "${cursoDesejado}"`,
                    cidade && `cidade "${cidade}"`,
                    estado && `estado "${estado}"`,
                  ]
                    .filter(Boolean)
                    .join(" + ") || "Tente afrouxar algum filtro."}
                </p>
                <button
                  onClick={() => {
                    setCidade("");
                    setEstado("");
                    buscarResultados({ curso: cursoDesejado || undefined });
                  }}
                  className="btn-secondary text-sm"
                >
                  Tentar sem filtrar por localização
                </button>
              </div>
            )}
            {resultados?.map((r) => {
              const dentro = mediaGeral && mediaGeral >= r.nota_corte_ultima;
              return (
                <div key={r.id} className="card flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <p className="label-eyebrow">
                        {r.programa?.toUpperCase()} · {r.universidade_sigla} · {r.universidade_nome}
                      </p>
                      {r.compatibilidade != null && (
                        <span className="rounded-full bg-laranja-600/10 px-2 py-0.5 text-xs font-semibold text-laranja-700">
                          {r.compatibilidade}% de compatibilidade
                        </span>
                      )}
                    </div>
                    <p className="font-display font-semibold">{r.curso}</p>
                    <p className="text-xs text-laranja-900/40">{r.cidade} · {r.estado}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-laranja-900/50">Nota de corte {r.ano}</p>
                    <p className="font-display text-lg font-bold">{r.nota_corte_ultima}</p>
                    {mediaGeral && (
                      <p className={`text-xs font-semibold ${dentro ? "text-emerald-600" : "text-brasa-600"}`}>
                        {dentro ? "Dentro da sua faixa" : "Ainda fora, siga treinando"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={recomecar} className="btn-secondary mt-6 text-sm">
            ← Refazer busca
          </button>
        </div>
      )}
    </div>
  );
}

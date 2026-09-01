import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function CardEstrategia({ estrategia }) {
  const [gabaritoAberto, setGabaritoAberto] = useState(false);
  const [alternativaEscolhida, setAlternativaEscolhida] = useState(null);
  const temQuestao = !!estrategia.questao_enunciado;

  return (
    <details className="card group">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-eyebrow mb-1">{estrategia.competencia_enem}</p>
            <p className="font-display text-lg font-semibold">{estrategia.titulo}</p>
          </div>
          <span className="text-laranja-900/40 transition-transform group-open:rotate-180">▾</span>
        </div>
      </summary>

      {estrategia.macete && (
        <div className="mt-4 rounded-lg bg-ouro-400/10 px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-ouro-700">🎯 Macete</p>
          <p className="text-sm leading-relaxed text-laranja-900/80">{estrategia.macete}</p>
        </div>
      )}

      {temQuestao && (
        <div className="mt-4 rounded-lg bg-creme-100 px-4 py-4">
          <p className="mb-2 text-xs font-semibold text-laranja-700">📝 Questão (inédita, estilo ENEM)</p>
          <p className="mb-3 text-sm leading-relaxed text-laranja-900/80">{estrategia.questao_enunciado}</p>

          <div className="space-y-2">
            {estrategia.questao_alternativas.map((alt) => {
              const escolhida = alternativaEscolhida === alt.letra;
              const revelarCor = gabaritoAberto
                ? alt.letra === estrategia.questao_gabarito
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : escolhida
                  ? "border-brasa-600 bg-brasa-600/10 text-brasa-700"
                  : "border-laranja-900/10 text-laranja-900/60"
                : escolhida
                ? "border-laranja-600 bg-laranja-600/10 text-laranja-900"
                : "border-laranja-900/10 text-laranja-900/70 hover:border-laranja-600";

              return (
                <button
                  key={alt.letra}
                  onClick={() => setAlternativaEscolhida(alt.letra)}
                  disabled={gabaritoAberto}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${revelarCor}`}
                >
                  <span className="font-semibold">{alt.letra})</span> {alt.texto}
                </button>
              );
            })}
          </div>

          {!gabaritoAberto ? (
            <button
              onClick={() => setGabaritoAberto(true)}
              className="btn-secondary mt-4 text-xs"
            >
              Ver gabarito e explicação
            </button>
          ) : (
            <div className="mt-4 rounded-lg bg-white px-4 py-3">
              <p className="mb-1 text-sm font-semibold text-emerald-700">
                Gabarito: {estrategia.questao_gabarito}
              </p>
              <p className="text-sm leading-relaxed text-laranja-900/70">
                {estrategia.questao_explicacao}
              </p>
            </div>
          )}
        </div>
      )}
    </details>
  );
}

export default function Estrategias() {
  const [estrategias, setEstrategias] = useState([]);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("estrategias_prova")
        .select("*")
        .order("competencia_enem");
      setEstrategias(data ?? []);
    }
    carregar();
  }, []);

  const competencias = [...new Set(estrategias.map((e) => e.competencia_enem))];
  const filtradas = filtro
    ? estrategias.filter((e) => e.competencia_enem === filtro)
    : estrategias;

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Estratégias de prova</h1>
      <p className="mb-8 text-laranja-900/60">
        Não é conteúdo de matéria, é como jogar o jogo do ENEM.
      </p>

      {competencias.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFiltro("")}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              filtro === "" ? "border-laranja-600 text-laranja-700" : "border-laranja-900/15 text-laranja-900/60"
            }`}
          >
            Todas
          </button>
          {competencias.map((c) => (
            <button
              key={c}
              onClick={() => setFiltro(c)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                filtro === c ? "border-laranja-600 text-laranja-700" : "border-laranja-900/15 text-laranja-900/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtradas.length === 0 ? (
        <div className="card text-center text-laranja-900/60">
          Nenhuma estratégia cadastrada ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {filtradas.map((e) => (
            <CardEstrategia key={e.id} estrategia={e} />
          ))}
        </div>
      )}
    </div>
  );
}

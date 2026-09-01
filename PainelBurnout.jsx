import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function PainelBurnout() {
  const [sinais, setSinais] = useState(null);
  const [emocional, setEmocional] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const [{ data: turmaData, error: turmaErro }, { data: escolaData, error: escolaErro }] =
        await Promise.all([
          supabase.rpc("burnout_agregado_por_turma"),
          supabase.rpc("burnout_emocional_por_escola"),
        ]);

      if (turmaErro) console.error("[PainelBurnout] Erro (turma):", turmaErro.message);
      if (escolaErro) console.error("[PainelBurnout] Erro (escola):", escolaErro.message);

      setSinais(turmaData ?? []);
      setEmocional(escolaData ?? []);
      setCarregando(false);
    }
    carregar();
  }, []);

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Termômetro</h1>

      {carregando && <p className="text-laranja-900/40">Carregando...</p>}

      {!carregando && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <p className="label-eyebrow mb-3">Bem-estar por escola (autorrelato)</p>
            {(!emocional || emocional.length === 0) && (
              <div className="card text-center">
                <p className="text-sm text-laranja-900/60">
                  Ainda sem check-ins suficientes. Isso aparece assim que os
                  alunos começarem a responder "como você está se sentindo".
                </p>
              </div>
            )}
            <div className="space-y-3">
              {emocional?.map((e) => {
                const critico = e.indice_estresse >= 65;
                const atencao = e.indice_estresse >= 40 && e.indice_estresse < 65;
                return (
                  <div key={e.escola} className="card flex items-center justify-between">
                    <div>
                      <p className="font-display font-semibold">{e.escola}</p>
                      <p className="text-xs text-laranja-900/50">
                        {e.total_alunos} alunos · {e.checkins_7d} responderam nos
                        últimos 7 dias
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-display text-2xl font-bold ${
                          critico ? "text-brasa-600" : atencao ? "text-ouro-600" : "text-emerald-500"
                        }`}
                      >
                        {e.indice_estresse}
                      </p>
                      <p className="text-xs text-laranja-900/40">
                        {critico ? "Estresse alto" : atencao ? "Atenção" : "Estável"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="label-eyebrow mb-3">Frequência de gravação por turma</p>
            {(!sinais || sinais.length === 0) && (
              <div className="card text-center">
                <p className="text-sm text-laranja-900/60">
                  Ainda não há dados suficientes de gravação.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {sinais?.map((s) => {
                const critico = s.queda_percentual >= 50;
                const atencao = s.queda_percentual >= 25 && s.queda_percentual < 50;
                return (
                  <div key={s.turma} className="card flex items-center justify-between">
                    <div>
                      <p className="font-display font-semibold">{s.turma}</p>
                      <p className="text-xs text-laranja-900/50">
                        {s.total_alunos} alunos · {s.gravacoes_ultimos_14d} gravações
                        nos últimos 14 dias
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-display text-2xl font-bold ${
                          critico ? "text-brasa-600" : atencao ? "text-ouro-600" : "text-emerald-500"
                        }`}
                      >
                        {s.queda_percentual > 0 ? "-" : ""}
                        {Math.abs(s.queda_percentual)}%
                      </p>
                      <p className="text-xs text-laranja-900/40">
                        {critico ? "Queda crítica" : atencao ? "Queda moderada" : "Estável"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

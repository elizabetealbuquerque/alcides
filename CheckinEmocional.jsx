import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { SENTIMENTOS, dataDeHojeISO } from "../lib/sentimentos";

export default function CheckinEmocional({ perfilId, aoFinalizar }) {
  const [selecionados, setSelecionados] = useState([]);
  const [enviando, setEnviando] = useState(false);

  function alternar(chave) {
    setSelecionados((prev) =>
      prev.includes(chave) ? prev.filter((s) => s !== chave) : [...prev, chave]
    );
  }

  async function enviar() {
    if (selecionados.length === 0) return;
    setEnviando(true);

    try {
      await supabase.from("checkins_emocionais").insert({
        usuario_id: perfilId,
        sentimentos: selecionados,
        data: dataDeHojeISO(),
      });
    } catch (e) {
      console.error("[CheckinEmocional] Erro ao salvar:", e);
    }

    setEnviando(false);
    aoFinalizar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-laranja-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <p className="label-eyebrow mb-2">Antes de continuar</p>
        <h2 className="mb-1 font-display text-xl font-bold text-laranja-950">
          Como você está se sentindo hoje?
        </h2>
        <p className="mb-5 text-sm text-laranja-900/60">
          Pode marcar mais de um. Isso fica só entre você e a coordenação, de
          forma agregada — ninguém vê sua resposta individual.
        </p>

        <div className="mb-6 grid grid-cols-2 gap-2">
          {SENTIMENTOS.map((s) => {
            const ativo = selecionados.includes(s.chave);
            return (
              <button
                key={s.chave}
                onClick={() => alternar(s.chave)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                  ativo
                    ? "border-laranja-600 bg-laranja-600/10 text-laranja-900"
                    : "border-laranja-900/10 text-laranja-900/70 hover:border-ouro-500"
                }`}
              >
                <span className="text-base">{s.emoji}</span>
                {s.rotulo}
              </button>
            );
          })}
        </div>

        <button
          onClick={enviar}
          disabled={selecionados.length === 0 || enviando}
          className="btn-primary w-full"
        >
          {enviando ? "Enviando..." : "Continuar"}
        </button>
      </div>
    </div>
  );
}

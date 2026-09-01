import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";

const FILTROS = [
  { chave: "recentes", rotulo: "Mais recentes", ordenar: (a, b) => new Date(b.criado_em) - new Date(a.criado_em) },
  { chave: "ouvidos", rotulo: "Mais ouvidos", ordenar: (a, b) => (b.reproducoes ?? 0) - (a.reproducoes ?? 0) },
  { chave: "curtos", rotulo: "Mais curtos", ordenar: (a, b) => (a.duracao_segundos ?? 0) - (b.duracao_segundos ?? 0) },
  { chave: "detalhados", rotulo: "Mais detalhados", ordenar: (a, b) => (b.duracao_segundos ?? 0) - (a.duracao_segundos ?? 0) },
  { chave: "completos", rotulo: "Mais completos", ordenar: (a, b) => (b.pontuacao_qualidade ?? 0) - (a.pontuacao_qualidade ?? 0) },
];

function formatarDuracao(segundos) {
  if (!segundos) return "";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Biblioteca() {
  const { perfil } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [audios, setAudios] = useState([]);
  const [filtro, setFiltro] = useState("recentes");

  async function carregar() {
    const { data } = await supabase
      .from("audios")
      .select("*, usuarios(nome)")
      .eq("status_validacao", "aprovado");

    const visiveis = (data ?? []).filter((a) => a.usuario_id === perfil.id || a.compartilhado);
    setAudios(visiveis);
    setCarregando(false);
  }

  useEffect(() => {
    if (perfil?.id) carregar();
  }, [perfil?.id]);

  async function registrarReproducao(audio) {
    await supabase.from("audios").update({ reproducoes: (audio.reproducoes ?? 0) + 1 }).eq("id", audio.id);
  }

  const filtroAtivo = FILTROS.find((f) => f.chave === filtro);

  const arvore = {};
  for (const audio of audios) {
    arvore[audio.materia] = arvore[audio.materia] ?? {};
    arvore[audio.materia][audio.assunto] = arvore[audio.materia][audio.assunto] ?? [];
    arvore[audio.materia][audio.assunto].push(audio);
  }
  for (const materia of Object.keys(arvore)) {
    for (const assunto of Object.keys(arvore[materia])) {
      arvore[materia][assunto].sort(filtroAtivo.ordenar);
    }
  }
  const materias = Object.keys(arvore).sort();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Biblioteca de áudios</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            onClick={() => setFiltro(f.chave)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              filtro === f.chave
                ? "border-laranja-600 text-laranja-700"
                : "border-laranja-900/15 text-laranja-900/60"
            }`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {carregando && <p className="text-laranja-900/40">Carregando...</p>}

      {!carregando && materias.length === 0 && (
        <div className="card text-center">
          <p className="text-laranja-900/60">
            Ainda não há áudios validados por aqui. Grave o primeiro em
            "Professor por um dia".
          </p>
        </div>
      )}

      <div className="space-y-3">
        {materias.map((materia) => (
          <details key={materia} className="card group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-bold text-laranja-900">{materia}</p>
                <span className="text-laranja-900/40 transition-transform group-open:rotate-180">▾</span>
              </div>
            </summary>

            <div className="mt-4 space-y-2">
              {Object.keys(arvore[materia]).sort().map((assunto) => (
                <details key={assunto} className="rounded-lg border border-laranja-900/10 bg-creme-100 group/assunto">
                  <summary className="cursor-pointer list-none px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-laranja-900">{assunto}</p>
                      <span className="text-xs text-laranja-900/40">
                        {arvore[materia][assunto].length} áudio(s)
                        <span className="ml-2 inline-block transition-transform group-open/assunto:rotate-180">▾</span>
                      </span>
                    </div>
                  </summary>

                  <div className="space-y-2 border-t border-laranja-900/10 px-4 py-3">
                    {arvore[materia][assunto].map((a) => (
                      <div key={a.id} className="rounded-lg bg-white px-3 py-2">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs font-medium text-laranja-900/70">
                            {a.usuario_id === perfil.id ? "Você" : a.usuarios?.nome}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-laranja-900/40">
                            {a.duracao_segundos ? <span>{formatarDuracao(a.duracao_segundos)}</span> : null}
                            {a.pontuacao_qualidade != null && <span>· {a.pontuacao_qualidade}% completo</span>}
                            <span>· {a.reproducoes ?? 0} ouvido(s)</span>
                          </div>
                        </div>
                        <audio
                          controls
                          src={a.url_audio}
                          className="h-8 w-full"
                          onPlay={() => registrarReproducao(a)}
                        />
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

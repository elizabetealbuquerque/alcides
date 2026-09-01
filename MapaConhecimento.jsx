import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { construirGrafo, agruparGrafoPorMateria } from "../../lib/mapaConhecimento";

const CORES_ESTADO = {
  nao_iniciado: "#EF4444",
  desenvolvimento: "#F2B705",
  dominado: "#22C55E",
};

const LABEL_ESTADO = {
  nao_iniciado: "Não iniciado",
  desenvolvimento: "Em desenvolvimento",
  dominado: "Dominado",
};

const LARGURA_CAMADA = 190;
const ALTURA_NO = 90;

function GrafoDaMateria({ materia, sub, estados, aoClicarNo }) {
  const camadas = [...new Set(sub.nos.map((n) => n.camada))].sort((a, b) => a - b);
  const porCamada = camadas.map((c) => sub.nos.filter((n) => n.camada === c));
  const larguraTotal = camadas.length * LARGURA_CAMADA;
  const alturaTotal = Math.max(...porCamada.map((c) => c.length)) * ALTURA_NO + 40;

  function posicaoNo(nome) {
    const no = sub.nos.find((n) => n.nome === nome);
    const indiceCamada = camadas.indexOf(no.camada);
    const grupo = porCamada[indiceCamada];
    const indice = grupo.findIndex((n) => n.nome === nome);
    return {
      x: indiceCamada * LARGURA_CAMADA + LARGURA_CAMADA / 2,
      y: indice * ALTURA_NO + ALTURA_NO / 2 + 20,
    };
  }

  return (
    <details className="card mb-4" open>
      <summary className="mb-2 cursor-pointer list-none font-display text-lg font-bold text-laranja-900">
        {materia}
      </summary>
      <div className="overflow-x-auto">
        <svg width={larguraTotal} height={alturaTotal} className="min-w-full">
          {sub.arestas.map((a, i) => {
            const p1 = posicaoNo(a.de);
            const p2 = posicaoNo(a.para);
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#E5DCC8" strokeWidth="2" />;
          })}
          {sub.nos.map((no) => {
            const pos = posicaoNo(no.nome);
            const cor = CORES_ESTADO[estados[no.nome] ?? "nao_iniciado"];
            return (
              <g key={no.nome} onClick={() => aoClicarNo(no)} className="cursor-pointer">
                <circle cx={pos.x} cy={pos.y} r="26" fill="white" stroke={cor} strokeWidth="4" />
                <circle cx={pos.x} cy={pos.y} r="26" fill={cor} opacity="0.12" />
                <text x={pos.x} y={pos.y + 42} textAnchor="middle" fontSize="11" fontWeight="700" fill="#3D1F0C" style={{ fontFamily: "sans-serif" }}>
                  {no.nome.length > 16 ? no.nome.slice(0, 15) + "…" : no.nome}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </details>
  );
}

export default function MapaConhecimento() {
  const { perfil } = useAuth();
  const grafo = useMemo(() => construirGrafo(), []);
  const porMateria = useMemo(() => agruparGrafoPorMateria(grafo), [grafo]);
  const [estados, setEstados] = useState({});
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [painel, setPainel] = useState(null);

  useEffect(() => {
    async function carregar() {
      const { data: diagnosticos } = await supabase
        .from("diagnosticos")
        .select("nivel_dominio, topicos(nome)")
        .eq("usuario_id", perfil.id);

      const { data: audios } = await supabase
        .from("audios")
        .select("assunto, status_validacao")
        .eq("usuario_id", perfil.id);

      const diagPorNome = {};
      for (const d of diagnosticos ?? []) {
        if (d.topicos?.nome) diagPorNome[d.topicos.nome] = d.nivel_dominio;
      }
      const audioAprovadoPorNome = new Set(
        (audios ?? []).filter((a) => a.status_validacao === "aprovado").map((a) => a.assunto)
      );
      const audioTentadoPorNome = new Set((audios ?? []).map((a) => a.assunto));

      const novo = {};
      for (const no of grafo.nos) {
        const diag = diagPorNome[no.nome];
        const temAprovado = audioAprovadoPorNome.has(no.nome);
        const temTentativa = audioTentadoPorNome.has(no.nome);
        if (temAprovado && (diag == null || diag >= 0.6)) {
          novo[no.nome] = "dominado";
        } else if (diag != null || temTentativa) {
          novo[no.nome] = "desenvolvimento";
        } else {
          novo[no.nome] = "nao_iniciado";
        }
      }
      setEstados(novo);
    }
    if (perfil?.id) carregar();
  }, [perfil?.id, grafo]);

  async function abrirDetalhe(no) {
    setPainel(no.nome);
    setCarregandoDetalhe(true);

    const { data: meusAudios } = await supabase
      .from("audios")
      .select("*")
      .eq("usuario_id", perfil.id)
      .eq("assunto", no.nome)
      .order("criado_em", { ascending: false });

    const { data: diagnostico } = await supabase
      .from("diagnosticos")
      .select("nivel_dominio, topicos(nome)")
      .eq("usuario_id", perfil.id);
    const diagDoAssunto = (diagnostico ?? []).find((d) => d.topicos?.nome === no.nome);

    const { data: revisoes } = await supabase
      .from("revisoes_agendadas")
      .select("*")
      .eq("usuario_id", perfil.id)
      .eq("assunto", no.nome)
      .eq("status", "concluida");

    const { data: audiosBiblioteca } = await supabase
      .from("audios")
      .select("*, usuarios(nome)")
      .eq("assunto", no.nome)
      .eq("compartilhado", true)
      .neq("usuario_id", perfil.id);

    setDetalhe({
      meusAudios: meusAudios ?? [],
      nivelDominio: diagDoAssunto?.nivel_dominio ?? null,
      revisoesRealizadas: revisoes?.length ?? 0,
      audiosBiblioteca: audiosBiblioteca ?? [],
      dependentes: grafo.dependentes[no.nome] ?? [],
    });
    setCarregandoDetalhe(false);
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Mapa do Conhecimento</h1>

      <div className="mb-6 flex gap-4 text-xs">
        {Object.entries(LABEL_ESTADO).map(([chave, rotulo]) => (
          <span key={chave} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CORES_ESTADO[chave] }} />
            {rotulo}
          </span>
        ))}
      </div>

      {Object.entries(porMateria).map(([materia, sub]) => (
        <GrafoDaMateria key={materia} materia={materia} sub={sub} estados={estados} aoClicarNo={abrirDetalhe} />
      ))}

      {painel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-laranja-950/50 p-4" onClick={() => setPainel(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-laranja-900">{painel}</h2>
              <button onClick={() => setPainel(null)} className="text-laranja-900/40 hover:text-laranja-900">✕</button>
            </div>

            {carregandoDetalhe && <p className="text-sm text-laranja-900/40">Carregando...</p>}

            {!carregandoDetalhe && detalhe && (
              <div className="space-y-4 text-sm">
                {detalhe.nivelDominio != null && (
                  <p className="text-laranja-900/80">
                    Desempenho nos simulados: <strong>{Math.round(detalhe.nivelDominio * 100)}%</strong>
                  </p>
                )}

                <div>
                  <p className="mb-1.5 font-semibold text-laranja-900">Seus áudios ({detalhe.meusAudios.length})</p>
                  {detalhe.meusAudios.length === 0 && <p className="text-xs text-laranja-900/40">Nenhum ainda.</p>}
                  {detalhe.meusAudios.map((a) => (
                    <p key={a.id} className="text-xs text-laranja-900/60">
                      {new Date(a.criado_em).toLocaleDateString("pt-BR")} · {a.status_validacao}
                    </p>
                  ))}
                </div>

                <p className="text-laranja-900/80">
                  Revisões espaçadas concluídas: <strong>{detalhe.revisoesRealizadas}</strong>
                </p>

                <div>
                  <p className="mb-1.5 font-semibold text-laranja-900">
                    Áudios de colegas na biblioteca ({detalhe.audiosBiblioteca.length})
                  </p>
                  {detalhe.audiosBiblioteca.map((a) => (
                    <p key={a.id} className="text-xs text-laranja-900/60">{a.usuarios?.nome}</p>
                  ))}
                </div>

                {detalhe.dependentes.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-semibold text-laranja-900">Depende deste assunto</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detalhe.dependentes.map((d) => (
                        <span key={d} className="rounded-full bg-creme-100 px-2.5 py-1 text-xs">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

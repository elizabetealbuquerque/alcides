import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { construirGrafo, agruparGrafoPorMateria } from "../../lib/mapaConhecimento";

const LARGURA_CAMADA = 190;
const ALTURA_NO = 90;

function corPorMedia(media) {
  if (media == null) return "#D9D2C4";
  if (media < 0.4) return "#EF4444";
  if (media < 0.7) return "#F2B705";
  return "#22C55E";
}

function GrafoDaMateria({ materia, sub, medias }) {
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
            const info = medias[no.nome];
            const cor = corPorMedia(info?.media);
            return (
              <g key={no.nome}>
                <circle cx={pos.x} cy={pos.y} r="26" fill="white" stroke={cor} strokeWidth="4" />
                <circle cx={pos.x} cy={pos.y} r="26" fill={cor} opacity="0.15" />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#3D1F0C" style={{ fontFamily: "sans-serif" }}>
                  {info ? `${Math.round(info.media * 100)}%` : "-"}
                </text>
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

export default function MapaConhecimentoAdmin() {
  const grafo = useMemo(() => construirGrafo(), []);
  const porMateria = useMemo(() => agruparGrafoPorMateria(grafo), [grafo]);
  const [medias, setMedias] = useState({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const { data: diagnosticos } = await supabase
        .from("diagnosticos")
        .select("nivel_dominio, topicos(nome)");

      const somaPorNome = {};
      const contagemPorNome = {};
      for (const d of diagnosticos ?? []) {
        const nome = d.topicos?.nome;
        if (!nome) continue;
        somaPorNome[nome] = (somaPorNome[nome] ?? 0) + d.nivel_dominio;
        contagemPorNome[nome] = (contagemPorNome[nome] ?? 0) + 1;
      }

      const resultado = {};
      for (const nome of Object.keys(somaPorNome)) {
        resultado[nome] = { media: somaPorNome[nome] / contagemPorNome[nome], total: contagemPorNome[nome] };
      }
      setMedias(resultado);
      setCarregando(false);
    }
    carregar();
  }, []);

  const criticos = Object.entries(medias)
    .filter(([, v]) => v.media < 0.5)
    .sort((a, b) => a[1].media - b[1].media);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Mapa do Conhecimento das turmas</h1>

      {carregando && <p className="text-laranja-900/40">Carregando...</p>}

      {!carregando && criticos.length > 0 && (
        <div className="card mb-6 border-2 border-brasa-600/30">
          <p className="label-eyebrow mb-2">Pré-requisitos que concentram mais dificuldade</p>
          <div className="flex flex-wrap gap-2">
            {criticos.map(([nome, v]) => (
              <span key={nome} className="rounded-full bg-brasa-600/10 px-3 py-1.5 text-xs font-medium text-brasa-700">
                {nome} ({Math.round(v.media * 100)}% de média)
              </span>
            ))}
          </div>
        </div>
      )}

      {!carregando &&
        Object.entries(porMateria).map(([materia, sub]) => (
          <GrafoDaMateria key={materia} materia={materia} sub={sub} medias={medias} />
        ))}
    </div>
  );
}

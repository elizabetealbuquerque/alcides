export const MAPA_CONHECIMENTO = {};


export function buscarInfoAssunto(nomeAssunto) {
  return MAPA_CONHECIMENTO[nomeAssunto] ?? { materia: null, preRequisitos: [], relacionados: [] };
}

export function construirGrafo() {
  const nomes = Object.keys(MAPA_CONHECIMENTO);

  function calcularCamada(nome, pilha = new Set()) {
    const info = MAPA_CONHECIMENTO[nome];
    if (!info || info.preRequisitos.length === 0 || pilha.has(nome)) return 0;
    pilha.add(nome);
    const camadas = info.preRequisitos
      .filter((p) => MAPA_CONHECIMENTO[p])
      .map((p) => calcularCamada(p, pilha));
    return camadas.length ? 1 + Math.max(...camadas) : 0;
  }

  const nos = nomes.map((nome) => ({
    nome,
    materia: MAPA_CONHECIMENTO[nome].materia,
    camada: calcularCamada(nome),
  }));

  const arestas = [];
  for (const nome of nomes) {
    for (const preReq of MAPA_CONHECIMENTO[nome].preRequisitos) {
      if (MAPA_CONHECIMENTO[preReq]) arestas.push({ de: preReq, para: nome });
    }
  }

  
  const dependentes = {};
  for (const nome of nomes) dependentes[nome] = [];
  for (const { de, para } of arestas) dependentes[de].push(para);

  return { nos, arestas, dependentes };
}

export function agruparGrafoPorMateria(grafo) {
  const porMateria = {};
  for (const no of grafo.nos) {
    porMateria[no.materia] = porMateria[no.materia] ?? { nos: [], arestas: [] };
    porMateria[no.materia].nos.push(no);
  }
  for (const aresta of grafo.arestas) {
    const materiaDe = grafo.nos.find((n) => n.nome === aresta.de)?.materia;
    if (materiaDe && porMateria[materiaDe]) porMateria[materiaDe].arestas.push(aresta);
  }
  return porMateria;
}

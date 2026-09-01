export const PERGUNTAS_COMPATIBILIDADE = [];


export function calcularPontuacao(respostas) {
  const pontuacao = {};
  for (const pergunta of PERGUNTAS_COMPATIBILIDADE) {
    const indiceEscolhido = respostas[pergunta.id];
    if (indiceEscolhido == null) continue;
    const perfil = pergunta.opcoes[indiceEscolhido].perfil;
    pontuacao[perfil] = (pontuacao[perfil] ?? 0) + 1;
  }
  return pontuacao;
}

export function tagsPrincipais(pontuacao, n = 2) {
  return Object.entries(pontuacao)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([perfil]) => perfil);
}

export function calcularCompatibilidade(perfisCurso, pontuacao, totalPerguntas) {
  if (!perfisCurso?.length || !totalPerguntas) return 0;
  const soma = perfisCurso.reduce((acc, tag) => acc + (pontuacao[tag] ?? 0), 0);
  const media = soma / (perfisCurso.length * totalPerguntas);
  return Math.round(media * 100);
}

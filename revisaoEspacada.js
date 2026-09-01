export const INTERVALOS_DIAS = [3, 7, 15, 30, 60];

export function proximoIntervalo(intervaloAtual, manteveOuMelhorou) {
  if (!manteveOuMelhorou) return INTERVALOS_DIAS[0];
  const indice = INTERVALOS_DIAS.indexOf(intervaloAtual);
  return INTERVALOS_DIAS[Math.min(indice + 1, INTERVALOS_DIAS.length - 1)];
}

export function calcularDataAgendada(diasAPartirDeHoje) {
  const data = new Date();
  data.setDate(data.getDate() + diasAPartirDeHoje);
  return data.toISOString().slice(0, 10);
}

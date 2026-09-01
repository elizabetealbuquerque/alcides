export const SENTIMENTOS = [
  { chave: "motivado", rotulo: "Motivado(a)", emoji: "😊", peso: -1 },
  { chave: "confiante", rotulo: "Confiante", emoji: "💪", peso: -1 },
  { chave: "tranquilo", rotulo: "Tranquilo(a)", emoji: "😌", peso: -1 },
  { chave: "animado", rotulo: "Animado(a)", emoji: "🤩", peso: -1 },
  { chave: "cansado", rotulo: "Cansado(a)", emoji: "😴", peso: 1 },
  { chave: "ansioso", rotulo: "Ansioso(a)", emoji: "😰", peso: 1 },
  { chave: "desmotivado", rotulo: "Desmotivado(a)", emoji: "😔", peso: 1 },
  { chave: "inseguro", rotulo: "Inseguro(a)", emoji: "😟", peso: 1 },
  { chave: "sobrecarregado", rotulo: "Sobrecarregado(a)", emoji: "🥵", peso: 2 },
  { chave: "estressado", rotulo: "Estressado(a)", emoji: "😣", peso: 2 },
];

export function dataDeHojeISO() {
  return new Date().toISOString().slice(0, 10); 
}

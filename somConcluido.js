export function tocarSomConcluido() {
  try {
    const contexto = new (window.AudioContext || window.webkitAudioContext)();
    const agora = contexto.currentTime;

    
    [880, 1320].forEach((frequencia, i) => {
      const oscilador = contexto.createOscillator();
      const ganho = contexto.createGain();
      oscilador.type = "sine";
      oscilador.frequency.value = frequencia;
      oscilador.connect(ganho);
      ganho.connect(contexto.destination);

      const inicio = agora + i * 0.1;
      ganho.gain.setValueAtTime(0, inicio);
      ganho.gain.linearRampToValueAtTime(0.15, inicio + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.001, inicio + 0.18);

      oscilador.start(inicio);
      oscilador.stop(inicio + 0.2);
    });
  } catch {
    
    
  }
}


export function transcricaoDisponivel() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

export function criarTranscritorAoVivo(onAtualizar) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      start: () => {},
      stop: async () => "",
      indisponivel: true,
    };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;

  let textoFinal = "";

  recognition.onresult = (event) => {
    let textoInterino = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const trecho = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        textoFinal += trecho + " ";
      } else {
        textoInterino += trecho;
      }
    }
    onAtualizar((textoFinal + textoInterino).trim());
  };

  return {
    start: () => recognition.start(),
    stop: () =>
      new Promise((resolve) => {
        recognition.onend = () => resolve(textoFinal.trim());
        recognition.stop();
      }),
    indisponivel: false,
  };
}

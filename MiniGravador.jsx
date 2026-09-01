import { useRef, useState } from "react";

export default function MiniGravador({ aoFinalizar, textoBotao = "Gravar resposta" }) {
  const [gravando, setGravando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const chunksRef = useRef([]);
  const recorderRef = useRef(null);
  const blobRef = useRef(null);
  const streamRef = useRef(null);

  async function iniciar() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setPronto(true);
      };
      recorderRef.current = rec;
      rec.start();
      setGravando(true);
    } catch {
      alert("Não consegui acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function parar() {
    recorderRef.current?.stop();
    setGravando(false);
  }

  async function enviar() {
    setEnviando(true);
    await aoFinalizar(blobRef.current);
    setEnviando(false);
    setPronto(false);
  }

  if (pronto) {
    return (
      <button onClick={enviar} disabled={enviando} className="btn-primary text-sm">
        {enviando ? "Enviando..." : "Enviar resposta"}
      </button>
    );
  }

  if (gravando) {
    return (
      <button onClick={parar} className="btn-secondary border-brasa-600 text-sm text-brasa-600">
        ■ Parar
      </button>
    );
  }

  return (
    <button onClick={iniciar} className="btn-secondary text-sm">
      🎙 {textoBotao}
    </button>
  );
}

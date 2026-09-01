import { useMemo } from "react";

export default function EspectroAudio({ numBarras = 40, altura = 60, cor = "#12080A", className = "" }) {
  const barras = useMemo(
    () =>
      Array.from({ length: numBarras }).map(() => ({
        alturaBase: 25 + Math.random() * 65, // % da altura máxima
        duracao: 0.6 + Math.random() * 0.8,
        atraso: Math.random() * 0.6,
      })),
    [numBarras]
  );

  return (
    <div className={`flex items-end gap-1 ${className}`} style={{ height: altura }}>
      {barras.map((b, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            height: `${b.alturaBase}%`,
            backgroundColor: cor,
            animation: `pulsarEspectro ${b.duracao}s ease-in-out ${b.atraso}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

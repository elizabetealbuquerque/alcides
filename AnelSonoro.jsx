export default function AnelSonoro({ tamanho = 200, numBarras = 28, className = "" }) {
  const raio = tamanho / 2;
  const r1 = raio * 0.62;
  const r2 = raio * 0.8;
  const cores = ["#58CC02", "#1CB0F6", "#FFC800", "#FF4B4B", "#CE82FF"];

  const barras = Array.from({ length: numBarras }).map((_, i) => {
    const angulo = (Math.PI * 2 * i) / numBarras;
    return {
      x1: raio + r1 * Math.cos(angulo),
      y1: raio + r1 * Math.sin(angulo),
      x2: raio + r2 * Math.cos(angulo),
      y2: raio + r2 * Math.sin(angulo),
      cor: cores[i % cores.length],
      atraso: (i % 8) * 0.12,
    };
  });

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: tamanho * 1.15, height: tamanho * 1.15 }}
    >
      <div
        className="absolute rounded-full bg-duo-laranja/10"
        style={{ width: tamanho * 1.15, height: tamanho * 1.15 }}
      />

      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="relative">
        <circle cx={raio} cy={raio} r={raio * 0.9} fill="none" stroke="#FFDDAA" strokeWidth="3" />
        {barras.map((b, i) => (
          <line
            key={i}
            x1={b.x1}
            y1={b.y1}
            x2={b.x2}
            y2={b.y2}
            stroke={b.cor}
            strokeWidth={Math.max(2.5, tamanho * 0.02)}
            strokeLinecap="round"
            style={{
              transformOrigin: `${b.x1}px ${b.y1}px`,
              animation: `pulsarBarra 1.6s ease-in-out ${b.atraso}s infinite`,
            }}
          />
        ))}
      </svg>

      <div
        className="absolute flex items-center justify-center rounded-full bg-duo-laranja"
        style={{ width: tamanho * 0.44, height: tamanho * 0.44 }}
      >
        <span className="font-display font-extrabold text-white" style={{ fontSize: tamanho * 0.16 }}>
          A
        </span>
      </div>
    </div>
  );
}

export default function OndasSonoras({ cx = "75%", cy = "35%", quantidade = 4 }) {
  const cores = ["#FF6A1A", "#FFC93C", "#FF3D68", "#FF6A1A"];

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
      {Array.from({ length: quantidade }).map((_, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="40"
          fill="none"
          stroke={cores[i % cores.length]}
          strokeWidth="1"
          style={{
            animation: `propagarOnda 3.6s ease-out ${i * 0.9}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta da marca: laranja como cor primária, creme como base clara,
        // um marrom quente escuro pra contraste (barra lateral, hero escuro).
        creme: {
          50: "#FBF3E7",
          100: "#F5E7D0",
          200: "#ECD5AE",
        },
        laranja: {
          950: "#2B1508",
          900: "#3D1F0C",
          800: "#5C2E0F",
          700: "#7A3D12",
          600: "#B8460A",
          500: "#D2570A",
          400: "#E67E22",
          300: "#F2985B",
        },
        brasa: {
          600: "#A31F1F",
          500: "#C43C1D",
          400: "#E06A0F",
        },
        ouro: {
          600: "#A8790A",
          500: "#C99406",
          400: "#F2B705",
          300: "#F6C947",
        },
        // Tons vivos, usados só no hero escuro (home/login) — mais
        // saturados que a paleta "laranja" do resto do app.
        neon: {
          laranja: "#FF6A1A",
          coral: "#FF3D68",
          ouro: "#FFC93C",
        },
        // Paleta da marca "Explay" — quente, vibrante, chamativa. Usada só
        // nas telas de marca (home/login). O app por dentro continua com
        // a paleta "duo" e "laranja" já existentes.
        explay: {
          magenta: "#FF1F5C",
          laranja: "#FF6A00",
          amarelo: "#FFC700",
          escuro: "#12080A",
          cardEscuro: "#1E0E0C",
        },
        // Paleta colorida e divertida usada nas telas de marca (home/login)
        // — blocos de cor sólida, não gradiente. Independente da paleta
        // "laranja" usada no app por dentro.
        duo: {
          bg: "#FFFBF5",
          borda: "#F0EEE6",
          texto: "#3C3C3C",
          textoMuted: "#777777",
          laranja: "#FF9600",
          laranjaEscuro: "#CC7800",
          verde: "#58CC02",
          verdeEscuro: "#46A302",
          azul: "#1CB0F6",
          azulEscuro: "#1699D6",
          amarelo: "#FFC800",
          rosa: "#FF4B4B",
          roxo: "#CE82FF",
          roxoEscuro: "#A85EDB",
        },
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        poster: ["Archivo Black", "sans-serif"],
      },
      backgroundImage: {
        "gradiente-marca":
          "linear-gradient(120deg, #B8460A 0%, #E67E22 55%, #F2B705 100%)",
        "gradiente-neon":
          "linear-gradient(135deg, #FF6A1A, #FFC93C)",
        "gradiente-explay":
          "linear-gradient(115deg, #FF1F5C 0%, #FF6A00 55%, #FFC700 100%)",
        "grao-creme":
          "radial-gradient(circle at 1px 1px, rgba(52,16,27,0.05) 1px, transparent 0)",
        "glow-laranja":
          "radial-gradient(circle, rgba(230,126,34,0.18) 0%, transparent 70%)",
      },
      keyframes: {
        girarLento: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        flutuar: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        propagar: {
          "0%": { r: "40", opacity: "0.5" },
          "100%": { r: "280", opacity: "0" },
        },
      },
      animation: {
        "girar-lento": "girarLento 40s linear infinite",
        flutuar: "flutuar 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};


const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === "true";

function contarPalavrasSignificativas(frase) {
  return frase
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos pra comparar melhor
    .split(/\W+/)
    .filter((p) => p.length > 5); // só palavras mais "de conteúdo" (substantivos/termos técnicos)
}

function fraseCobertaNoTexto(frase, textoNormalizado) {
  const palavras = contarPalavrasSignificativas(frase);
  if (palavras.length === 0) return false;
  const encontradas = palavras.filter((p) => textoNormalizado.includes(p));
  
  
  
  
  return encontradas.length / palavras.length >= 0.5;
}

function validarPorHeuristica({ conceitosChave, transcricao }) {
  const textoNormalizado = transcricao
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const totalPalavras = transcricao.trim().split(/\s+/).filter(Boolean).length;

  // Sem lista curada de conceitos (ex: gravação livre sem tópico cadastrado):
  // não dá pra checar conteúdo, então só avaliamos estrutura mínima e
  // deixamos claro que precisa de revisão humana ou de IA real.
  if (!conceitosChave || conceitosChave.length === 0) {
    const estruturaMinima = totalPalavras >= 25;
    return {
      status: estruturaMinima ? "requer_revisao" : "reprovado",
      feedback: estruturaMinima
        ? "Sem uma lista de conceitos cadastrada pra esse assunto, não dá pra validar o conteúdo automaticamente. Um professor vai revisar."
        : "A explicação ficou curta demais pra avaliar. Tente detalhar mais.",
      conceitosPresentes: [],
      conceitosAusentes: [],
      errosFactuais: [],
    };
  }

  const presentes = conceitosChave.filter((c) => fraseCobertaNoTexto(c, textoNormalizado));
  const ausentes = conceitosChave.filter((c) => !presentes.includes(c));
  const cobertura = presentes.length / conceitosChave.length;

  
  
  const aprovado = cobertura >= 0.8 && totalPalavras >= 25;
  const status = aprovado ? "aprovado" : "requer_revisao";

  return {
    status,
    feedback: aprovado
      ? "Validação de demonstração (sem IA real): sua explicação cobriu bem os conceitos esperados."
      : "Validação de demonstração (sem IA real): a cobertura dos conceitos-chave ficou baixa ou a explicação foi curta demais. Um professor vai revisar.",
    conceitosPresentes: presentes,
    conceitosAusentes: ausentes,
    errosFactuais: [],
  };
}

function montarPrompt({ topico, conceitosChave, transcricao }) {
  return `Você é um avaliador pedagógico de um cursinho popular preparatório para o ENEM.

Você receberá:
1. O nome do tópico: ${topico}
2. Uma lista de conceitos-chave esperados: ${conceitosChave.join(", ")}
3. A transcrição da explicação de um aluno: """${transcricao}"""

Avalie SEMPRE por conceito, nunca por comparação literal de texto. Um aluno pode
explicar certo usando palavras completamente diferentes do "gabarito".

Responda APENAS com um JSON válido, sem markdown, no formato exato:
{
  "conceitos_presentes": ["..."],
  "conceitos_ausentes": ["..."],
  "erros_factuais": ["..."],
  "status": "aprovado" | "requer_revisao" | "reprovado",
  "feedback": "texto curto e construtivo para o aluno, no máximo 2 frases"
}

Regras:
- "conceitos_presentes" e "conceitos_ausentes" devem conter EXATAMENTE o texto
  literal de cada item da lista de conceitos-chave fornecida acima — não
  parafraseie, não resuma, copie a frase original inteira. Isso é usado pra
  destacar no texto depois, então precisa bater com o original.
- "erros_factuais" só deve conter erros que mudam o significado do conceito
  (ex: fórmula errada, relação de causa/efeito invertida).
- Diferenças de estilo, ordem de explicação ou exemplos usados NÃO contam como erro.
- Se o aluno explicou tudo corretamente e ainda acrescentou informações extras
  por conta própria, isso NÃO deve reduzir a nota nem contar como erro — só
  valide se os conceitos esperados foram cobertos.
- Se a confiança na avaliação for baixa (explicação ambígua ou transcrição curta
  demais), retorne status "requer_revisao".`;
}

function extrairJSON(texto) {
  const limpo = texto.replace(/```json|```/g, "").trim();
  return JSON.parse(limpo);
}

/**
 * @param {{ topico: string, conceitosChave: string[], transcricao: string }} params
 * @returns {Promise<{ status: string, feedback: string, conceitosPresentes: string[], conceitosAusentes: string[], errosFactuais: string[] }>}
 */
export async function validarConceitos({ topico, conceitosChave, transcricao }) {
  if (!GEMINI_API_KEY) {
    if (MODO_DEMO) {
      return validarPorHeuristica({ conceitosChave, transcricao });
    }
    return {
      status: "requer_revisao",
      feedback:
        "Validação automática indisponível (chave de IA não configurada). Um professor vai revisar manualmente.",
      conceitosPresentes: [],
      conceitosAusentes: conceitosChave,
      errosFactuais: [],
    };
  }

  if (!transcricao || transcricao.trim().length < 20) {
    return {
      status: "requer_revisao",
      feedback:
        "A transcrição ficou muito curta para avaliar. Tente gravar de novo em um ambiente mais silencioso.",
      conceitosPresentes: [],
      conceitosAusentes: conceitosChave,
      errosFactuais: [],
    };
  }

  try {
    const resposta = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: montarPrompt({ topico, conceitosChave, transcricao }) }] },
        ],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!resposta.ok) {
      throw new Error(`Gemini respondeu ${resposta.status}`);
    }

    const dados = await resposta.json();
    const texto = dados.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const resultado = extrairJSON(texto);

    return {
      status: resultado.status ?? "requer_revisao",
      feedback: resultado.feedback ?? "Sem feedback disponível.",
      conceitosPresentes: resultado.conceitos_presentes ?? [],
      conceitosAusentes: resultado.conceitos_ausentes ?? [],
      errosFactuais: resultado.erros_factuais ?? [],
    };
  } catch (erro) {
    console.error("[validarConceitos] Falha na validação por IA:", erro);
    return {
      status: "requer_revisao",
      feedback:
        "Não foi possível validar automaticamente agora. Um professor vai revisar manualmente.",
      conceitosPresentes: [],
      conceitosAusentes: conceitosChave,
      errosFactuais: [],
    };
  }
}

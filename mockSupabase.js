
const CHAVE_DB = "elo_demo_db";
const CHAVE_VERSAO = "elo_demo_db_versao";




const VERSAO_SEED = 6;
const CHAVE_SESSAO = "elo_demo_sessao";

const SEED = {
  usuarios: [],
  topicos: [],
  topicos_conceitos_chave: [],
  diagnosticos: [],
  questoes_simulado: [],
  solicitacoes_audio: [],
  mensagens_chat: [],
  audios: [],
  checkins_emocionais: [],
  revisoes_agendadas: [],
  respostas_reflexivas: [],
  playlist_concluida: [],
  estrategias_prova: [],
  notas_corte: [],
  senhas: {},
};

function carregarDB() {
  const versaoSalva = localStorage.getItem(CHAVE_VERSAO);
  const salvo = localStorage.getItem(CHAVE_DB);

  if (salvo && versaoSalva === String(VERSAO_SEED)) {
    return JSON.parse(salvo);
  }

  
  const fresco = structuredClone(SEED);
  localStorage.setItem(CHAVE_DB, JSON.stringify(fresco));
  localStorage.setItem(CHAVE_VERSAO, String(VERSAO_SEED));
  return fresco;
}

function salvarDB(db) {
  localStorage.setItem(CHAVE_DB, JSON.stringify(db));
}

function uid(prefixo) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`;
}

function singular(palavra) {
  return palavra.endsWith("s") ? palavra.slice(0, -1) : palavra;
}

function resolverEmbeds(row, selectStr, db) {
  const linha = { ...row };
  const matches = [...selectStr.matchAll(/(\w+)\(([^)]+)\)/g)];
  for (const [, tabelaRelacionada] of matches) {
    const fk = `${singular(tabelaRelacionada)}_id`;
    const idAlvo = row[fk];
    const tabela = db[tabelaRelacionada] ?? [];
    linha[tabelaRelacionada] = tabela.find((r) => r.id === idAlvo) ?? null;
  }
  return linha;
}

class MockQuery {
  constructor(tabela) {
    this.tabela = tabela;
    this.filtros = [];
    this.selectStr = "*";
    this.ordenacao = null;
    this.limite = null;
    this.querUnico = false;
  }
  select(str = "*") {
    this.selectStr = str;
    return this;
  }
  eq(col, val) {
    this.filtros.push({ tipo: "eq", col, val });
    return this;
  }
  neq(col, val) {
    this.filtros.push({ tipo: "neq", col, val });
    return this;
  }
  lte(col, val) {
    this.filtros.push({ tipo: "lte", col, val });
    return this;
  }
  in(col, vals) {
    this.filtros.push({ tipo: "in", col, vals });
    return this;
  }
  lt(col, val) {
    this.filtros.push({ tipo: "lt", col, val });
    return this;
  }
  ilike(col, val) {
    this.filtros.push({ tipo: "ilike", col, val: String(val).replace(/%/g, "").toLowerCase() });
    return this;
  }
  order(col, { ascending = true } = {}) {
    this.ordenacao = { col, ascending };
    return this;
  }
  limit(n) {
    this.limite = n;
    return this;
  }
  single() {
    this.querUnico = true;
    return this;
  }

  async _executarSelect() {
    const db = carregarDB();
    let linhas = [...(db[this.tabela] ?? [])];

    for (const f of this.filtros) {
      linhas = linhas.filter((row) => {
        if (f.tipo === "eq") return row[f.col] === f.val;
        if (f.tipo === "neq") return row[f.col] !== f.val;
        if (f.tipo === "lt") return row[f.col] < f.val;
        if (f.tipo === "lte") return row[f.col] <= f.val;
        if (f.tipo === "in") return f.vals.includes(row[f.col]);
        if (f.tipo === "ilike")
          return String(row[f.col] ?? "").toLowerCase().includes(f.val);
        return true;
      });
    }

    if (this.ordenacao) {
      const { col, ascending } = this.ordenacao;
      linhas.sort((a, b) => {
        if (a[col] < b[col]) return ascending ? -1 : 1;
        if (a[col] > b[col]) return ascending ? 1 : -1;
        return 0;
      });
    }

    if (this.limite != null) linhas = linhas.slice(0, this.limite);

    linhas = linhas.map((row) => resolverEmbeds(row, this.selectStr, db));

    if (this.querUnico) {
      return linhas[0]
        ? { data: linhas[0], error: null }
        : { data: null, error: { message: "Registro não encontrado" } };
    }
    return { data: linhas, error: null };
  }

  insert(objeto) {
    const db = carregarDB();
    const novo = { id: uid(this.tabela), criado_em: new Date().toISOString(), ...objeto };
    db[this.tabela] = [...(db[this.tabela] ?? []), novo];
    salvarDB(db);
    const resultado = { data: [novo], error: null };
    
    const promessa = Promise.resolve(resultado);
    promessa.select = () => Promise.resolve(resultado);
    return promessa;
  }

  async update(objeto) {
    const db = carregarDB();
    db[this.tabela] = (db[this.tabela] ?? []).map((row) => {
      const combina = this.filtros.every((f) => row[f.col] === f.val);
      return combina ? { ...row, ...objeto } : row;
    });
    salvarDB(db);
    return { data: null, error: null };
  }

  async delete() {
    const db = carregarDB();
    db[this.tabela] = (db[this.tabela] ?? []).filter(
      (row) => !this.filtros.every((f) => row[f.col] === f.val)
    );
    salvarDB(db);
    return { data: null, error: null };
  }

  then(resolve, reject) {
    this._executarSelect().then(resolve, reject);
  }
}


let ouvintes = [];

function sessaoAtual() {
  const bruta = localStorage.getItem(CHAVE_SESSAO);
  return bruta ? JSON.parse(bruta) : null;
}

function definirSessao(sessao) {
  if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  else localStorage.removeItem(CHAVE_SESSAO);
  ouvintes.forEach((cb) => cb("SIGNED_IN", sessao));
}

const auth = {
  async getSession() {
    return { data: { session: sessaoAtual() } };
  },
  onAuthStateChange(callback) {
    ouvintes.push(callback);
    return { data: { subscription: { unsubscribe: () => (ouvintes = ouvintes.filter((c) => c !== callback)) } } };
  },
  async signInWithPassword({ email, password }) {
    const db = carregarDB();
    const senhaCorreta = db.senhas[email];
    if (!senhaCorreta || senhaCorreta !== password) {
      return { error: { message: "Credenciais inválidas" } };
    }
    const usuario = db.usuarios.find((u) => u.email === email);
    definirSessao({ user: { id: usuario.id, email } });
    return { error: null };
  },
  async signOut() {
    definirSessao(null);
  },
};


const storage = {
  from() {
    return {
      async upload() {
        
        return { data: { path: "demo/audio.webm" }, error: null };
      },
    };
  },
};


const functions = {
  async invoke(nome, { body } = {}) {
    if (nome === "criar-aluno") {
      const db = carregarDB();
      const id = uid("aluno");
      const senhaTemporaria = Math.random().toString(36).slice(2, 10);
      db.usuarios.push({
        id,
        nome: body.nome,
        email: body.email,
        tipo: "aluno",
        escola: body.escola ?? null,
        bairro: body.bairro ?? null,
        turma: "Turma A",
        criado_em: new Date().toISOString(),
      });
      db.senhas[body.email] = senhaTemporaria;
      salvarDB(db);
      return { data: { sucesso: true, senhaTemporaria, email: body.email }, error: null };
    }
    return { data: null, error: { message: "Função não implementada no modo demo" } };
  },
};


async function rpc(nome) {
  if (nome === "burnout_agregado_por_turma") {
    const db = carregarDB();
    const audiosRecentes = db.audios.filter(
      (a) => new Date(a.criado_em) >= new Date(Date.now() - 14 * 86400000)
    );
    const totalAlunos = db.usuarios.filter((u) => u.tipo === "aluno").length;
    return {
      data: [
        {
          turma: "Turma A",
          total_alunos: totalAlunos,
          gravacoes_ultimos_14d: audiosRecentes.length,
          queda_percentual: audiosRecentes.length === 0 ? 15 : 0,
        },
      ],
      error: null,
    };
  }

  if (nome === "burnout_emocional_por_escola") {
    const db = carregarDB();
    const PESOS = {
      motivado: -1, confiante: -1, tranquilo: -1, animado: -1,
      cansado: 1, ansioso: 1, desmotivado: 1, inseguro: 1,
      sobrecarregado: 2, estressado: 2,
    };

    const seteDataAtras = Date.now() - 7 * 86400000;
    const alunos = db.usuarios.filter((u) => u.tipo === "aluno" && u.escola);
    const escolas = [...new Set(alunos.map((a) => a.escola))];

    const resultado = escolas.map((escola) => {
      const alunosDaEscola = alunos.filter((a) => a.escola === escola);
      const idsAlunos = alunosDaEscola.map((a) => a.id);

      const checkinsRecentes = db.checkins_emocionais.filter(
        (c) => idsAlunos.includes(c.usuario_id) && new Date(c.criado_em).getTime() >= seteDataAtras
      );

      const pontuacoes = checkinsRecentes.map((c) =>
        c.sentimentos.reduce((soma, s) => soma + (PESOS[s] ?? 0), 0)
      );
      const media = pontuacoes.length
        ? pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length
        : 0;

      
      const indiceEstresse = Math.max(0, Math.min(100, Math.round(((media + 4) / 12) * 100)));

      return {
        escola,
        total_alunos: alunosDaEscola.length,
        checkins_7d: new Set(checkinsRecentes.map((c) => c.usuario_id)).size,
        indice_estresse: indiceEstresse,
      };
    });

    return { data: resultado, error: null };
  }

  return { data: null, error: { message: "RPC não implementada no modo demo" } };
}

export const mockSupabase = {
  from(tabela) {
    return new MockQuery(tabela);
  },
  auth,
  storage,
  functions,
  rpc,
};

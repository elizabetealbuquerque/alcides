import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function CadastroAlunos() {
  const [alunos, setAlunos] = useState([]);
  const [form, setForm] = useState({ nome: "", email: "", escola: "", bairro: "" });
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState("");

  async function carregarAlunos() {
    const { data } = await supabase
      .from("usuarios")
      .select("id, nome, email, escola, bairro, criado_em")
      .eq("tipo", "aluno")
      .order("criado_em", { ascending: false });
    setAlunos(data ?? []);
  }

  useEffect(() => {
    carregarAlunos();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem(null);
    setEnviando(true);

    const { data, error } = await supabase.functions.invoke("criar-aluno", {
      body: form,
    });

    setEnviando(false);

    if (error) {
      setErro("Não foi possível cadastrar. Verifique se o e-mail já não está em uso.");
      return;
    }

    setMensagem(
      `Aluno cadastrado! Senha temporária: ${data.senhaTemporaria}. Repasse com segurança, o aluno vai trocar no primeiro acesso.`
    );
    setForm({ nome: "", email: "", escola: "", bairro: "" });
    carregarAlunos();
  }

  return (
    <div>
      <p className="label-eyebrow mb-2">Matrícula controlada pela administração</p>
      <h1 className="mb-8 text-3xl font-bold">Cadastro de alunos</h1>

      <form onSubmit={handleSubmit} className="card mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-laranja-900/80">Nome completo</label>
          <input
            required
            className="input-field"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-laranja-900/80">E-mail</label>
          <input
            type="email"
            required
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-laranja-900/80">Escola de origem</label>
          <input
            className="input-field"
            value={form.escola}
            onChange={(e) => setForm({ ...form, escola: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-laranja-900/80">Bairro</label>
          <input
            className="input-field"
            value={form.bairro}
            onChange={(e) => setForm({ ...form, bairro: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          {erro && (
            <p className="mb-3 rounded-lg bg-brasa-600/10 px-3 py-2 text-sm text-brasa-600">
              {erro}
            </p>
          )}
          {mensagem && (
            <p className="mb-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-400">
              {mensagem}
            </p>
          )}
          <button type="submit" disabled={enviando} className="btn-primary">
            {enviando ? "Cadastrando..." : "Cadastrar aluno"}
          </button>
        </div>
      </form>

      <p className="label-eyebrow mb-3">
        Alunos cadastrados ({alunos.length})
      </p>
      <div className="space-y-2">
        {alunos.map((a) => (
          <div key={a.id} className="card flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{a.nome}</p>
              <p className="text-xs text-laranja-900/40">{a.email}</p>
            </div>
            <p className="text-xs text-laranja-900/40">
              {a.escola} {a.bairro && `· ${a.bairro}`}
            </p>
          </div>
        ))}
        {alunos.length === 0 && (
          <p className="text-sm text-laranja-900/40">Nenhum aluno cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}

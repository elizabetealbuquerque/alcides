// Edge Function: criar-aluno
// Roda no servidor do Supabase (não no navegador), então pode usar a
// SERVICE_ROLE_KEY com segurança para criar contas de alunos.
//
// Deploy: supabase functions deploy criar-aluno
// Chamada pelo frontend via: supabase.functions.invoke('criar-aluno', { body: {...} })
//
// Só quem já está autenticado como 'coordenador' pode chamar esta função
// (verificação feita abaixo antes de criar qualquer conta).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Método não permitido", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
  }

  // Cliente com o token de quem está chamando, só para checar o perfil
  const clienteChamador = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await clienteChamador.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
  }

  const { data: perfilChamador } = await clienteChamador
    .from("usuarios")
    .select("tipo")
    .eq("id", user.id)
    .single();

  if (perfilChamador?.tipo !== "coordenador") {
    return new Response(
      JSON.stringify({ error: "Só a administração pode cadastrar alunos" }),
      { status: 403 }
    );
  }

  const { nome, email, escola, bairro } = await req.json();

  if (!nome || !email) {
    return new Response(JSON.stringify({ error: "Nome e e-mail são obrigatórios" }), {
      status: 400,
    });
  }

  // Cliente com service role, para criar o usuário de fato
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const senhaTemporaria = crypto.randomUUID().slice(0, 10);

  const { data: novoUsuario, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senhaTemporaria,
    email_confirm: true,
  });

  if (erroAuth) {
    return new Response(JSON.stringify({ error: erroAuth.message }), { status: 400 });
  }

  const { error: erroPerfil } = await admin.from("usuarios").insert({
    id: novoUsuario.user.id,
    nome,
    email,
    tipo: "aluno",
    escola: escola ?? null,
    bairro: bairro ?? null,
  });

  if (erroPerfil) {
    return new Response(JSON.stringify({ error: erroPerfil.message }), { status: 400 });
  }

  return new Response(
    JSON.stringify({ sucesso: true, senhaTemporaria, email }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});

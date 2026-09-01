# Elo — Plataforma do Cursinho Popular Alcides Nascimento

## 🚀 Teste agora, sem esperar nada (modo demo)

Se o Supabase estiver indisponível ou você só quer ver o app rodando rápido:

```bash
npm install
cp .env.example .env
# o .env.example já vem com VITE_MODO_DEMO=true — não precisa mexer em nada
npm run dev
```

Abra `http://localhost:5173`. Como os dados de exemplo foram removidos
desse pacote, é preciso cadastrar um usuário administrador diretamente no
banco antes do primeiro acesso (veja a seção de configuração abaixo).

Tudo funciona de verdade — gravação de áudio, transcrição ao vivo, "validação
por IA" (heurística simples, já que não há chave de API no modo demo),
diagnóstico, grupos, cadastro de aluno pela administração, painel de
burnout. Os dados ficam salvos só no seu navegador (localStorage) — feche
essa aba e reabra que continua tudo lá; se quiser resetar, é só limpar o
localStorage do site.

**Isso é só pra testar.** Quando o Supabase estiver disponível, siga a seção
abaixo pra rodar com o backend de verdade.

---



## Rodando com o backend de verdade (quando o Supabase estiver disponível)

MVP funcional, rodando 100% em camadas gratuitas (ver seção 12 da
especificação técnica). Passo a passo pra colocar no ar do zero, sem gastar
nada.

## 1. Criar o projeto no Supabase (gratuito, sem cartão)

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.
2. Vá em **SQL Editor** e cole o conteúdo inteiro de `supabase/schema.sql`. Rode.
3. Vá em **Storage** e crie um bucket chamado `audios` (pode ser privado).
4. Vá em **Project Settings > API** e copie a `Project URL` e a `anon public key`.

## 2. Criar a chave do Gemini (gratuita, sem cartão)

1. Acesse [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Crie uma API key. Isso já é suficiente para o free tier (Flash-Lite).

## 3. Configurar as variáveis de ambiente

```bash
cp .env.example .env
# edite o .env: mude VITE_MODO_DEMO para false, e preencha as chaves dos passos 1 e 2
```

## 4. Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

## 5. Criar o primeiro usuário administrador

O cadastro de administração não tem tela pública (por segurança — só quem já
é admin cadastra outros perfis). Para criar o **primeiro** admin:

1. No Supabase, vá em **Authentication > Users > Add user**, crie com e-mail/senha.
2. No **SQL Editor**, rode (trocando o e-mail e o UUID gerado):
   ```sql
   insert into usuarios (id, nome, email, tipo)
   values ('UUID-DO-USUARIO-CRIADO', 'Nome da Coordenação', 'email@cursinho.org', 'coordenador');
   ```
3. Faça login em `/login/admin` com esse e-mail/senha.

A partir daí, a própria administração cadastra os alunos pela tela
`/admin/alunos` (isso já cria a conta do aluno automaticamente via Edge Function).

## 6. Publicar a Edge Function de cadastro de alunos

O cadastro de alunos pela administração depende de uma Edge Function (roda no
servidor do Supabase, não expõe nenhuma chave sensível no navegador):

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF
npx supabase functions deploy criar-aluno
```

## 7. Deploy do frontend (gratuito)

Suba este repositório no GitHub e conecte no [Vercel](https://vercel.com) ou
[Netlify](https://netlify.com) (free tier). Configure as mesmas variáveis de
ambiente do `.env` no painel do serviço escolhido.

## 8. Manter o projeto Supabase sempre acordado

O plano Free do Supabase pausa após 7 dias sem tráfego. Configure um ping
gratuito em [cron-job.org](https://cron-job.org) ou
[UptimeRobot](https://uptimerobot.com) apontando pra URL do seu projeto, a
cada poucos dias.

---

## Estrutura do projeto

```
src/
  lib/
    supabaseClient.js   → conexão com o Supabase
    transcricao.js       → transcrição de áudio (Web Speech API, trocável)
    validacaoIA.js       → validação por IA (Gemini free tier, trocável)
  contexts/
    AuthContext.jsx       → sessão + perfil (aluno/coordenador)
  components/
    Layout.jsx             → navegação lateral por perfil
    RotaProtegida.jsx      → protege rotas por tipo de usuário
  pages/
    Home.jsx, LoginAluno.jsx, LoginAdmin.jsx
    aluno/    → dashboard, gravação, diagnóstico, grupos, estratégias, bolsas
    admin/    → dashboard, cadastro de alunos, painel de burnout
supabase/
  schema.sql               → todas as tabelas + RLS + função de burnout agregado
  functions/criar-aluno/   → Edge Function para cadastro seguro de alunos
```

## Migrando para a versão paga (quando o projeto for aprovado)

Só troque a implementação interna de duas funções — a assinatura não muda:

- `src/lib/transcricao.js` → trocar Web Speech API por Whisper/GPT-4o Transcribe.
- `src/lib/validacaoIA.js` → trocar Gemini free tier por Claude Haiku (Anthropic).

O resto do app (schema, telas, fluxos) continua exatamente igual.

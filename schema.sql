
create extension if not exists "uuid-ossp";

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  tipo text not null check (tipo in ('aluno', 'coordenador')),
  escola text,
  bairro text,
  turma text default 'Turma Única',
  criado_em timestamptz default now()
);

create table topicos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  materia text not null,
  competencia_enem text
);

create table pre_requisitos (
  topico_id uuid references topicos(id) on delete cascade,
  pre_requisito_id uuid references topicos(id) on delete cascade,
  primary key (topico_id, pre_requisito_id)
);

create table topicos_conceitos_chave (
  id uuid primary key default uuid_generate_v4(),
  topico_id uuid references topicos(id) on delete cascade,
  conceito text not null
);

create table questoes_simulado (
  id uuid primary key default uuid_generate_v4(),
  simulado_id uuid not null,
  topico_id uuid references topicos(id),
  enunciado text
);

create table respostas_aluno (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  questao_id uuid references questoes_simulado(id) on delete cascade,
  acertou boolean not null,
  respondido_em timestamptz default now()
);

create table diagnosticos (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  topico_id uuid references topicos(id) on delete cascade,
  nivel_dominio float not null,
  gerado_em timestamptz default now(),
  unique (usuario_id, topico_id)
);

create table audios (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  topico_id uuid references topicos(id),
  materia text not null,
  assunto text not null,
  url_audio text not null,
  url_audio_caminho text,
  duracao_segundos int,
  transcricao text,
  status_validacao text default 'pendente' check (status_validacao in ('pendente','aprovado','requer_revisao','reprovado')),
  feedback_ia text,
  compartilhado boolean default false,
  reproducoes int not null default 0,
  pontuacao_qualidade int,
  criado_em timestamptz default now()
);

create table revisoes_agendadas (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  materia text not null,
  assunto text not null,
  audio_original_id uuid references audios(id) on delete cascade,
  intervalo_dias int not null default 3,
  data_agendada date not null,
  status text not null default 'pendente' check (status in ('pendente','concluida')),
  criado_em timestamptz default now()
);

create table respostas_reflexivas (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  materia text not null,
  assunto text not null,
  pergunta text not null,
  url_audio text,
  criado_em timestamptz default now()
);

create table playlist_concluida (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  data date not null default current_date,
  item_indice int not null,
  criado_em timestamptz default now(),
  unique (usuario_id, data, item_indice)
);

create table solicitacoes_audio (
  id uuid primary key default uuid_generate_v4(),
  solicitante_id uuid references usuarios(id) on delete cascade,
  solicitante_nome text not null,
  audio_id uuid references audios(id) on delete cascade,
  audio_dono_id uuid references usuarios(id) on delete cascade,
  audio_dono_nome text not null,
  audio_materia text,
  audio_assunto text,
  status text default 'pendente' check (status in ('pendente','compartilhado','recusado')),
  criado_em timestamptz default now()
);

create table mensagens_chat (
  id uuid primary key default uuid_generate_v4(),
  solicitacao_id uuid references solicitacoes_audio(id) on delete cascade,
  remetente_id uuid references usuarios(id) on delete cascade,
  remetente_nome text not null,
  texto text not null,
  audio_id uuid references audios(id),
  enviado_em timestamptz default now()
);

create table checkins_emocionais (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  sentimentos text[] not null,
  data date not null default current_date,
  criado_em timestamptz default now(),
  unique (usuario_id, data)
);

create table estrategias_prova (
  id uuid primary key default uuid_generate_v4(),
  competencia_enem text,
  titulo text not null,
  macete text,
  questao_enunciado text,
  questao_alternativas jsonb default '[]',
  questao_gabarito text,
  questao_explicacao text
);

create table burnout_sinais (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id) on delete cascade,
  frequencia_gravacoes float,
  tom_medio float,
  calculado_em timestamptz default now()
);

create table notas_corte (
  id uuid primary key default uuid_generate_v4(),
  programa text check (programa in ('sisu','prouni','fies')),
  curso text not null,
  universidade_sigla text not null,
  universidade_nome text not null,
  cidade text,
  estado text,
  nota_corte_ultima float,
  ano int,
  perfis text[] default '{}'
);

create or replace function burnout_agregado_por_turma()
returns table (
  turma text,
  total_alunos bigint,
  gravacoes_ultimos_14d bigint,
  queda_percentual int
) language sql security definer as $$
  with atual as (
    select u.turma, count(a.id) as gravacoes
    from usuarios u
    left join audios a
      on a.usuario_id = u.id and a.criado_em >= now() - interval '14 days'
    where u.tipo = 'aluno'
    group by u.turma
  ),
  anterior as (
    select u.turma, count(a.id) as gravacoes
    from usuarios u
    left join audios a
      on a.usuario_id = u.id
      and a.criado_em >= now() - interval '28 days'
      and a.criado_em < now() - interval '14 days'
    where u.tipo = 'aluno'
    group by u.turma
  ),
  total as (
    select turma, count(*) as total_alunos
    from usuarios where tipo = 'aluno'
    group by turma
  )
  select
    t.turma,
    t.total_alunos,
    coalesce(at.gravacoes, 0),
    case
      when coalesce(an.gravacoes, 0) = 0 then 0
      else round(100.0 * (an.gravacoes - at.gravacoes) / an.gravacoes)::int
    end as queda_percentual
  from total t
  left join atual at on at.turma = t.turma
  left join anterior an on an.turma = t.turma;
$$;

create or replace function burnout_emocional_por_escola()
returns table (
  escola text,
  total_alunos bigint,
  checkins_7d bigint,
  indice_estresse int
) language sql security definer as $$
  with pesos_sentimento (sentimento, peso) as (
    values
      ('motivado', -1), ('confiante', -1), ('tranquilo', -1), ('animado', -1),
      ('cansado', 1), ('ansioso', 1), ('desmotivado', 1), ('inseguro', 1),
      ('sobrecarregado', 2), ('estressado', 2)
  ),
  checkins_recentes as (
    select c.usuario_id, u.escola,
      (select coalesce(sum(p.peso), 0) from unnest(c.sentimentos) s join pesos_sentimento p on p.sentimento = s) as pontuacao
    from checkins_emocionais c
    join usuarios u on u.id = c.usuario_id
    where c.criado_em >= now() - interval '7 days'
      and u.tipo = 'aluno'
  ),
  totais as (
    select escola, count(*) as total_alunos
    from usuarios
    where tipo = 'aluno' and escola is not null
    group by escola
  )
  select
    t.escola,
    t.total_alunos,
    count(distinct c.usuario_id) as checkins_7d,
    greatest(0, least(100, round(((coalesce(avg(c.pontuacao), 0) + 4) / 12) * 100)::int)) as indice_estresse
  from totais t
  left join checkins_recentes c on c.escola = t.escola
  group by t.escola, t.total_alunos;
$$;

alter table usuarios enable row level security;
alter table audios enable row level security;
alter table diagnosticos enable row level security;
alter table solicitacoes_audio enable row level security;
alter table mensagens_chat enable row level security;
alter table burnout_sinais enable row level security;

create policy "usuario le proprio perfil" on usuarios
  for select using (auth.uid() = id);
create policy "coordenador le todos os perfis" on usuarios
  for select using (
    exists (select 1 from usuarios u where u.id = auth.uid() and u.tipo = 'coordenador')
  );

create policy "aluno ve proprios audios" on audios
  for select using (auth.uid() = usuario_id or compartilhado = true);
create policy "aluno grava proprio audio" on audios
  for insert with check (auth.uid() = usuario_id);
create policy "aluno atualiza proprio audio" on audios
  for update using (auth.uid() = usuario_id);
create policy "aluno exclui proprio audio" on audios
  for delete using (auth.uid() = usuario_id);

alter table revisoes_agendadas enable row level security;
create policy "aluno le proprias revisoes" on revisoes_agendadas
  for select using (auth.uid() = usuario_id);
create policy "aluno cria proprias revisoes" on revisoes_agendadas
  for insert with check (auth.uid() = usuario_id);
create policy "aluno atualiza proprias revisoes" on revisoes_agendadas
  for update using (auth.uid() = usuario_id);

alter table respostas_reflexivas enable row level security;
create policy "aluno le proprias respostas reflexivas" on respostas_reflexivas
  for select using (auth.uid() = usuario_id);
create policy "aluno cria proprias respostas reflexivas" on respostas_reflexivas
  for insert with check (auth.uid() = usuario_id);

alter table playlist_concluida enable row level security;
create policy "aluno le propria playlist" on playlist_concluida
  for select using (auth.uid() = usuario_id);
create policy "aluno marca propria playlist" on playlist_concluida
  for insert with check (auth.uid() = usuario_id);

create policy "aluno ve proprio diagnostico" on diagnosticos
  for select using (auth.uid() = usuario_id);

create policy "ninguem le burnout individual direto" on burnout_sinais
  for select using (false);

alter table checkins_emocionais enable row level security;
create policy "aluno le proprio checkin" on checkins_emocionais
  for select using (auth.uid() = usuario_id);
create policy "aluno grava proprio checkin" on checkins_emocionais
  for insert with check (auth.uid() = usuario_id);

create policy "participante le solicitacao" on solicitacoes_audio
  for select using (auth.uid() = solicitante_id or auth.uid() = audio_dono_id);
create policy "aluno cria solicitacao" on solicitacoes_audio
  for insert with check (auth.uid() = solicitante_id);
create policy "participante atualiza solicitacao" on solicitacoes_audio
  for update using (auth.uid() = solicitante_id or auth.uid() = audio_dono_id);

create policy "participante le mensagens" on mensagens_chat
  for select using (
    exists (
      select 1 from solicitacoes_audio s
      where s.id = mensagens_chat.solicitacao_id
        and (s.solicitante_id = auth.uid() or s.audio_dono_id = auth.uid())
    )
  );
create policy "participante envia mensagem" on mensagens_chat
  for insert with check (
    auth.uid() = remetente_id and
    exists (
      select 1 from solicitacoes_audio s
      where s.id = mensagens_chat.solicitacao_id
        and (s.solicitante_id = auth.uid() or s.audio_dono_id = auth.uid())
    )
  );


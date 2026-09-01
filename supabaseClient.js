import { createClient } from "@supabase/supabase-js";
import { mockSupabase } from "./mockSupabase";

export const modoDemo = import.meta.env.VITE_MODO_DEMO === "true";

let cliente;

if (modoDemo) {
  console.info(
    "[Elo] Rodando em MODO DEMO — dados salvos só no seu navegador (localStorage), sem depender do Supabase."
  );
  cliente = mockSupabase;
} else {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[Supabase] Variáveis de ambiente não configuradas. Copie .env.example para .env e preencha, ou ative VITE_MODO_DEMO=true para testar sem backend."
    );
  }

  cliente = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = cliente;

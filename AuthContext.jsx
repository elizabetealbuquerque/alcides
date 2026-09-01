import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null); 
  const [carregando, setCarregando] = useState(true);

  async function carregarPerfil(userId) {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[Auth] Erro ao carregar perfil:", error.message);
      setPerfil(null);
      return;
    }
    setPerfil(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      if (session?.user) carregarPerfil(session.user.id);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessao(session);
        if (session?.user) {
          carregarPerfil(session.user.id);
        } else {
          setPerfil(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function entrar(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    return { error };
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  const value = {
    sessao,
    perfil, 
    carregando,
    entrar,
    sair,
    ehAdmin: perfil?.tipo === "coordenador",
    ehAluno: perfil?.tipo === "aluno",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RotaProtegida({ perfilExigido, children }) {
  const { sessao, perfil, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-creme-50 text-laranja-900/60">
        Carregando...
      </div>
    );
  }

  if (!sessao) {
    return (
      <Navigate to={perfilExigido === "coordenador" ? "/login/admin" : "/login/aluno"} replace />
    );
  }

  if (perfilExigido && perfil?.tipo !== perfilExigido) {
    return <Navigate to="/" replace />;
  }

  return children;
}

import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function DashboardAdmin() {
  const { perfil } = useAuth();

  return (
    <div>
      <p className="label-eyebrow mb-2">Administração</p>
      <h1 className="mb-8 text-3xl font-bold">Olá, {perfil?.nome?.split(" ")[0]}</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link to="/admin/alunos" className="card group transition-colors hover:border-laranja-600">
          <h2 className="text-xl font-bold group-hover:text-laranja-700">
            Cadastro de alunos
          </h2>
        </Link>

        <Link to="/admin/burnout" className="card group transition-colors hover:border-ouro-500">
          <h2 className="text-xl font-bold group-hover:text-ouro-600">
            Termômetro
          </h2>
        </Link>
      </div>
    </div>
  );
}

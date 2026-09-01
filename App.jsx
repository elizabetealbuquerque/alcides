import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import RotaProtegida from "./components/RotaProtegida";
import Layout from "./components/Layout";

import Home from "./pages/Home";
import LoginAluno from "./pages/LoginAluno";
import LoginAdmin from "./pages/LoginAdmin";

import DashboardAluno from "./pages/aluno/DashboardAluno";
import GravarAudio from "./pages/aluno/GravarAudio";
import Biblioteca from "./pages/aluno/Biblioteca";
import Diagnostico from "./pages/aluno/Diagnostico";
import MapaConhecimento from "./pages/aluno/MapaConhecimento";
import Pedidos from "./pages/aluno/Pedidos";
import Estrategias from "./pages/aluno/Estrategias";
import MapaBolsas from "./pages/aluno/MapaBolsas";

import DashboardAdmin from "./pages/admin/DashboardAdmin";
import CadastroAlunos from "./pages/admin/CadastroAlunos";
import PainelBurnout from "./pages/admin/PainelBurnout";
import MapaConhecimentoAdmin from "./pages/admin/MapaConhecimentoAdmin";

function ComLayout({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login/aluno" element={<LoginAluno />} />
          <Route path="/login/admin" element={<LoginAdmin />} />

          <Route
            path="/aluno"
            element={
              <RotaProtegida perfilExigido="aluno">
                <ComLayout>
                  <DashboardAluno />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/aluno/gravar"
            element={
              <RotaProtegida perfilExigido="aluno">
                <ComLayout>
                  <GravarAudio />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/aluno/biblioteca"
            element={
              <RotaProtegida perfilExigido="aluno">
                <ComLayout>
                  <Biblioteca />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/aluno/diagnostico"
            element={
              <RotaProtegida perfilExigido="aluno">
                <ComLayout>
                  <Diagnostico />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/aluno/mapa"
            element={
              <RotaProtegida perfilExigido="aluno">
                <ComLayout>
                  <MapaConhecimento />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/aluno/pedidos"
            element={
              <RotaProtegida perfilExigido="aluno">
                <ComLayout>
                  <Pedidos />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/aluno/estrategias"
            element={
              <RotaProtegida perfilExigido="aluno">
                <ComLayout>
                  <Estrategias />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/aluno/bolsas"
            element={
              <RotaProtegida perfilExigido="aluno">
                <ComLayout>
                  <MapaBolsas />
                </ComLayout>
              </RotaProtegida>
            }
          />

          <Route
            path="/admin"
            element={
              <RotaProtegida perfilExigido="coordenador">
                <ComLayout>
                  <DashboardAdmin />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/admin/alunos"
            element={
              <RotaProtegida perfilExigido="coordenador">
                <ComLayout>
                  <CadastroAlunos />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/admin/burnout"
            element={
              <RotaProtegida perfilExigido="coordenador">
                <ComLayout>
                  <PainelBurnout />
                </ComLayout>
              </RotaProtegida>
            }
          />
          <Route
            path="/admin/mapa"
            element={
              <RotaProtegida perfilExigido="coordenador">
                <ComLayout>
                  <MapaConhecimentoAdmin />
                </ComLayout>
              </RotaProtegida>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

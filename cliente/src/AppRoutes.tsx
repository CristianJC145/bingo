import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import BingoCardGeneratorRoutes from "./modules/bingoCardGenerator/bingoCardGenerator.routes";
import BingoFiguresRoutes from "./modules/bingoFigures/bingoFigure.routes";
import BingoGameRoutes from "./modules/bingoGame/bingoGame.routes";
import BingoCustomizationRoutes from "./modules/bingoCustomization/bignoCustomization.routes";
import BingoPrintingRoutes from "./modules/bingoPrinting/bingoPrinting.routes";
import AdminUsersRoutes from "./modules/adminUsers/adminUsers.routes";
import SlotMachineRoutes from "./modules/slotMachine/slotMachine.routes";
import CardRegistryRoutes from "./modules/cardRegistry/cardRegistry.routes";
import ObsInterface from "./modules/bingoGame/components/ObsInterface";
import LoginPage from "./modules/auth/pages/LoginPage";
import { AuthProvider, useAuth } from "./modules/auth/context/AuthContext";
import { SlotLiveProvider } from "./modules/slotMachine/context/SlotLiveContext";
import { RequireAdmin } from "./modules/auth/components/RouteGuards";

const HomeRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/registro/cartones"} replace />;
};

/** El registro de cartones es exclusivo de los registradores; el admin va a su dashboard. */
const RequireRegistrar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

const LoginRoute: React.FC = () => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
};

const AppRouting: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SlotLiveProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/obs" element={<ObsInterface />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route path="/registro/*" element={<RequireRegistrar><CardRegistryRoutes /></RequireRegistrar>} />

          <Route path="resources/*" element={<RequireAdmin><BingoCardGeneratorRoutes /></RequireAdmin>} />
          <Route path="/figures/*" element={<RequireAdmin><BingoFiguresRoutes /></RequireAdmin>} />
          <Route path="/game/*" element={<RequireAdmin><BingoGameRoutes /></RequireAdmin>} />
          <Route path="/customization/*" element={<RequireAdmin><BingoCustomizationRoutes /></RequireAdmin>} />
          <Route path="/printing/*" element={<RequireAdmin><BingoPrintingRoutes /></RequireAdmin>} />
          <Route path="/admin/*" element={<RequireAdmin><AdminUsersRoutes /></RequireAdmin>} />
          <Route path="/sorteo/*" element={<RequireAdmin><SlotMachineRoutes /></RequireAdmin>} />

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
        </SlotLiveProvider>
      </AuthProvider>
    </Router>
  );
};
export default AppRouting;

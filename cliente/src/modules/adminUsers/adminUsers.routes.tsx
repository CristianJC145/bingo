import { Route, Routes } from "react-router-dom";
import BingoLayout from "../../shared/layout/BingoLayout";
import UsersPage from "./pages/UsersPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import AssignedCardsPage from "./pages/AssignedCardsPage";
import DashboardPage from "../dashboard/pages/DashboardPage";

const AdminUsersRoutes: React.FC = () => (
  <BingoLayout namePage={"/"} routePage={""}>
    <Routes>
      <Route path="/dashboard/*" element={<DashboardPage />} />
      <Route path="/usuarios/*" element={<UsersPage />} />
      <Route path="/asignaciones/*" element={<AssignmentsPage />} />
      <Route path="/cartones/*" element={<AssignedCardsPage />} />
    </Routes>
  </BingoLayout>
);

export default AdminUsersRoutes;

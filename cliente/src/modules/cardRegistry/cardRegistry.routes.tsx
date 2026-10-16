import { Route, Routes } from "react-router-dom";
import BingoLayout from "../../shared/layout/BingoLayout";
import CardRegistryPage from "./pages/CardRegistryPage";

const CardRegistryRoutes: React.FC = () => (
  <BingoLayout namePage={"/"} routePage={""}>
    <Routes>
      <Route path="/cartones/*" element={<CardRegistryPage />} />
    </Routes>
  </BingoLayout>
);

export default CardRegistryRoutes;

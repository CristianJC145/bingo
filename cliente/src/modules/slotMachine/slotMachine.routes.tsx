import { Route, Routes } from "react-router-dom";
import BingoLayout from "../../shared/layout/BingoLayout";
import SlotMachinePage from "./pages/SlotMachinePage";

const SlotMachineRoutes: React.FC = () => (
  <BingoLayout namePage={"/"} routePage={""}>
    <Routes>
      <Route path="/maquina/*" element={<SlotMachinePage />} />
    </Routes>
  </BingoLayout>
);

export default SlotMachineRoutes;

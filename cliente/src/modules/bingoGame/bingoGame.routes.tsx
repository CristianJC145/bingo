import { Route, Routes } from "react-router-dom";
import BingoGamePage from "./pages/bingoGamePage";
import GameSettingsPage from "./pages/GameSettingsPage";
import FreeGamePage from "./pages/FreeGamePage";
import WinnerHistoryPage from "./pages/WinnerHistoryPage";

import BingoLayout from "../../shared/layout/BingoLayout";
const BingoGameRoutes: React.FC = () => {
  return (
    <BingoLayout namePage={"/"} routePage={""}>
      <Routes>
        <Route path="/panel/*" element={<BingoGamePage />}></Route>
        <Route path="/libre/*" element={<FreeGamePage />}></Route>
        <Route path="/configuracion/*" element={<GameSettingsPage />}></Route>
        <Route path="/historial/*" element={<WinnerHistoryPage />}></Route>
      </Routes>
    </BingoLayout>
  );
};
export default BingoGameRoutes;

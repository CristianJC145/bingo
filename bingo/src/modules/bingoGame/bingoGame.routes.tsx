import { Route, Routes } from "react-router-dom";
import BingoGamePage from "./pages/bingoGamePage";

import BingoLayout from "../../shared/layout/BingoLayout";
import ObsInterface from "./components/ObsInterface";
const BingoGameRoutes: React.FC = () => {
  return (
    <BingoLayout namePage={"/"} routePage={""}>
      <Routes>
        <Route path="/panel/*" element={<BingoGamePage />}></Route>
        <Route path="/obs" element={<ObsInterface />} />
      </Routes>
    </BingoLayout>
  );
};
export default BingoGameRoutes;

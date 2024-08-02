import { Route, Routes } from "react-router-dom";
import BingoGamePage from "./pages/bingoGamePage";

import BingoLayout from "../../shared/layout/BingoLayout";
const BingoGameRoutes: React.FC = () => {
  return (
    <BingoLayout namePage={"/"} routePage={""}>
      <Routes>
        <Route path="/panel/*" element={<BingoGamePage />}></Route>
      </Routes>
    </BingoLayout>
  );
};
export default BingoGameRoutes;

import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BingoLayout from "../../shared/layout/BingoLayout";

const BingoPrintingRoutes: React.FC = () => {
  return (
    <BingoLayout namePage={"/"} routePage={""}>
      <Routes>
        <Route path="/orders/*" element={<HomePage />}></Route>
      </Routes>
    </BingoLayout>
  );
};
export default BingoPrintingRoutes;

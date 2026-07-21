import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BingoLayout from "../../shared/layout/BingoLayout";

const BingoCustomizationRoutes: React.FC = () => {
  return (
    <BingoLayout namePage={"/"} routePage={""}>
      <Routes>
        <Route path="/sound/*" element={<HomePage />}></Route>
      </Routes>
    </BingoLayout>
  );
};
export default BingoCustomizationRoutes;

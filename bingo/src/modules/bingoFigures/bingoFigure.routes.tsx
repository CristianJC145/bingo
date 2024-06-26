import { Route, Routes } from "react-router-dom";
import BingoFiguePage from "./pages/BingoFigurePage";

import BingoLayout from "../../shared/layout/BingoLayout";
const BingoFiguresRoutes: React.FC = () => {
    return (
        <BingoLayout namePage={"/"} routePage={""}>
            <Routes>
                <Route path="/administator*" element={<BingoFiguePage />}></Route>
            </Routes>
        </BingoLayout>
    )
}
export default BingoFiguresRoutes;
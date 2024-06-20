import { Route, Routes } from "react-router-dom";
import BingoFiguresPage from "./pages/bingoFiguresPage";
import BingoLayout from "../../shared/layout/BingoLayout";
const BingoGameRoutes: React.FC = () => {
    return (
        <BingoLayout namePage={"/"} routePage={""}>
            <Routes>
                <Route path="/figures/*" element={<BingoFiguresPage />}></Route>
            </Routes>
        </BingoLayout>
    )
}
export default BingoGameRoutes;
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BingoLayout from "../../shared/layout/BingoLayout";

const BingoCardGeneratorRoutes: React.FC = () => {
    return (
    <BingoLayout namePage={"/"} routePage={""}>
        <Routes>
            <Route path="/generate/*" element={<HomePage />}></Route>
        </Routes>
    </BingoLayout>
    )
}
export default BingoCardGeneratorRoutes;
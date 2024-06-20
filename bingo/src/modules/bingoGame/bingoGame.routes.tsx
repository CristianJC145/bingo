import { Route, Routes } from "react-router-dom";
import BingoGame from "./components/BingoGame";

const BingoGameRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/panel/*" element={<BingoGame />}></Route>
        </Routes>
    )
}
export default BingoGameRoutes;
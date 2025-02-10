import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import BingoCardGeneratorRoutes from "./modules/bingoCardGenerator/bingoCardGenerator.routes";
import BingoFiguresRoutes from "./modules/bingoFigures/bingoFigure.routes";
import BingoGameRoutes from "./modules/bingoGame/bingoGame.routes";
import BingoCustomizationRoutes from "./modules/bingoCustomization/bignoCustomization.routes";
import ObsInterface from "./modules/bingoGame/components/ObsInterface";
const AppRouting: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/game/panel" />}></Route>
        <Route
          path="resources/*"
          element={<BingoCardGeneratorRoutes />}
        ></Route>
        <Route path="/figures/*" element={<BingoFiguresRoutes />}></Route>
        <Route path="/game/*" element={<BingoGameRoutes />}></Route>
        <Route
          path="/customization/*"
          element={<BingoCustomizationRoutes />}
        ></Route>
        <Route path="/obs" element={<ObsInterface />} />
      </Routes>
    </Router>
  );
};
export default AppRouting;

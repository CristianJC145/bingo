import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './modules/bingoCardGenerator/HomePage';
import BingoGameRoutes from './modules/bingoGame/bingoGame.routes';
const AppRouting: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path='/*' element={<HomePage />}></Route>
                <Route path='/game/*' element={<BingoGameRoutes />}></Route>
            </Routes>
        </Router>
    )
}
export default AppRouting
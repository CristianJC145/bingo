import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './modules/bingo/HomePage';
const AppRouting: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path='/*' element={<HomePage />}></Route>
            </Routes>
        </Router>
    )
}
export default AppRouting
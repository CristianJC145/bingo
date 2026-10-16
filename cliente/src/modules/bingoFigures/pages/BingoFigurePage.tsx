import React from "react";
import styled from "styled-components";
import FigureManager from "../components/FiguresManager";

const BingoFiguresPage: React.FC = () => (
  <BingoFiguresStyle>
    <div className="page-intro"><span className="eyebrow">Reglas de la partida</span><h1 className="page-heading">Diseña cómo se gana.</h1><p className="page-description">Crea y administra los patrones que estarán disponibles durante cada sesión de bingo.</p></div>
    <FigureManager />
  </BingoFiguresStyle>
);

export default BingoFiguresPage;

const BingoFiguresStyle = styled.div`
  .page-intro { margin-bottom: 1.5rem; }
`;

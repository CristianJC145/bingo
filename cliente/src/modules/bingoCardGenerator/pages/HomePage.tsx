// src/pages/HomePage.tsx
import React, { useState, useEffect } from "react";
import {
  saveBingoCard,
  getBingoCards,
  getLastBingoCardId,
  setLastBingoCardId,
} from "../services/bingo.service";
import ExportToExcel from "../../../shared/components/ExportToExcel";
import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";
import { toast } from "react-toastify";

const HomePage: React.FC = () => {
  const [bingoCards, setBingoCards] = useState<number[][][]>([]);
  const [lastId, setLastId] = useState<number>(0);
  const [numCards, setNumCards] = useState<number>(1);

  useEffect(() => {
    const fetchData = async () => {
      const cards = await getBingoCards();
      setBingoCards(cards);
      const { value } = await getLastBingoCardId();
      setLastId(value);
    };
    fetchData();
  }, []);

  const generateBingoCards = async () => {
    const newCards = [];
    for (let i = 0; i < numCards; i++) {
      const newCard = generateBingoCard(lastId + i + 1);
      await saveBingoCard(newCard.card);
      newCards.push(newCard.card);
    }
    setBingoCards([...bingoCards, ...newCards]);
    setLastId(lastId + numCards);
    await setLastBingoCardId(lastId + numCards);
    toast.success(`¡Se ha generado ${numCards} cartones!`);
  };

  const generateBingoCard = (id: number): { id: number; card: number[][] } => {
    const card: number[][] = [];
    const columnRanges = [
      { start: 1, end: 15 },
      { start: 16, end: 30 },
      { start: 31, end: 45 },
      { start: 46, end: 60 },
      { start: 61, end: 75 },
    ];

    for (let col = 0; col < 5; col++) {
      const column: number[] = [];
      while (column.length < 5) {
        const num =
          Math.floor(
            Math.random() *
              (columnRanges[col].end - columnRanges[col].start + 1)
          ) + columnRanges[col].start;
        if (!column.includes(num)) {
          column.push(num);
        }
      }
      card.push(column);
    }

    card[2][2] = id;

    return { id, card };
  };

  return (
    <HomePageStyle>
      <div className="home-page">
        <div className="page-content">
          <h4 className="fw-bold text-white">Generador Cartones Bingo</h4>
          <input
            className="form-control py-2 my-4"
            type="number"
            value={numCards}
            onChange={(e) => setNumCards(parseInt(e.target.value, 10))}
          />
          <div className="btn-action">
            <AppButton onClick={generateBingoCards}>
              Generate Bingo Cards
            </AppButton>
            <ExportToExcel />
          </div>
        </div>
      </div>
    </HomePageStyle>
  );
};

export default HomePage;

const HomePageStyle = styled.div`
  .home-page {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .page-content {
    width: 400px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 16px;
    padding: 3rem 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    text-align: center;
    background-color: #1e1d49;
  }
  .btn-action {
    display: flex;
    margin-top: 1rem;
    justify-content: flex-end;
    gap: 1rem;
  }
`;

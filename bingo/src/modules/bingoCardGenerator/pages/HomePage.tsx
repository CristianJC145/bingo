// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { saveBingoCard, getBingoCards, getLastBingoCardId, setLastBingoCardId } from '../services/bingo.service';
import ExportToExcel from '../../../shared/components/ExportToExcel';

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
  };

  const generateBingoCard = (id: number): { id: number, card: number[][] } => {
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
        const num = Math.floor(Math.random() * (columnRanges[col].end - columnRanges[col].start + 1)) + columnRanges[col].start;
        if (!column.includes(num)) {
          column.push(num);
        }
      }
      card.push(column);
    }

    // Poner el ID en el lugar central
    card[2][2] = id;

    return { id, card };
  };

  return (
    <div className="home-page">
      <h1>Bingo Game</h1>
      <input type="number" value={numCards} onChange={(e) => setNumCards(parseInt(e.target.value, 10))} />
      <button onClick={generateBingoCards}>Generate Bingo Cards</button>
      <ExportToExcel />
    </div>
  );
};

export default HomePage;

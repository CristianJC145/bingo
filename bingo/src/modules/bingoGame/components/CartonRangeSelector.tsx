import React, { useState } from 'react';
import styled from 'styled-components';

interface CartonRangeSelectorProps {
  onSelectRange: (range: { start: number; end: number }) => void;
  onCardsRangue: boolean;
}

const CartonRangeSelector: React.FC<CartonRangeSelectorProps> = ({ onSelectRange, onCardsRangue }) => {
  const [start, setStart] = useState<number | ''>('');
  const [end, setEnd] = useState<number | ''>('');

  const handleRangeChange = () => {
    if (typeof start === 'number' && typeof end === 'number') {
      onSelectRange({ start, end });
    }
  };

  return (
    <CartonRangeSelectorStyle>
      {!onCardsRangue ? (
        <div className="carton-range-selector">
          <input
            type="number"
            value={start}
            onChange={(e) => setStart(Number(e.target.value))}
            placeholder="Desde"
            onBlur={handleRangeChange}
            className='form-input'
          />
          <input
            type="number"
            value={end}
            onChange={(e) => setEnd(Number(e.target.value))}
            placeholder="Hasta"
            onBlur={handleRangeChange}
            className='form-input'
          />
        </div>
      ) : (
        <textarea placeholder='Juegan' className='selector-manual'></textarea>
      )}
    </CartonRangeSelectorStyle>
  );
};

export default CartonRangeSelector;

const CartonRangeSelectorStyle = styled.div `
  .carton-range-selector {
    display: flex;
    flex-direction: column;
    gap: .5rem;
    margin-bottom: 1rem;
  }
  .selector-manual {
    color: #fff;
    background-color: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: 10px;
    min-height: 100px;
    padding: 1rem;
    resize: none;
  }
  .selector-manual:focus-visible {
    outline: unset;
  }
  .selector-manual::-webkit-scrollbar {
    width: 7px;
  }
  .selector-manual::-webkit-scrollbar-track {
    background-color: #9a98d1;
    border-radius: 4px;
  }
  .selector-manual::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.5);
  }
`

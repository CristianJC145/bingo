import React, { useState } from 'react';
import styled from 'styled-components';

interface CartonRangeSelectorProps {
  onSelectRange: (range: { start: number; end: number }) => void;
}

const CartonRangeSelector: React.FC<CartonRangeSelectorProps> = ({ onSelectRange }) => {
  const [start, setStart] = useState<number | ''>('');
  const [end, setEnd] = useState<number | ''>('');

  const handleRangeChange = () => {
    if (typeof start === 'number' && typeof end === 'number') {
      onSelectRange({ start, end });
    }
  };

  return (
    <CartonRangeSelectorStyle>
      <div className="carton-range-selector">
        <input
          type="number"
          value={start}
          onChange={(e) => setStart(Number(e.target.value))}
          placeholder="Desde"
          onBlur={handleRangeChange}
          className='form-control py-2'
        />
        <input
          type="number"
          value={end}
          onChange={(e) => setEnd(Number(e.target.value))}
          placeholder="Hasta"
          onBlur={handleRangeChange}
          className='form-control py-2'
        />
      </div>
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
`

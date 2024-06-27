import React, { useState } from 'react';

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
    <div className="carton-range-selector">
      <input
        type="number"
        value={start}
        onChange={(e) => setStart(Number(e.target.value))}
        placeholder="Desde Carton"
        onBlur={handleRangeChange}
      />
      <input
        type="number"
        value={end}
        onChange={(e) => setEnd(Number(e.target.value))}
        placeholder="Hasta Carton"
        onBlur={handleRangeChange}
      />
    </div>
  );
};

export default CartonRangeSelector;

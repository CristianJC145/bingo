// src/modules/BingoGame/FigureManager.tsx
import React, { useState, useEffect } from 'react';
import { getFigures, addFigure, updateFigure, deleteFigure } from '../services/bingoFigure.service';
import FigureEditor from './FigureEditor';

interface Figure {
    id: number;
    name: string;
    pattern: boolean[][];
}

const FigureManager: React.FC = () => {
    const [figures, setFigures] = useState<Figure[]>([]);
    const [editingFigure, setEditingFigure] = useState<Figure | null>(null);

    useEffect(() => {
        const fetchFigures = async () => {
            const data = await getFigures();
            setFigures(data);
        };
        fetchFigures();
    }, []);

    const handleSaveFigure = async (figure: { name: string, pattern: boolean[][] }) => {
        if (editingFigure) {
            const updatedFigure = await updateFigure(editingFigure.id, figure);
            setFigures(figures.map(f => f.id === editingFigure.id ? updatedFigure : f));
            setEditingFigure(null);
        } else {
            const newFigure = await addFigure(figure);
            setFigures([...figures, newFigure]);
        }
    };

    const handleEditFigure = (figure: Figure) => {
        setEditingFigure(figure);
    };

    const handleDeleteFigure = async (id: number) => {
        await deleteFigure(id);
        setFigures(figures.filter(f => f.id !== id));
    };

    return (
        <div>
            <h2>Manage Bingo Figures</h2>
            <FigureEditor onSave={handleSaveFigure} figure={editingFigure} />
            <div className="figure-list">
                {figures.map((figure) => (
                    <div key={figure.id} className="figure-item">
                        <h3>{figure.name}</h3>
                        <div className="figure-pattern">
                            {figure.pattern.map((row, rowIndex) => (
                                <div key={rowIndex} className="figure-row">
                                    {row.map((cell, cellIndex) => (
                                        <span key={cellIndex} className={cell ? 'cell filled' : 'cell'}>⬛</span>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <button onClick={() => handleEditFigure(figure)}>Edit</button>
                        <button onClick={() => handleDeleteFigure(figure.id)}>Delete</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FigureManager;

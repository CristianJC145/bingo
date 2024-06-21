import React, { useState, useEffect } from 'react';
import { deleteFigure } from '../services/bingoFigure.service';
import { GetAllFiguresService } from '../services/getAllFigures.service';
import AppModal from '../../../shared/components/AppModal';
import FigureEditor from './FigureEditor';
import styled from 'styled-components';
import AppButton from '../../../shared/components/Buttons/AppButton';
import AppDataTable from '../../../shared/components/DataTable/AppDataTable';

const getAllFiguresService = new GetAllFiguresService();

interface Figure {
  id: number;
  name: string;
  pattern: boolean[][];
}

const FigureManager: React.FC = () => {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [editingFigureId, setEditingFigureId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const columns = [
    {
      Header: 'Name',
      accessor: 'name',
      HeaderClassName: 'header-class',
      columnClassName: 'column-class',
    },
    {
      Header: 'Pattern',
      accessor: 'pattern',
      HeaderClassName: 'header-class',
      columnClassName: 'column-class',
      Cell: ({ value }: { value: string }) => (
        <div>
          {JSON.parse(value).flat().map((cell: boolean, index: number) => (
            <span key={index}>{cell ? '1' : '0'}</span>
          ))}
        </div>
      ),
    },
    {
      Header: 'Actions',
      HeaderClassName: 'header-class',
      columnClassName: 'column-class',
      Cell: ({ value }: { value: any }) => (
        <div>
          <button onClick={() => handleEdit(value.id)}>Edit</button>
          <button onClick={() => handleDeleteFigure(value.id)}>Delete</button>
        </div>
      ),
    },
  ];

  // useEffect(() => {
  //   const fetchFigures = async () => {
  //     const data = await getAllFiguresService.run();
  //     setFigures(data);
  //   };
  //   fetchFigures();
  // }, []);

  const handleOpenModal = (id?: number) => {
    if (id) setEditingFigureId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingFigureId(null);
    setIsModalOpen(false);
  };

  const handleSaveFigure = async () => {
    const data = await getAllFiguresService.run();
    setFigures(data);
  };
  const handleEdit = (id: number) => {
    // Handle edit logic
  };

  const handleDeleteFigure = async (id: number) => {
    await deleteFigure(id);
    setFigures(figures.filter(f => f.id !== id));
  };

  return (
    <FigureManagerStyle>
      <h4 className='fw-bold'>Administrar Figuras</h4>
      <AppButton className='figure-add' onClick={() => handleOpenModal()}>Añadir Figura</AppButton>
      <AppDataTable columns={columns} service={getAllFiguresService} />
      <div className="figure-list">
      </div>
      <AppModal title='Agregar Figura' isOpen={isModalOpen} onClose={handleCloseModal}>
          <FigureEditor id={editingFigureId!} onClose={handleCloseModal} onSave={handleSaveFigure} />
      </AppModal>
    </FigureManagerStyle>
  );
};

export default FigureManager;


const FigureManagerStyle = styled.div`
  .figure-add {
    width: 200px;
  }
  .cell {
    background-color: var(--color-primary);
    color: var(--color-primary);
    border-radius: 8px;
    display: inline-block;
    width: 60px;
    height: 50px;
    margin: 0.2rem; 
    cursor: pointer;
  }
  .cell.filled {
    background-color: var(--color-pastel-green);
    color: var(--color-pastel-green);
  }
  .cell:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
`

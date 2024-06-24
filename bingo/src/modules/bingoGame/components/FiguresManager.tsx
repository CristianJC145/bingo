import React, { useEffect, useState } from 'react';
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
  const [selectedFigure, setSelectedFigure] = useState<any | null>(null);
  const positions = [
    'B1', 'B2', 'B3', 'B4', 'B5',
    'I1', 'I2', 'I3', 'I4', 'I5',
    'N1', 'N2', 'N3', 'N4', 'N5',
    'G1', 'G2', 'G3', 'G4', 'G5',
    'O1', 'O2', 'O3', 'O4', 'O5'
  ];
  const columns = [
    {
      Header: 'Nombre',
      accessor: 'name',
      HeaderClassName: 'header-class',
      columnClassName: 'column-class',
    },
    ...positions.map(position => ({
      Header: position,
      accesor: position,
      HeaderClass: 'header-class',
      columnClassName: 'column-class',
      Cell: ({ value }: { value: { pattern: any } }) => {
        const pattern =  value.pattern;
        const letter = position[0];
        const index = parseInt(position[1]) - 1;
        const columnIndex = ['B', 'I', 'N', 'G', 'O'].indexOf(letter);
        console.log("columnIndex", columnIndex);
        const rowIndex = index;
        const values = pattern[rowIndex][columnIndex];
        return (
          <div>{values ? '1': '0'}</div>
        )
      }
    })),
    {
      Header: 'Actions',
      HeaderClassName: 'header-class',
      columnClassName: 'column-class',
      Cell: ({ value }: { value: any }) => (
        <div className='btn-actions'>
          <AppButton icon="check-square" className="bg-transparent" variant='dark' onClick={() => handleEdit(value.id)}></AppButton>
          <AppButton icon="fa-trash-alt" className="text-danger bg-transparent" onClick={() => handleDeleteFigure(value.id)}></AppButton>
        </div>
      ),
    },
  ];
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
    setFigures(data as any);
  };
  const handleEdit = (id: number) => {
    // Handle edit logic
  };

  const handleDeleteFigure = async (id: number) => {
    await deleteFigure(id);
    setFigures(figures.filter(f => f.id !== id));
  };
  const handleRowClick = (figure: any) => {
    setSelectedFigure(figure);
  };
  const fetchFigures = async () => {
    const result = await getAllFiguresService.run();
    setFigures(result.data);
    if (result.data.length > 0 ) {
      setSelectedFigure(result.data[0]);
    }
  }
  useEffect(()=> {
    fetchFigures();
  }, []);
  return (
    <FigureManagerStyle>
      <div className='figure-manager'>
        <div className='left-side'>
          <h4 className='fw-bold'>Administrar Figuras</h4>
          <AppButton className='figure-add' onClick={() => handleOpenModal()}>Añadir Figura</AppButton>
          <AppDataTable columns={columns} service={{ run: new GetAllFiguresService().run }} onRowClick={handleRowClick} />
        </div>
        <div className='rigth-side'>
          {selectedFigure && (
            <div className='side-table'>
              <div className='table-header'>
                <h4>B</h4>
                <h4>I</h4>
                <h4>N</h4>
                <h4>G</h4>
                <h4>O</h4>
              </div>
              <div className='table-content'>
                {selectedFigure.pattern.map((row: boolean[], rowIndex: number) =>
                  row.map((cell: boolean, cellIndex: number) => (
                    <div
                      key={`${rowIndex}-${cellIndex}`}
                      className={`${cell ? "cell filled" : "cell"}`}
                    />
                  ))
                )}
              </div>
              <h5 className='table-figure-name'>Figura: {selectedFigure.name}</h5>
            </div>
          )}
        </div>
        <AppModal title='Agregar Figura' isOpen={isModalOpen} onClose={handleCloseModal}>
            <FigureEditor id={editingFigureId!} onClose={handleCloseModal} onSave={handleSaveFigure} />
        </AppModal>
      </div>
    </FigureManagerStyle>
  );
};

export default FigureManager;


const FigureManagerStyle = styled.div`
  .figure-manager {
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 2rem;
  }
  .left-side {
    width: 50%;
  }
  .rigth-side {
    display: flex;
    width: 50%;
    justify-content: center;
    margin-top: 3rem;
  }
  .side-table {
    background-color: var(--color-primary);
    border-radius: 8px;
    padding: .5rem;
    height: fit-content;
  }
  .table-header {
    display: flex;
    justify-content: space-between;
    text-align: center; 
    color: var(--color-body);
  }
  .table-header h4 {
    width: 60px;
  }
  .table-content {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
  }
  .table-figure-name {
    color: var(--color-body);
    text-align: center;
    margin-top: .5rem;
    font-weight: 700;
  }
  .figure-add {
    width: 200px;
  }
  .cell {
    background-color: var(--color-body);
    color: var(--color-primary);
    border-radius: 8px;
    display: inline-block;
    width: 50px;
    height: 50px;
    margin: 0.2rem; 
  }
  .cell.filled {
    background-color: var(--color-pastel-green);
    color: var(--color-pastel-green);
    border: 4px dotted rgba(var(--color-body-rgb), 1)
  }
  .btn-actions {
    display: flex;
    gap: 1rem;  
  }
`

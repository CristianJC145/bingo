import React, { useEffect, useState } from 'react';
import { GetAllFiguresService } from '../services/getAllFigures.service';
import AppModal from '../../../shared/components/AppModal';
import FigureEditor from './FigureEditor';
import styled from 'styled-components';
import AppButton from '../../../shared/components/Buttons/AppButton';
import AppDataTable from '../../../shared/components/DataTable/AppDataTable';
import ConfirmAction from './ConfirmAction';
import AppIcon from '../../../shared/components/AppIcon';

const getAllFiguresService = new GetAllFiguresService();

const FigureManager: React.FC = () => {
  const [editingFigureId, setEditingFigureId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<any | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [figureDataDelete, setFigureDataDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
        const rowIndex = index;
        if (letter === 'N' && rowIndex === 2 && columnIndex === 2) {
          return <div>Free</div>;
        }
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
          <AppButton icon="check-square" className="bg-transparent" variant='light' onClick={() => handleOpenModal(value.id)}></AppButton>
          <AppButton icon="fa-trash-alt" className='text-danger' variant="transparent" onClick={() => handleDeleteFigure(value)}></AppButton>
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
  const handleCloseWarning = () => {
    setIsDeleteModalOpen(false);
  }

  const handleDeleteFigure = async (data: any) => {
    setIsDeleteModalOpen(true);
    setFigureDataDelete(data);
  };
  const handleRowClick = (figure: any) => {
    setSelectedFigure(figure);
    setSelectedRowId(figure.id)
  };
  const fetchFigures = async () => {
    const result = await getAllFiguresService.run();
    if (result.data.length > 0 ) {
      setSelectedFigure(result.data[0]);
      setSelectedRowId(result.data[0].id);
    }
  }
  const handleLoading = () => {
    setLoading(!loading);
  }
  useEffect(()=> {
    fetchFigures();
  }, [loading]);
  return (
    <FigureManagerStyle>
      <div className='figure-manager'>
        <div className='left-side'>
          <AppDataTable columns={columns} service={{ run: new GetAllFiguresService().run }} selectedRowId={selectedRowId} onRowClick={handleRowClick}>
            <AppButton className='figure-add' icon="plus" onClick={() => handleOpenModal()}>Añadir Figura</AppButton>
          </AppDataTable>
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
                      className={`${rowIndex === 2 && cellIndex === 2 ? "free" : cell ?  "cell filled" : "cell"}`}
                    >
                      {rowIndex === 2 && cellIndex === 2 ? (
                        <span>FREE</span>
                      ): cell ? (
                        <AppIcon icon="star"></AppIcon>
                      ):("")}
                    </div>
                  ))
                )}
              </div>
              <h5 className='table-figure-name'>Figura: {selectedFigure.name}</h5>
            </div>
          )}
        </div>
        <AppModal title='Agregar Figura' isOpen={isModalOpen} onClose={handleCloseModal}>
            <FigureEditor id={editingFigureId!} onClose={handleCloseModal} onSave={handleLoading}/>
        </AppModal>
        
        <AppModal title='¿Eliminar Figura?' isOpen={isDeleteModalOpen} onClose={handleCloseWarning}>
          <ConfirmAction figureData={figureDataDelete} onClose={handleCloseWarning} onSave={handleLoading}></ConfirmAction>
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
    gap: 2rem;
    max-width: 1500px;
    margin: 1rem auto;
    padding: var(--p-6) var(--p-6);
    border-radius: 12px;
    background-color: #1e1d49;
    box-shadow: 1px 1px 3px rgba(255, 255, 255, 0.05), 2px 1px 7px 3px rgba(0, 0, 0, 0.05);
  }
  .left-side {
    width: 65%;
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
  }
  .table-figure-name {
    color: var(--color-body);
    text-align: center;
    margin-top: .5rem;
    font-weight: 700;
  }
  .figure-add {
    width: 130px;
    margin-left: 1rem;
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
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    border: 1px dashed rgba(var(--color-body-rgb), 1)
  }
  .cell svg {
    font-size: 24px;
  }
  .free {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 18px
  }
  .btn-actions {
    display: flex;
    gap: 1rem;  
  }
  .selected {
    background: linear-gradient(130deg, #2c2a63, #1e1d49);
  }
  .selected td {
    border-bottom: none;
    border-top: none;
  }
`

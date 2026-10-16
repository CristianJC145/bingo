import React, { useEffect, useState } from "react";
import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import BingoCardVisual from "../../../shared/components/BingoCardVisual";
import AppModal from "../../../shared/components/AppModal";
import AppDataTable from "../../../shared/components/DataTable/AppDataTable";
import { GetAllFiguresService } from "../services/getAllFigures.service";
import FigureEditor from "./FigureEditor";
import ConfirmAction from "./ConfirmAction";

interface Figure { id: number; name: string; pattern: boolean[][]; }
const getAllFiguresService = new GetAllFiguresService();

const FigureManager: React.FC = () => {
  const [editingFigureId, setEditingFigureId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [figureToDelete, setFigureToDelete] = useState<Figure | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const positions = ["B1","B2","B3","B4","B5","I1","I2","I3","I4","I5","N1","N2","N3","N4","N5","G1","G2","G3","G4","G5","O1","O2","O3","O4","O5"];
  const columns = [
    { Header: "Nombre", accessor: "name", HeaderClassName: "header-class", columnClassName: "column-name" },
    ...positions.map((position) => ({
      Header: position,
      HeaderClassName: "pattern-header",
      columnClassName: "pattern-column",
      Cell: ({ value }: { value: unknown }) => {
        const figure = value as Figure;
        const columnIndex = ["B", "I", "N", "G", "O"].indexOf(position[0]);
        const rowIndex = Number(position[1]) - 1;
        if (columnIndex === 2 && rowIndex === 2) return <span className="table-free">•</span>;
        return <span className={`pattern-dot ${figure.pattern[rowIndex][columnIndex] ? "active" : ""}`} />;
      },
    })),
    { Header: "Acciones", columnClassName: "action-column", Cell: ({ value }: { value: unknown }) => { const figure = value as Figure; return <div className="row-actions"><AppButton icon="edit" variant="light" onClick={() => openEditor(figure.id)} ariaLabel={`Editar ${figure.name}`} /><AppButton icon="trash-alt" variant="transparent" className="delete-action" onClick={() => { setFigureToDelete(figure); setIsDeleteModalOpen(true); }} ariaLabel={`Eliminar ${figure.name}`} /></div>; } },
  ];

  const openEditor = (id?: number) => { setEditingFigureId(id ?? null); setIsModalOpen(true); };
  const closeEditor = () => { setEditingFigureId(null); setIsModalOpen(false); };
  const refresh = () => setRefreshVersion((version) => version + 1);

  useEffect(() => {
    getAllFiguresService.run().then((result) => {
      if (result.data.length > 0) {
        const active = result.data.find((figure: Figure) => figure.id === selectedRowId) ?? result.data[0];
        setSelectedFigure(active);
        setSelectedRowId(active.id);
      } else {
        setSelectedFigure(null);
        setSelectedRowId(null);
      }
    });
  }, [refreshVersion, selectedRowId]);

  return (
    <FigureManagerStyle>
      <section className="library-panel surface-card">
        <div className="panel-top"><div><span className="eyebrow">Biblioteca</span><h2>Patrones disponibles</h2></div><AppButton icon="plus" label="Nueva figura" onClick={() => openEditor()} /></div>
        <div className="table-shell"><AppDataTable columns={columns} service={getAllFiguresService} selectedRowId={selectedRowId} onRowClick={(value) => { const figure = value as Figure; setSelectedFigure(figure); setSelectedRowId(figure.id); }} /></div>
      </section>

      <aside className="preview-panel surface-card">
        <div className="preview-top"><div><span className="eyebrow">Vista previa</span><h2>{selectedFigure?.name ?? "Sin selección"}</h2></div>{selectedFigure && <span className="figure-id">ID {selectedFigure.id}</span>}</div>
        {selectedFigure ? <><div className="figure-card"><BingoCardVisual selected={selectedFigure.pattern} cardId={selectedFigure.id} label="Patrón ganador" compact /></div><p>Las casillas resaltadas deben coincidir con balotas cantadas para declarar un ganador.</p><AppButton variant="light" icon="edit" label="Editar esta figura" onClick={() => openEditor(selectedFigure.id)} /></> : <div className="empty-preview"><AppIcon icon="vector-square" /><span>Selecciona una figura para ver su patrón.</span></div>}
      </aside>

      <AppModal title={editingFigureId ? "Editar figura" : "Nueva figura"} isOpen={isModalOpen} onClose={closeEditor}><FigureEditor id={editingFigureId ?? undefined} onClose={closeEditor} onSave={refresh} /></AppModal>
      <AppModal title="Eliminar figura" isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>{figureToDelete && <ConfirmAction figureData={figureToDelete} onClose={() => setIsDeleteModalOpen(false)} onSave={refresh} />}</AppModal>
    </FigureManagerStyle>
  );
};

export default FigureManager;

const FigureManagerStyle = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1.25rem; align-items: start;
  .library-panel, .preview-panel { min-width: 0; padding: 1.25rem; }
  .panel-top, .preview-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; }
  h2 { margin: .35rem 0 0; color: var(--text-primary); font-size: 1.05rem; font-weight: 600; }
  .table-shell { min-width: 0; overflow: hidden; }
  .pattern-dot { display: block; width: 9px; height: 9px; margin: auto; background: #303746; border-radius: 3px; }
  .pattern-dot.active { background: var(--color-primary); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb),.1); }
  .table-free { display: block; color: var(--color-accent); text-align: center; }
  .row-actions { display: flex; gap: .35rem; }
  .row-actions .vs-btn { width: 32px; min-height: 32px; }
  .delete-action .vs-btn { color: var(--color-danger); }
  .figure-id { padding: .38rem .5rem; color: var(--text-muted); background: var(--bg-soft); border-radius: 8px; font-size: .58rem; font-weight: 700; }
  .figure-card { display: flex; justify-content: center; margin: 1.5rem 0; }
  .preview-panel > p { color: var(--text-secondary); font-size: .7rem; line-height: 1.55; }
  .preview-panel > div:last-child .vs-btn { width: 100%; margin-top: 1rem; }
  .empty-preview { display: flex; min-height: 240px; align-items: center; justify-content: center; flex-direction: column; gap: .8rem; color: var(--text-muted); text-align: center; }
  .empty-preview svg { font-size: 1.5rem; }
  @media (max-width: 1180px) { grid-template-columns: 1fr; .preview-panel { max-width: 420px; } }
`;

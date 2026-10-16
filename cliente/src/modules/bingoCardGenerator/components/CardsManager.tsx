import React, { useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppModal from "../../../shared/components/AppModal";
import AppDataTable from "../../../shared/components/DataTable/AppDataTable";
import { ListBingoCardsService } from "../services/listBingoCards.service";
import { BulkImportBingoCardsService } from "../services/bulkImportBingoCards.service";
import { parseBingoCardsExcel } from "../utils/parseBingoCardsExcel";
import CardEditor from "./CardEditor";
import ConfirmDeleteCard from "./ConfirmDeleteCard";

interface BingoCard { id: number; card: number[][]; }
interface CardsManagerProps { onImported?: () => void; }

const listBingoCardsService = new ListBingoCardsService();
const bulkImportBingoCardsService = new BulkImportBingoCardsService();
const positions = ["B1","B2","B3","B4","B5","I1","I2","I3","I4","I5","N1","N2","N3","N4","N5","G1","G2","G3","G4","G5","O1","O2","O3","O4","O5"];

const CardsManager: React.FC<CardsManagerProps> = ({ onImported }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [editingCard, setEditingCard] = useState<BingoCard | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<BingoCard | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const refresh = () => setRefreshVersion((version) => version + 1);

  const columns = [
    { Header: "N°", accessor: "id", HeaderClassName: "header-id", columnClassName: "column-id" },
    ...positions.map((position) => ({
      Header: position,
      HeaderClassName: "pattern-header",
      columnClassName: "pattern-column",
      Cell: ({ value }: { value: unknown }) => {
        const bingoCard = value as BingoCard;
        const columnIndex = ["B", "I", "N", "G", "O"].indexOf(position[0]);
        const rowIndex = Number(position[1]) - 1;
        if (columnIndex === 2 && rowIndex === 2) return <span className="table-free">•</span>;
        return <span>{bingoCard.card[columnIndex]?.[rowIndex]}</span>;
      },
    })),
    {
      Header: "Acciones",
      columnClassName: "action-column",
      Cell: ({ value }: { value: unknown }) => {
        const bingoCard = value as BingoCard;
        return (
          <div className="row-actions">
            <AppButton icon="edit" variant="light" onClick={() => { setEditingCard(bingoCard); setIsEditModalOpen(true); }} ariaLabel={`Editar cartón ${bingoCard.id}`} />
            <AppButton icon="trash-alt" variant="transparent" className="delete-action" onClick={() => { setCardToDelete(bingoCard); setIsDeleteModalOpen(true); }} ariaLabel={`Eliminar cartón ${bingoCard.id}`} />
          </div>
        );
      },
    },
  ];

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    try {
      const { cards, errors } = await parseBingoCardsExcel(file);

      if (cards.length === 0) {
        toast.error("No se encontraron cartones válidos en el archivo.");
        return;
      }

      const result = await bulkImportBingoCardsService.run(cards);
      toast.success(`${result.inserted} cartones importados. ${result.skipped} omitidos (ya existían).`);
      if (errors.length > 0) {
        toast.warn(`${errors.length} filas del archivo tenían errores y no se procesaron.`);
      }
      refresh();
      onImported?.();
    } catch (error) {
      console.error("Error importando cartones:", error);
      toast.error("No fue posible importar el archivo.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <CardsManagerStyle className="surface-card">
      <div className="panel-top">
        <div><span className="eyebrow">Inventario</span><h2>Cartones registrados</h2></div>
        <div className="panel-actions">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden-input" onChange={handleFileSelected} />
          <AppButton icon="cloud-upload-alt" variant="light" label={isImporting ? "Importando…" : "Importar Excel"} onClick={handleImportClick} disabled={isImporting} />
        </div>
      </div>
      <div className="table-shell">
        <AppDataTable
          key={refreshVersion}
          columns={columns}
          service={listBingoCardsService}
          searchPlaceholder="Buscar cartón por N°…"
        />
      </div>

      <AppModal title="Editar cartón" size="md" isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
        {editingCard && <CardEditor id={editingCard.id} initialCard={editingCard.card} onClose={() => setIsEditModalOpen(false)} onSave={refresh} />}
      </AppModal>
      <AppModal title="Eliminar cartón" isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        {cardToDelete && <ConfirmDeleteCard cardData={cardToDelete} onClose={() => setIsDeleteModalOpen(false)} onSave={refresh} />}
      </AppModal>
    </CardsManagerStyle>
  );
};

export default CardsManager;

const CardsManagerStyle = styled.section`
  padding: 1.25rem;
  .panel-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; }
  .eyebrow { color: var(--color-secondary); font-size: .64rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: .35rem 0 0; color: var(--text-primary); font-size: 1.05rem; font-weight: 600; }
  .panel-actions { display: flex; align-items: center; gap: .6rem; }
  .hidden-input { display: none; }
  .table-shell { min-width: 0; overflow: hidden; }
  .table-free { display: block; color: var(--color-accent); text-align: center; }
  .row-actions { display: flex; gap: .35rem; }
  .row-actions .vs-btn { width: 32px; min-height: 32px; }
  .delete-action .vs-btn { color: var(--color-danger); }
`;

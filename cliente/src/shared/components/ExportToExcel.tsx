// src/components/ExportToExcel.tsx
import React, { useState } from 'react';
import AppButton from './Buttons/AppButton';
import { getBingoCards } from '../../modules/bingoCardGenerator/services/bingo.service';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
interface BingoCard {
  id: number;
  card: number[][];
}

const ExportToExcel: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      const bingoCards: BingoCard[] = await getBingoCards();

      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Bingo Cards');

      // Encabezados de columna
      worksheet.addRow(['ID', 'Card']);

      bingoCards.forEach((bingoCard) => {
        worksheet.addRow([
          bingoCard.id,
          JSON.stringify(bingoCard.card)
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      saveAs(blob, 'bingoCards.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppButton variant="light" icon="clone" label={exporting ? "Preparando archivo…" : "Exportar inventario"} disabled={exporting} onClick={handleExportToExcel} />
  );
};

export default ExportToExcel;

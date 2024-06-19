import React, { useState } from 'react';
import AppButton from './Buttons/AppButton';
import { getBingoCards } from '../services/indexedDBService';
import { Workbook } from 'exceljs';
import { BingoCard } from '../utils/bingoCardGenerator';

const ExportToExcel: React.FC = () => {
  const [_exporting, setExporting] = useState(false);

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

      const blob = await workbook.xlsx.writeBuffer();
      const blobUrl = URL.createObjectURL(new Blob([blob]));

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'bingoCards.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppButton onClick={handleExportToExcel}>
      Export to Excel
    </AppButton>
  );
};

export default ExportToExcel;

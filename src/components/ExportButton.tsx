import React, { useState } from 'react';
import { Drink } from '../types';
import { Download, Loader } from 'lucide-react';

interface ExportButtonProps {
  drinks: Drink[];
}

export const ExportButton: React.FC<ExportButtonProps> = ({ drinks }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        drinks,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drinks-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-section">
      <button
        onClick={handleExport}
        disabled={isExporting || drinks.length === 0}
        className="btn-primary"
      >
        {isExporting ? <Loader size={16} className="spinner" /> : <Download size={16} />}
        Export JSON
      </button>
    </div>
  );
};

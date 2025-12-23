import type { ComparisonResult } from '../services/api';
import './ExportButton.css';

interface ExportButtonProps {
  results: ComparisonResult | null;
  selectedSupplier: string | null;
}

export default function ExportButton({ results, selectedSupplier }: ExportButtonProps) {
  const exportToCSV = () => {
    if (!results || !selectedSupplier) return;

    const supplier = selectedSupplier;
    const matches = results.matches[supplier] || [];
    const missing = results.missing_in_suppliers[supplier] || [];
    const extra = results.extra_in_suppliers[supplier] || [];
    const priceDiff = results.price_differences[supplier] || [];

    // Combine all data
    const allData: any[] = [];

    // Add matches
    matches.forEach(m => {
      allData.push({
        סטטוס: 'התאמה',
        'מספר ויזה (חברה)': m.company_trip?.trip_id || '',
        'תאריך (חברה)': m.company_trip?.date || '',
        'נוסעים (חברה)': m.company_trip?.passengers?.join(', ') || '',
        'מקור (חברה)': m.company_trip?.source || '',
        'יעד (חברה)': m.company_trip?.destination || '',
        'מחיר (חברה)': m.company_trip?.price || '',
        'מספר ויזה (ספק)': m.supplier_trip?.trip_id || '',
        'תאריך (ספק)': m.supplier_trip?.date || '',
        'מחיר (ספק)': m.supplier_trip?.price || '',
        'הבדל מחיר': '',
        'רמת ביטחון': m.confidence || ''
      });
    });

    // Add missing
    missing.forEach(t => {
      allData.push({
        סטטוס: 'קיים ברייד',
        'מספר ויזה (חברה)': t.trip_id || '',
        'תאריך (חברה)': t.date || '',
        'נוסעים (חברה)': t.passengers?.join(', ') || '',
        'מקור (חברה)': t.source || '',
        'יעד (חברה)': t.destination || '',
        'מחיר (חברה)': t.price || '',
        'מספר ויזה (ספק)': '',
        'תאריך (ספק)': '',
        'מחיר (ספק)': '',
        'הבדל מחיר': '',
        'רמת ביטחון': ''
      });
    });

    // Add extra
    extra.forEach(t => {
      allData.push({
        סטטוס: 'לא קיים ברייד',
        'מספר ויזה (חברה)': '',
        'תאריך (חברה)': '',
        'נוסעים (חברה)': '',
        'מקור (חברה)': '',
        'יעד (חברה)': '',
        'מחיר (חברה)': '',
        'מספר ויזה (ספק)': t.trip_id || '',
        'תאריך (ספק)': t.date || '',
        'מחיר (ספק)': t.price || '',
        'הבדל מחיר': '',
        'רמת ביטחון': ''
      });
    });

    // Add price differences
    priceDiff.forEach(pd => {
      allData.push({
        סטטוס: 'הבדל מחיר',
        'מספר ויזה (חברה)': pd.company_trip?.trip_id || '',
        'תאריך (חברה)': pd.company_trip?.date || '',
        'נוסעים (חברה)': pd.company_trip?.passengers?.join(', ') || '',
        'מקור (חברה)': pd.company_trip?.source || '',
        'יעד (חברה)': pd.company_trip?.destination || '',
        'מחיר (חברה)': pd.company_trip?.price || '',
        'מספר ויזה (ספק)': pd.supplier_trip?.trip_id || '',
        'תאריך (ספק)': pd.supplier_trip?.date || '',
        'מחיר (ספק)': pd.supplier_trip?.price || '',
        'הבדל מחיר': pd.price_difference || '',
        'רמת ביטחון': ''
      });
    });

    // Convert to CSV
    const headers = Object.keys(allData[0] || {});
    const csvRows = [
      headers.join(','),
      ...allData.map(row =>
        headers.map(header => {
          const value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value).replace(/"/g, '""');
          return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        }).join(',')
      )
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Hebrew support

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `השוואת_נסיעות_${supplier}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!results || !selectedSupplier) {
    return null;
  }

  return (
    <button className="export-button" onClick={exportToCSV}>
      ייצא ל-CSV
    </button>
  );
}


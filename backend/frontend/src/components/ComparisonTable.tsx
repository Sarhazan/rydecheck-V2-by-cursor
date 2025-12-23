import { useState, useMemo } from 'react';
import type { ComparisonResult } from '../services/api';
import ExportButton from './ExportButton';
import './ComparisonTable.css';

interface ComparisonTableProps {
  results: ComparisonResult | null;
}

export default function ComparisonTable({ results }: ComparisonTableProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'missing' | 'extra' | 'price_diff'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const suppliers = useMemo(() => {
    if (!results) return [];
    return Object.keys(results.matches);
  }, [results]);

  const filteredData = useMemo(() => {
    if (!results || !selectedSupplier) return [];

    const supplier = selectedSupplier;
    let data: any[] = [];

    if (filterStatus === 'matched' || filterStatus === 'all') {
      data = [...data, ...(results.matches[supplier] || []).map(m => ({
        ...m,
        status: 'matched',
        type: 'match'
      }))];
    }

    if (filterStatus === 'missing' || filterStatus === 'all') {
      data = [...data, ...(results.missing_in_suppliers[supplier] || []).map(t => ({
        company_trip: t,
        supplier_trip: null,
        status: 'missing',
        type: 'missing'
      }))];
    }

    if (filterStatus === 'extra' || filterStatus === 'all') {
      const extraTrips = results.extra_in_suppliers[supplier] || [];
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/5d9ec103-10d4-443b-9a3a-5fa1483b6bd5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ComparisonTable.tsx:43',message:'Processing extra trips',data:{supplier,extraTripsCount:extraTrips.length,firstExtra:extraTrips[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      data = [...data, ...extraTrips.map(t => ({
        company_trip: null,
        supplier_trip: t,
        status: 'extra',
        type: 'extra'
      }))];
    }

    if (filterStatus === 'price_diff' || filterStatus === 'all') {
      data = [...data, ...(results.price_differences[supplier] || []).map(pd => ({
        ...pd,
        status: 'price_diff',
        type: 'price_diff'
      }))];
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(item => {
        const company = item.company_trip;
        const supplier = item.supplier_trip;
        
        return (
          (company?.trip_id?.toLowerCase().includes(term)) ||
          (company?.passengers?.some((p: string) => p.toLowerCase().includes(term))) ||
          (company?.source?.toLowerCase().includes(term)) ||
          (company?.destination?.toLowerCase().includes(term)) ||
          (supplier?.trip_id?.toLowerCase().includes(term)) ||
          (supplier?.passengers?.some((p: string) => p.toLowerCase().includes(term))) ||
          (supplier?.source?.toLowerCase().includes(term)) ||
          (supplier?.destination?.toLowerCase().includes(term))
        );
      });
    }

    return data;
  }, [results, selectedSupplier, filterStatus, searchTerm]);

  if (!results) {
    return (
      <div className="comparison-table-container">
        <div className="no-results">אין תוצאות להצגה. העלה קבצים והשווה.</div>
      </div>
    );
  }

  return (
    <div className="comparison-table-container">
      <div className="table-controls">
        <div className="supplier-selector">
          <label>בחר ספק:</label>
          <select 
            value={selectedSupplier || ''} 
            onChange={(e) => setSelectedSupplier(e.target.value || null)}
          >
            <option value="">-- בחר ספק --</option>
            {suppliers.map(s => (
              <option key={s} value={s}>
                {s === 'supplier1' ? 'בון תור' : s === 'supplier2' ? 'גט' : s === 'supplier3' ? 'חורי' : s}
              </option>
            ))}
          </select>
        </div>
        
        {selectedSupplier && <ExportButton results={results} selectedSupplier={selectedSupplier} />}

        {selectedSupplier && (
          <div className="search-box">
            <input
              type="text"
              placeholder="חפש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {selectedSupplier && results.statistics[selectedSupplier] && (
        <div className="statistics-container">
          <div className="statistics">
            <div className="stat-item">
              <span className="stat-label">סה"כ נסיעות:</span>
              <span className="stat-value">{results.statistics[selectedSupplier].total_company_trips}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">התאמות:</span>
              <span className="stat-value success">{results.statistics[selectedSupplier].matched}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">קיים ברייד:</span>
              <span className="stat-value warning">{results.statistics[selectedSupplier].missing}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">לא קיים ברייד:</span>
              <span className="stat-value info">{results.statistics[selectedSupplier].extra}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">הבדלי מחירים:</span>
              <span className="stat-value error">{results.statistics[selectedSupplier].price_differences}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">אחוז התאמה:</span>
              <span className="stat-value">{results.statistics[selectedSupplier].match_rate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="tabs-container">
            <div className="tabs">
              <button 
                className={`tab ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                הכל
              </button>
              <button 
                className={`tab ${filterStatus === 'matched' ? 'active' : ''}`}
                onClick={() => setFilterStatus('matched')}
              >
                התאמות ({results.statistics[selectedSupplier].matched})
              </button>
              <button 
                className={`tab ${filterStatus === 'missing' ? 'active' : ''}`}
                onClick={() => setFilterStatus('missing')}
              >
                קיים ברייד ({results.statistics[selectedSupplier].missing})
              </button>
              <button 
                className={`tab ${filterStatus === 'extra' ? 'active' : ''}`}
                onClick={() => setFilterStatus('extra')}
              >
                לא קיים ברייד ({results.statistics[selectedSupplier].extra})
              </button>
              <button 
                className={`tab ${filterStatus === 'price_diff' ? 'active' : ''}`}
                onClick={() => setFilterStatus('price_diff')}
              >
                הבדלי מחירים ({results.statistics[selectedSupplier].price_differences})
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSupplier && (() => {
        // Check if showing only matched items
        const showOnlyMatched = filterStatus === 'matched';
        // For GETT (supplier2), show different columns in matched tab
        const isGett = selectedSupplier === 'supplier2';
        const columnCount = showOnlyMatched 
          ? (isGett ? 7 : 7)  // For matched: status, company_trip_id, date+time (supplier), date+time (company), source, destination, passengers
          : (isGett && filterStatus === 'extra' ? 6 : 11); // For unmatched GETT: fewer columns
        
        return (
          <div className="table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>סטטוס</th>
                  {showOnlyMatched && isGett ? (
                    <>
                      <th>מספר נסיעה (חברה)</th>
                      <th>תאריך ושעה (ספק)</th>
                      <th>תאריך ושעה (חברה)</th>
                      <th>מקור</th>
                      <th>יעד</th>
                      <th>שמות נוסעים</th>
                    </>
                  ) : filterStatus === 'extra' && isGett ? (
                    <>
                      <th>מספר ויזה (ספק)</th>
                      <th>תאריך ושעה</th>
                      <th>מקור</th>
                      <th>יעד</th>
                      <th>שמות נוסעים</th>
                    </>
                  ) : (
                    <>
                      {!showOnlyMatched && <th>R ברייד (שם ספק)</th>}
                      <th>מספר ויזה (חברה)</th>
                      <th>תאריך (חברה)</th>
                      <th>נוסעים (חברה)</th>
                      <th>מקור (חברה)</th>
                      <th>יעד (חברה)</th>
                      <th>מחיר (חברה)</th>
                      {!showOnlyMatched && (
                        <>
                          <th>מספר ויזה (ספק)</th>
                          <th>מחיר (ספק)</th>
                          <th>הבדל מחיר</th>
                        </>
                      )}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={columnCount} className="no-data">אין נתונים להצגה</td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => {
                    const company = item.company_trip;
                    const supplier = item.supplier_trip;
                    // For price differences, use the explicit prices if available, otherwise from trips
                    const companyPrice = item.company_price !== undefined ? item.company_price : (company?.price || 0);
                    const supplierPrice = item.supplier_price !== undefined ? item.supplier_price : (supplier?.price || 0);
                    const priceDiff = item.price_difference || (supplierPrice - companyPrice);

                    // Format date and time for GETT matched tab
                    const formatDateTime = (date: string, time: string) => {
                      if (!date) return '-';
                      const timeStr = time ? ` ${time}` : '';
                      return `${date}${timeStr}`;
                    };

                    return (
                      <tr key={idx} className={`status-${item.status}`}>
                        <td>
                          <span className={`status-badge ${item.status}`}>
                            {item.status === 'matched' ? '✓ התאמה' :
                             item.status === 'missing' ? '✗ קיים ברייד' :
                             item.status === 'extra' ? '+ לא קיים ברייד' :
                             '₪ מחיר'}
                          </span>
                        </td>
                        {showOnlyMatched && isGett ? (
                          <>
                            <td>{item.company_trip_id || company?.trip_id || '-'}</td>
                            <td>{formatDateTime(supplier?.date || '', supplier?.time || '')}</td>
                            <td>{formatDateTime(company?.date || '', company?.time || '')}</td>
                            <td>{supplier?.source || company?.source || '-'}</td>
                            <td>{supplier?.destination || company?.destination || '-'}</td>
                            <td>{supplier?.passengers?.join(', ') || company?.passengers?.join(', ') || '-'}</td>
                          </>
                        ) : filterStatus === 'extra' && isGett ? (
                          <>
                            <td>{supplier?.trip_id || '-'}</td>
                            <td>{formatDateTime(supplier?.date || '', supplier?.time || '')}</td>
                            <td>{supplier?.source || '-'}</td>
                            <td>{supplier?.destination || '-'}</td>
                            <td>{supplier?.passengers?.join(', ') || '-'}</td>
                          </>
                        ) : (
                          <>
                            {!showOnlyMatched && <td>{company?.supplier || '-'}</td>}
                            <td>{company?.trip_id || '-'}</td>
                            <td>{company?.date || '-'}</td>
                            <td>{company?.passengers?.join(', ') || '-'}</td>
                            <td>{company?.source || '-'}</td>
                            <td>{company?.destination || '-'}</td>
                            <td>{companyPrice > 0 ? `₪${companyPrice.toFixed(2)}` : '-'}</td>
                            {!showOnlyMatched && (
                              <>
                                <td>{supplier?.trip_id || '-'}</td>
                                <td>{supplierPrice > 0 ? `₪${supplierPrice.toFixed(2)}` : '-'}</td>
                                <td className={priceDiff > 0.01 ? 'price-higher' : priceDiff < -0.01 ? 'price-lower' : ''}>
                                  {Math.abs(priceDiff) > 0.01 ? `₪${priceDiff.toFixed(2)}` : '-'}
                                </td>
                              </>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}


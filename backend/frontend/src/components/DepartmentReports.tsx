import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { DepartmentAllocations, DepartmentSummary } from '../services/api';
import './DepartmentReports.css';

interface DepartmentReportsProps {
  departmentAllocations: DepartmentAllocations;
}

export default function DepartmentReports({ departmentAllocations }: DepartmentReportsProps) {
  const [summary, setSummary] = useState<DepartmentSummary | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailFormVisible, setEmailFormVisible] = useState(false);
  const [emailData, setEmailData] = useState({
    recipientEmail: '',
    senderEmail: '',
    senderPassword: '',
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
  });
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [departmentAllocations]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const result = await api.getDepartmentSummary(departmentAllocations);
      if (result.success) {
        const summaryData: DepartmentSummary = {
          departments: result.departments,
          unassigned: result.unassigned
        };
        setSummary(summaryData);
        if (!selectedDepartment && Object.keys(summaryData.departments || {}).length > 0) {
          setSelectedDepartment(Object.keys(summaryData.departments)[0]);
        }
      }
    } catch (err: any) {
      console.error('Error loading summary:', err);
      alert('שגיאה בטעינת סיכום המחלקות: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async (deptName: string) => {
    try {
      setLoading(true);
      const blob = await api.downloadDepartmentExcel(deptName, departmentAllocations);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `department_report_${deptName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('שגיאה ביצירת הדוח: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedDepartment || !emailData.recipientEmail || !emailData.senderEmail || !emailData.senderPassword) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      setEmailSending(true);
      setEmailMessage(null);
      
      await api.sendDepartmentEmail(
        emailData.recipientEmail,
        selectedDepartment,
        departmentAllocations,
        emailData.senderEmail,
        emailData.senderPassword,
        emailData.smtpServer,
        emailData.smtpPort
      );
      
      setEmailMessage('האימייל נשלח בהצלחה!');
      setEmailFormVisible(false);
      
      // Reset form after delay
      setTimeout(() => {
        setEmailMessage(null);
        setEmailData({
          recipientEmail: '',
          senderEmail: '',
          senderPassword: '',
          smtpServer: 'smtp.gmail.com',
          smtpPort: 587,
        });
      }, 3000);
    } catch (err: any) {
      setEmailMessage('שגיאה בשליחת האימייל: ' + err.message);
    } finally {
      setEmailSending(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="department-reports-container">
        <div className="loading">טוען נתונים...</div>
      </div>
    );
  }

  if (!summary || Object.keys(summary.departments).length === 0) {
    return null;
  }

  const departments = Object.keys(summary.departments);
  const selectedDeptData = selectedDepartment ? summary.departments[selectedDepartment] : null;

  return (
    <div className="department-reports-container">
      <h2>דוחות עלויות לפי מחלקה</h2>

      {emailMessage && (
        <div className={`email-message ${emailMessage.includes('שגיאה') ? 'error' : 'success'}`}>
          {emailMessage}
        </div>
      )}

      <div className="department-summary-table">
        <table>
          <thead>
            <tr>
              <th>מחלקה</th>
              <th>סה"כ עלות</th>
              <th>מספר נסיעות</th>
              <th>ממוצע עלות לנסיעה</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(deptName => {
              const dept = summary.departments[deptName];
              return (
                <tr 
                  key={deptName}
                  className={selectedDepartment === deptName ? 'selected' : ''}
                  onClick={() => setSelectedDepartment(deptName)}
                >
                  <td>{deptName}</td>
                  <td>₪{dept.total_cost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{dept.ride_count}</td>
                  <td>₪{dept.average_cost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>
                    <button
                      className="export-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadExcel(deptName);
                      }}
                      disabled={loading}
                    >
                      ייצא ל-Excel
                    </button>
                    <button
                      className="email-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDepartment(deptName);
                        setEmailFormVisible(true);
                      }}
                    >
                      שלח באימייל
                    </button>
                  </td>
                </tr>
              );
            })}
            
            {summary.unassigned.ride_count > 0 && (
              <tr className="unassigned">
                <td>לא משויך למחלקה</td>
                <td>₪{summary.unassigned.total_cost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>{summary.unassigned.ride_count}</td>
                <td>-</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedDeptData && (
        <div className="department-details">
          <h3>פירוט מחלקה: {selectedDepartment}</h3>
          <div className="dept-stats">
            <div className="stat-item">
              <span className="stat-label">סה"כ עלות:</span>
              <span className="stat-value">₪{selectedDeptData.total_cost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">מספר נסיעות:</span>
              <span className="stat-value">{selectedDeptData.ride_count}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">ממוצע עלות לנסיעה:</span>
              <span className="stat-value">₪{selectedDeptData.average_cost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {emailFormVisible && selectedDepartment && (
        <div className="email-form-modal">
          <div className="email-form">
            <h3>שליחת דוח באימייל - {selectedDepartment}</h3>
            <div className="form-group">
              <label>כתובת אימייל נמען:</label>
              <input
                type="email"
                value={emailData.recipientEmail}
                onChange={(e) => setEmailData({ ...emailData, recipientEmail: e.target.value })}
                placeholder="example@company.com"
              />
            </div>
            <div className="form-group">
              <label>כתובת אימייל שולח:</label>
              <input
                type="email"
                value={emailData.senderEmail}
                onChange={(e) => setEmailData({ ...emailData, senderEmail: e.target.value })}
                placeholder="sender@gmail.com"
              />
            </div>
            <div className="form-group">
              <label>סיסמת אימייל שולח:</label>
              <input
                type="password"
                value={emailData.senderPassword}
                onChange={(e) => setEmailData({ ...emailData, senderPassword: e.target.value })}
                placeholder="סיסמה"
              />
            </div>
            <div className="form-group">
              <label>שרת SMTP:</label>
              <input
                type="text"
                value={emailData.smtpServer}
                onChange={(e) => setEmailData({ ...emailData, smtpServer: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="form-group">
              <label>פורט SMTP:</label>
              <input
                type="number"
                value={emailData.smtpPort}
                onChange={(e) => setEmailData({ ...emailData, smtpPort: parseInt(e.target.value) || 587 })}
              />
            </div>
            <div className="form-actions">
              <button
                className="send-btn"
                onClick={handleSendEmail}
                disabled={emailSending}
              >
                {emailSending ? 'שולח...' : 'שלח'}
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setEmailFormVisible(false);
                  setEmailMessage(null);
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


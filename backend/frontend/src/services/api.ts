const API_BASE_URL = 'http://localhost:5000/api';

export interface UploadResponse {
  success: boolean;
  filename: string;
  rows: number;
  columns: string[];
  error?: string;
}

export interface ComparisonResult {
  company_trips: any[];
  matches: Record<string, any[]>;
  missing_in_suppliers: Record<string, any[]>;
  extra_in_suppliers: Record<string, any[]>;
  price_differences: Record<string, any[]>;
  statistics: Record<string, any>;
  department_allocations?: DepartmentAllocations;
}

export interface DepartmentAllocations {
  department_allocations: Record<string, DepartmentData>;
  ride_allocations: any[];
  unassigned: {
    total_cost: number;
    ride_count: number;
    rides: any[];
  };
}

export interface DepartmentData {
  total_cost: number;
  ride_count: number;
  rides: any[];
}

export interface DepartmentSummary {
  departments: Record<string, {
    total_cost: number;
    ride_count: number;
    average_cost: number;
  }>;
  unassigned: {
    total_cost: number;
    ride_count: number;
  };
}

export const api = {
  async uploadFile(file: File, type: 'company' | 'supplier1' | 'supplier2' | 'supplier3' | 'employee'): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  },

  async compareFiles(files: {
    company?: string;
    supplier1?: string;
    supplier2?: string;
    supplier3?: string;
    employee?: string;
  }): Promise<ComparisonResult> {
    const response = await fetch(`${API_BASE_URL}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Comparison failed');
    }

    const data = await response.json();
    // Handle both formats: { success: true, results: {...} } or direct ComparisonResult
    if (data.success && data.results) {
      const result: ComparisonResult = {
        ...data.results,
        department_allocations: data.department_allocations || undefined
      };
      return result;
    }
    return data;
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },

  async getDepartmentSummary(departmentAllocations: DepartmentAllocations): Promise<{ success: boolean } & DepartmentSummary> {
    const response = await fetch(`${API_BASE_URL}/reports/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ department_allocations: departmentAllocations }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get department summary');
    }

    return response.json();
  },

  async downloadDepartmentExcel(deptName: string, departmentAllocations: DepartmentAllocations): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/reports/departments/${encodeURIComponent(deptName)}/excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ department_allocations: departmentAllocations }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate Excel report');
    }

    return response.blob();
  },

  async sendDepartmentEmail(
    recipientEmail: string,
    departmentName: string,
    departmentAllocations: DepartmentAllocations,
    senderEmail: string,
    senderPassword: string,
    smtpServer?: string,
    smtpPort?: number
  ): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/reports/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_email: recipientEmail,
        department_name: departmentName,
        department_allocations: departmentAllocations,
        sender_email: senderEmail,
        sender_password: senderPassword,
        smtp_server: smtpServer,
        smtp_port: smtpPort,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    return response.json();
  },

  async loadDemoData(): Promise<{ success: boolean; message?: string; files?: Record<string, string> }> {
    const response = await fetch(`${API_BASE_URL}/load-demo-data`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to load demo data');
    }

    return response.json();
  },

  async clearDemoData(): Promise<{ success: boolean; message?: string; cleared_count?: number }> {
    const response = await fetch(`${API_BASE_URL}/clear-demo-data`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to clear demo data');
    }

    return response.json();
  },

};


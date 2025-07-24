import * as XLSX from 'xlsx';

export interface CompanyList {
  companies: string[];
  source: 'file' | 'manual';
}

export const parseCompaniesFromText = (text: string): string[] => {
  // Split by common delimiters and clean up
  const companies = text
    .split(/[,\n\r\t;]+/)
    .map(company => company.trim())
    .filter(company => company.length > 0)
    .map(company => {
      // Remove common prefixes/suffixes like Inc., Corp., LLC, etc.
      return company
        .replace(/\b(Inc\.?|Corp\.?|Corporation|LLC|Ltd\.?|Limited|Co\.?)\b/gi, '')
        .trim()
        .replace(/['"]/g, '') // Remove quotes
        .trim();
    })
    .filter(company => company.length > 0);

  // Remove duplicates
  return [...new Set(companies)];
};

export const parseCSVFile = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const companies: string[] = [];
        
        lines.forEach(line => {
          const cells = line.split(',').map(cell => cell.trim().replace(/['"]/g, ''));
          cells.forEach(cell => {
            if (cell && cell.length > 2) {
              companies.push(cell);
            }
          });
        });
        
        resolve(parseCompaniesFromText(companies.join(', ')));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const parseTXTFile = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(parseCompaniesFromText(text));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const parseExcelFile = (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const companies: string[] = [];
        
        // Process all worksheets
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Extract text from all cells
          jsonData.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach(cell => {
                if (cell && typeof cell === 'string' && cell.trim().length > 2) {
                  companies.push(cell.trim());
                }
              });
            }
          });
        });
        
        resolve(parseCompaniesFromText(companies.join(', ')));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
};

export const parseFile = async (file: File): Promise<string[]> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv':
      return parseCSVFile(file);
    case 'txt':
      return parseTXTFile(file);
    case 'xlsx':
    case 'xls':
      return parseExcelFile(file);
    default:
      throw new Error('Unsupported file type. Please upload a CSV, TXT, or Excel file.');
  }
};
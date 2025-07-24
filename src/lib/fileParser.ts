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

export const parseFile = async (file: File): Promise<string[]> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv':
      return parseCSVFile(file);
    case 'txt':
      return parseTXTFile(file);
    case 'xlsx':
    case 'xls':
      // For Excel files, we'll treat them as text for now
      // In a real implementation, you'd use a library like xlsx
      return parseTXTFile(file);
    default:
      throw new Error('Unsupported file type. Please upload a CSV, TXT, or Excel file.');
  }
};
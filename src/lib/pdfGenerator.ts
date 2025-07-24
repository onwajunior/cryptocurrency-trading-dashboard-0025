import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface AnalysisData {
  companies: any[];
  portfolio_summary?: {
    average_risk_level: string;
    diversification_score: number;
    overall_recommendations: string[];
    zscore_trend?: Array<{ year: number; score: number }>;
  };
  ai_analysis?: {
    status: string;
    analysis: string;
  };
  created_at: string;
}

export const generatePDF = async (analysisData: AnalysisData, assessmentName: string) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;
  
  // Helper function to add page break if needed
  const checkPageBreak = (height: number) => {
    if (yPosition + height > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
  };

  // Helper function to add wrapped text
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 10) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return lines.length * (fontSize * 0.35); // Return height used
  };

  // Title
  pdf.setFontSize(20);
  pdf.setFont(undefined, 'bold');
  pdf.text('Financial Risk Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Assessment name and date
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Assessment: ${assessmentName}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Generated: ${new Date(analysisData.created_at).toLocaleDateString()}`, 20, yPosition);
  yPosition += 15;

  // AI Analysis Section
  if (analysisData.ai_analysis) {
    checkPageBreak(30);
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('AI Financial Analysis', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    const aiHeight = addWrappedText(analysisData.ai_analysis.analysis, 20, yPosition, pageWidth - 40);
    yPosition += aiHeight + 10;
  }

  // Portfolio Summary Section
  if (analysisData.portfolio_summary) {
    checkPageBreak(40);
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('Portfolio Summary', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Average Risk Level: ${analysisData.portfolio_summary.average_risk_level}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Diversification Score: ${analysisData.portfolio_summary.diversification_score}`, 20, yPosition);
    yPosition += 10;

    if (analysisData.portfolio_summary.overall_recommendations && Array.isArray(analysisData.portfolio_summary.overall_recommendations) && analysisData.portfolio_summary.overall_recommendations.length > 0) {
      pdf.setFont(undefined, 'bold');
      pdf.text('Recommendations:', 20, yPosition);
      yPosition += 6;
      pdf.setFont(undefined, 'normal');
      
      analysisData.portfolio_summary.overall_recommendations.forEach((rec, index) => {
        checkPageBreak(8);
        const recHeight = addWrappedText(`• ${rec}`, 25, yPosition, pageWidth - 50);
        yPosition += recHeight + 2;
      });
    }
    yPosition += 10;
  }

  // Individual Company Analysis
  pdf.setFontSize(16);
  pdf.setFont(undefined, 'bold');
  checkPageBreak(20);
  pdf.text('Individual Company Analysis', 20, yPosition);
  yPosition += 15;

  analysisData.companies.forEach((company, index) => {
    checkPageBreak(50);
    
    // Company name
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text(`${index + 1}. ${company.name}`, 20, yPosition);
    yPosition += 8;

    // Basic info
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Overall Rating: ${company.overall_rating}`, 25, yPosition);
    yPosition += 6;
    pdf.text(`Risk Level: ${company.risk_level}`, 25, yPosition);
    yPosition += 6;
    
    if (company.altman_z_score) {
      pdf.text(`Altman Z-Score: ${company.altman_z_score.score} (${company.altman_z_score.zone})`, 25, yPosition);
      yPosition += 6;
      if (company.company_type) {
        pdf.text(`Company Type: ${company.company_type}`, 25, yPosition);
        yPosition += 6;
      }
    }
    yPosition += 5;

    // Financial Ratios
    if (company.financial_ratios) {
      checkPageBreak(30);
      pdf.setFont(undefined, 'bold');
      pdf.text('Financial Ratios:', 25, yPosition);
      yPosition += 6;
      pdf.setFont(undefined, 'normal');
      
      Object.entries(company.financial_ratios).forEach(([key, value]) => {
        checkPageBreak(6);
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        pdf.text(`${formattedKey}: ${value}`, 30, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // Risk Assessment
    if (company.risk_assessment) {
      checkPageBreak(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('Risk Assessment:', 25, yPosition);
      yPosition += 6;
      pdf.setFont(undefined, 'normal');
      
      Object.entries(company.risk_assessment).forEach(([key, value]) => {
        checkPageBreak(6);
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        pdf.text(`${formattedKey}: ${value}`, 30, yPosition);
        yPosition += 5;
      });
      yPosition += 5;
    }

    // Summary
    if (company.summary) {
      if (company.summary.strengths?.length > 0) {
        checkPageBreak(15);
        pdf.setFont(undefined, 'bold');
        pdf.text('Strengths:', 25, yPosition);
        yPosition += 6;
        pdf.setFont(undefined, 'normal');
        
        company.summary.strengths.forEach((strength: string) => {
          checkPageBreak(8);
          const strengthHeight = addWrappedText(`• ${strength}`, 30, yPosition, pageWidth - 60);
          yPosition += strengthHeight + 2;
        });
        yPosition += 3;
      }

      if (company.summary.weaknesses?.length > 0) {
        checkPageBreak(15);
        pdf.setFont(undefined, 'bold');
        pdf.text('Weaknesses:', 25, yPosition);
        yPosition += 6;
        pdf.setFont(undefined, 'normal');
        
        company.summary.weaknesses.forEach((weakness: string) => {
          checkPageBreak(8);
          const weaknessHeight = addWrappedText(`• ${weakness}`, 30, yPosition, pageWidth - 60);
          yPosition += weaknessHeight + 2;
        });
        yPosition += 3;
      }

      if (company.summary.recommendations?.length > 0) {
        checkPageBreak(15);
        pdf.setFont(undefined, 'bold');
        pdf.text('Recommendations:', 25, yPosition);
        yPosition += 6;
        pdf.setFont(undefined, 'normal');
        
        company.summary.recommendations.forEach((rec: string) => {
          checkPageBreak(8);
          const recHeight = addWrappedText(`• ${rec}`, 30, yPosition, pageWidth - 60);
          yPosition += recHeight + 2;
        });
      }
    }
    
    yPosition += 15; // Space between companies
  });

  // Save the PDF
  const fileName = `${assessmentName.replace(/[^a-z0-9]/gi, '_')}_analysis_report.pdf`;
  pdf.save(fileName);
};
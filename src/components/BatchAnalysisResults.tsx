import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Trash2, Download, Eye, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generatePDF } from "@/lib/pdfGenerator";

interface BatchAnalysisResultsProps {
  results: any;
  assessmentId: string;
  assessmentName?: string;
  onSave: () => void;
  onDelete: () => void;
  onViewDetails: (companyName: string) => void;
}

const BatchAnalysisResults = ({
  results,
  assessmentId,
  assessmentName,
  onSave,
  onDelete,
  onViewDetails
}: BatchAnalysisResultsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onSave();
      toast({
        title: "Assessment Saved",
        description: "Your risk assessment has been saved to the library."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save assessment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await supabase.from('assessments').delete().eq('id', assessmentId);
      onDelete();
      toast({
        title: "Assessment Deleted",
        description: "The risk assessment has been deleted."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assessment. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async () => {
    try {
      await generatePDF(results, assessmentName || 'Financial Analysis');
      toast({
        title: "PDF Generated",
        description: "The analysis report has been downloaded successfully."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'high':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'bg-green-500/20 text-green-400 hover:bg-green-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30';
      case 'high':
        return 'bg-red-500/20 text-red-400 hover:bg-red-500/30';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating?.toLowerCase()) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-orange-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getZScoreColor = (score: number, zone: string) => {
    if (zone?.toLowerCase() === 'safe' || score > 2.99) {
      return 'text-green-600';
    } else if (zone?.toLowerCase() === 'grey' || (score >= 1.8 && score <= 2.99)) {
      return 'text-yellow-600';
    } else {
      return 'text-red-600';
    }
  };

  if (!results.companies) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No analysis results available.</p>
          {results.analysis && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-left">
              <p className="text-sm whitespace-pre-wrap">{results.analysis}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="gradient-text">Quick Analysis Results</CardTitle>
              <p className="text-sm text-muted-foreground">
                Analysis completed on {results.analysis_date} • {results.companies.length} companies analyzed
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleDelete} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-primary">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save to Library'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Portfolio Summary */}
      {results.portfolio_summary && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <h4 className="font-medium mb-1">Companies Analyzed</h4>
                <p className="text-2xl font-bold text-primary">{results.companies.length}</p>
              </div>
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <h4 className="font-medium mb-1">Average Risk Level</h4>
                <Badge className={getRiskBadgeColor(results.portfolio_summary.average_risk_level)}>
                  {results.portfolio_summary.average_risk_level?.toUpperCase() || 'Unknown'}
                </Badge>
              </div>
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <h4 className="font-medium mb-1">Safe Zone Companies</h4>
                <p className="text-2xl font-bold text-green-600">
                  {results.companies.filter((c: any) => c.altman_z_score?.zone === 'safe').length}
                </p>
              </div>
            </div>
            {results.portfolio_summary.overall_recommendations && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Overall Recommendations</h4>
                <p className="text-sm text-muted-foreground">
                  {results.portfolio_summary.overall_recommendations}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Companies Summary Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Company Analysis Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quick overview of all analyzed companies. Click "View Details" for comprehensive analysis.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Overall Rating</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Z-Score</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Current Ratio</TableHead>
                <TableHead>ROE</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.companies.map((company: any, index: number) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${getRatingColor(company.overall_rating)}`}>
                      {company.overall_rating || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskBadgeColor(company.risk_level)}>
                      {company.risk_level || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${getZScoreColor(company.altman_z_score?.score, company.altman_z_score?.zone)}`}>
                      {company.altman_z_score?.score ? company.altman_z_score.score.toFixed(2) : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${
                      company.altman_z_score?.zone?.toLowerCase() === 'safe' 
                        ? 'bg-green-500/20 text-green-400' 
                        : company.altman_z_score?.zone?.toLowerCase() === 'grey'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {company.altman_z_score?.zone || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`${
                      company.key_ratios?.current > 1.5 
                        ? 'text-green-600' 
                        : company.key_ratios?.current > 1.0
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {company.key_ratios?.current ? company.key_ratios.current.toFixed(2) : 
                       company.liquidity_ratios?.current_ratio ? company.liquidity_ratios.current_ratio.toFixed(2) : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`${
                      (company.key_ratios?.roe || company.profitability_ratios?.roe) > 0.15 
                        ? 'text-green-600' 
                        : (company.key_ratios?.roe || company.profitability_ratios?.roe) > 0.05
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {company.key_ratios?.roe ? (company.key_ratios.roe * 100).toFixed(1) + '%' :
                       company.profitability_ratios?.roe ? (company.profitability_ratios.roe * 100).toFixed(1) + '%' : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(company.name)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* High Risk Companies */}
            <div className="p-4 border-l-4 border-red-500 bg-red-50/50 dark:bg-red-950/20 rounded-r-lg">
              <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">High Risk Companies</h4>
              <div className="space-y-1">
                {results.companies
                  .filter((c: any) => c.risk_level === 'high' || c.altman_z_score?.zone === 'distress')
                  .map((company: any, idx: number) => (
                    <p key={idx} className="text-sm text-muted-foreground">
                      {company.name} - {company.altman_z_score?.zone || 'High Risk'}
                    </p>
                  ))}
                {results.companies.filter((c: any) => c.risk_level === 'high' || c.altman_z_score?.zone === 'distress').length === 0 && (
                  <p className="text-sm text-muted-foreground">No high-risk companies identified</p>
                )}
              </div>
            </div>

            {/* Top Performers */}
            <div className="p-4 border-l-4 border-green-500 bg-green-50/50 dark:bg-green-950/20 rounded-r-lg">
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Top Performers</h4>
              <div className="space-y-1">
                {results.companies
                  .filter((c: any) => c.overall_rating === 'excellent' || c.altman_z_score?.zone === 'safe')
                  .slice(0, 3)
                  .map((company: any, idx: number) => (
                    <p key={idx} className="text-sm text-muted-foreground">
                      {company.name} - {company.overall_rating || 'Safe Zone'}
                    </p>
                  ))}
                {results.companies.filter((c: any) => c.overall_rating === 'excellent' || c.altman_z_score?.zone === 'safe').length === 0 && (
                  <p className="text-sm text-muted-foreground">No top performers identified</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchAnalysisResults;
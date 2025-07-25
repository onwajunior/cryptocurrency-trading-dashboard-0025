import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Save, Trash2, Download, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generatePDF } from "@/lib/pdfGenerator";
interface AnalysisResultsProps {
  results: any;
  assessmentId: string;
  assessmentName?: string;
  onSave: () => void;
  onDelete: () => void;
}
const AnalysisResults = ({
  results,
  assessmentId,
  assessmentName,
  onSave,
  onDelete
}: AnalysisResultsProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const {
    toast
  } = useToast();
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Assessment is already saved in the database via the edge function
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
  const getStatusBadgeStyle = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'success':
      case 'excellent':
      case 'safe':
      case 'safe zone':
        return 'bg-green-600 text-white hover:bg-green-700';
      case 'good':
      case 'low':
        return 'bg-green-400 text-white hover:bg-green-500';
      case 'medium':
      case 'fair':
      case 'grey':
      case 'grey zone':
        return 'bg-yellow-500 text-white hover:bg-yellow-600';
      case 'poor':
      case 'high':
        return 'bg-orange-500 text-white hover:bg-orange-600';
      case 'critical':
      case 'distress':
      case 'distress zone':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return 'bg-muted text-muted-foreground hover:bg-muted/80';
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
  if (!results.companies) {
    return <Card className="glass-card">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No analysis results available.</p>
          {results.analysis && <div className="mt-4 p-4 bg-muted rounded-lg text-left">
              <p className="text-sm whitespace-pre-wrap">{results.analysis}</p>
            </div>}
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="gradient-text">Financial Risk Analysis Results</CardTitle>
              <p className="text-sm text-muted-foreground">
                Analysis completed on {results.analysis_date}
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

      {/* AI Analysis Section */}
      {results.analysis && <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Financial Risk Analysis
            </CardTitle>
            {results.ai_status && <div className="flex items-center gap-2">
                <Badge className={getStatusBadgeStyle(results.ai_status)}>
                  {results.ai_status}
                </Badge>
                {results.ai_error && <span className="text-sm text-muted-foreground">
                    Error: {results.ai_error}
                  </span>}
              </div>}
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {results.analysis}
              </div>
            </div>
          </CardContent>
        </Card>}

      {/* Portfolio Summary */}
      {results.portfolio_summary && <Card className="glass-card">
          <CardHeader>
            <CardTitle>Portfolio Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Average Risk Level</h4>
                <Badge className={getStatusBadgeStyle(results.portfolio_summary.average_risk_level)}>
                  {results.portfolio_summary.average_risk_level?.toUpperCase() || 'Unknown'}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Diversification</h4>
                <p className="text-sm text-muted-foreground">
                  {results.portfolio_summary.diversification_analysis || 'No analysis available'}
                </p>
              </div>
            </div>
            {results.portfolio_summary.overall_recommendations && <div className="mt-4">
                <h4 className="font-medium mb-2">Overall Recommendations</h4>
                <p className="text-sm text-muted-foreground">
                  {results.portfolio_summary.overall_recommendations}
                </p>
              </div>}
            
            {/* 5-Year Z-Score Trend Chart */}
            {results.portfolio_summary?.zscore_trend && results.portfolio_summary.zscore_trend.length > 0 && <div className="mt-6">
                <h4 className="font-medium mb-4">5-Year Z-Score Trend</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.portfolio_summary.zscore_trend.map((item: any) => ({
                      year: item.year,
                      zscore: item.zscore
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis domain={[0, 'dataMax + 1']} />
                      <Tooltip formatter={(value: number) => [value?.toFixed(2), 'Z-Score']} labelFormatter={label => `Year: ${label}`} />
                      <Line type="monotone" dataKey="zscore" stroke="hsl(var(--primary))" strokeWidth={3} dot={{
                        fill: "hsl(var(--primary))",
                        strokeWidth: 2,
                  r: 6
                }} activeDot={{
                  r: 8,
                  stroke: "hsl(var(--primary))",
                  strokeWidth: 2
                }} />
                      {/* Add reference lines for Z-Score zones */}
                      <Line type="monotone" dataKey={() => 3.0} stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} dot={false} legendType="none" />
                      <Line type="monotone" dataKey={() => 1.8} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} dot={false} legendType="none" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-green-500"></div>
                    <span>Safe Zone (&gt;3.0)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    <span>Distress Zone (&lt;1.8)</span>
                  </div>
                </div>
              </div>}
          </CardContent>
        </Card>}

      {/* Individual Company Analysis */}
      <div className="space-y-8">
        {results.companies.map((company: any, index: number) => <div key={index} className="space-y-6">
            {/* Professional Header */}
            <Card className="glass-card bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-8 text-center">
                <h1 className="text-3xl font-bold mb-2">{company.name} Financial Risk Assessment</h1>
                <p className="text-lg text-muted-foreground">
                  Comprehensive Analysis as of {results.analysis_date} | Market Analysis
                </p>
              </CardContent>
            </Card>

            {/* Executive Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                  <p className="font-medium text-foreground">Overall Financial Health:</p>
                  <p className="text-muted-foreground mt-1">
                    {company.name} maintains a {company.overall_rating?.toLowerCase() || 'moderate'} financial position. 
                    {company.altman_z_score?.score && ` The company's Altman Z-Score of ${company.altman_z_score.score.toFixed(2)} places it in the ${company.altman_z_score.zone?.toLowerCase()} zone with ${company.altman_z_score.zone?.toLowerCase() === 'safe' ? 'low' : company.altman_z_score.zone?.toLowerCase() === 'grey' ? 'moderate' : 'high'} bankruptcy risk.`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Prominent Z-Score Display */}
            {company.altman_z_score?.score && <Card className={`glass-card ${company.altman_z_score.zone?.toLowerCase() === 'safe' ? 'bg-green-500/10 border-green-500/30' : company.altman_z_score.zone?.toLowerCase() === 'grey' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <CardContent className="p-8 text-center">
                  <h2 className="text-xl font-semibold mb-4 text-foreground">Altman Z-Score</h2>
                  <div className={`text-6xl font-bold mb-2 ${company.altman_z_score.zone?.toLowerCase() === 'safe' ? 'text-green-600' : company.altman_z_score.zone?.toLowerCase() === 'grey' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {company.altman_z_score.score.toFixed(2)}
                  </div>
                  <p className={`text-lg font-medium ${company.altman_z_score.zone?.toLowerCase() === 'safe' ? 'text-green-600' : company.altman_z_score.zone?.toLowerCase() === 'grey' ? 'text-yellow-600' : 'text-red-600'}`}>
                    {company.altman_z_score.zone?.toUpperCase()} ZONE - {company.altman_z_score.zone?.toLowerCase() === 'safe' ? 'Low Bankruptcy Risk' : company.altman_z_score.zone?.toLowerCase() === 'grey' ? 'Moderate Risk' : 'High Risk'}
                  </p>
                </CardContent>
              </Card>}

            {/* Key Financial Metrics Grid */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Key Financial Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* Current Ratio */}
                  {company.liquidity_ratios?.current_ratio && <div className="p-4 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg">
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Current Ratio</h4>
                      <p className="text-2xl font-bold text-green-600 mt-1">{company.liquidity_ratios.current_ratio.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Strong liquidity position</p>
                    </div>}

                  {/* Quick Ratio */}
                  {company.liquidity_ratios?.quick_ratio && <div className="p-4 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg">
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Quick Ratio</h4>
                      <p className="text-2xl font-bold text-green-600 mt-1">{company.liquidity_ratios.quick_ratio.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Excellent liquidity</p>
                    </div>}

                  {/* Debt-to-Equity */}
                  {company.solvency_ratios?.debt_to_equity && <div className="p-4 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg">
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Debt-to-Equity</h4>
                      <p className={`text-2xl font-bold mt-1 ${company.solvency_ratios.debt_to_equity < 1 ? 'text-green-600' : company.solvency_ratios.debt_to_equity < 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {company.solvency_ratios.debt_to_equity.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.solvency_ratios.debt_to_equity < 1 ? 'Moderate leverage' : 'Elevated'}
                      </p>
                    </div>}

                  {/* Return on Equity */}
                  {company.profitability_ratios?.roe && <div className="p-4 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg">
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Return on Equity</h4>
                      <p className={`text-2xl font-bold mt-1 ${company.profitability_ratios.roe > 0.15 ? 'text-green-600' : company.profitability_ratios.roe > 0.05 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {(company.profitability_ratios.roe * 100).toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.profitability_ratios.roe > 0.15 ? 'Strong returns' : company.profitability_ratios.roe > 0.05 ? 'Moderate' : 'Below average'}
                      </p>
                    </div>}

                  {/* Interest Coverage */}
                  {company.solvency_ratios?.times_interest_earned && <div className="p-4 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg">
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Interest Coverage</h4>
                      <p className={`text-2xl font-bold mt-1 ${company.solvency_ratios.times_interest_earned > 5 ? 'text-green-600' : company.solvency_ratios.times_interest_earned > 2.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {company.solvency_ratios.times_interest_earned.toFixed(1)}x
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.solvency_ratios.times_interest_earned > 5 ? 'Strong coverage' : company.solvency_ratios.times_interest_earned > 2.5 ? 'Adequate' : 'Concerning level'}
                      </p>
                    </div>}

                  {/* Net Margin */}
                  {company.profitability_ratios?.net_margin && <div className="p-4 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg">
                      <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Net Margin</h4>
                      <p className={`text-2xl font-bold mt-1 ${company.profitability_ratios.net_margin > 0.15 ? 'text-green-600' : company.profitability_ratios.net_margin > 0.05 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {(company.profitability_ratios.net_margin * 100).toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.profitability_ratios.net_margin > 0.15 ? 'Excellent pricing power' : company.profitability_ratios.net_margin > 0.05 ? 'Good margins' : 'Needs improvement'}
                      </p>
                    </div>}
                </div>
              </CardContent>
            </Card>

            {/* 5-Year Financial Ratios History */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl text-primary">Financial Ratios (5 Year History)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {(() => {
                    // Extract years from financial_timeline and sort chronologically (newest first)
                    const timelineData = company.financial_timeline || [];
                    const sortedTimeline = [...timelineData].sort((a, b) => b.year - a.year);
                    const years = sortedTimeline.map(item => item.year);
                    
                    // Create lookup for historical data by year
                    const dataByYear = {};
                    sortedTimeline.forEach(item => {
                      dataByYear[item.year] = item;
                    });
                    
                    // Also include Z-score historical data
                    const zscoreByYear = {};
                    if (company.altman_z_score?.historical_trend) {
                      company.altman_z_score.historical_trend.forEach(item => {
                        zscoreByYear[item.year] = item.z_score;
                      });
                    }

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-semibold text-primary">Metric</TableHead>
                            {years.map(year => (
                              <TableHead key={year} className="text-center font-semibold">{year}</TableHead>
                            ))}
                            <TableHead className="text-center font-semibold">Industry Avg</TableHead>
                            <TableHead className="text-center font-semibold">Assessment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Current Ratio</TableCell>
                            {years.map(year => (
                              <TableCell key={year} className="text-center">
                                {dataByYear[year]?.current_ratio?.toFixed(2) || '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">1.20</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Above Average</Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Quick Ratio</TableCell>
                            {years.map(year => (
                              <TableCell key={year} className="text-center">
                                {dataByYear[year]?.quick_ratio?.toFixed(2) || '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">1.00</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Strong</Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Debt/Equity</TableCell>
                            {years.map(year => (
                              <TableCell key={year} className="text-center">
                                {dataByYear[year]?.debt_to_equity?.toFixed(2) || '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">0.85</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Elevated</Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">ROE (%)</TableCell>
                            {years.map(year => (
                              <TableCell key={year} className="text-center">
                                {dataByYear[year]?.roe ? (dataByYear[year].roe * 100).toFixed(2) : '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">12.5</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Below Average</Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">ROA (%)</TableCell>
                            {years.map(year => (
                              <TableCell key={year} className="text-center">
                                {dataByYear[year]?.roa ? (dataByYear[year].roa * 100).toFixed(2) : '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">5.20</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Weak</Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Interest Coverage</TableCell>
                            {years.map(year => (
                              <TableCell key={year} className="text-center">
                                {dataByYear[year]?.times_interest_earned?.toFixed(2) || '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">6.50</TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Concerning</Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Altman Z-Score</TableCell>
                            {years.map(year => (
                              <TableCell key={year} className="text-center">
                                {zscoreByYear[year]?.toFixed(2) || '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-center">2.60</TableCell>
                            <TableCell className="text-center">
                              <Badge className={`${company.altman_z_score?.zone?.toLowerCase() === 'safe' ? 'bg-green-100 text-green-800 hover:bg-green-200' : company.altman_z_score?.zone?.toLowerCase() === 'grey' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}>
                                {company.altman_z_score?.zone || 'Unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Additional Analysis Tabs */}
            <Card className="glass-card">
              <CardContent>
                <Tabs defaultValue="ratios" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="ratios">Financial Ratios</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
                    <TabsTrigger value="zscore">Z-Score</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                  </TabsList>

                <TabsContent value="ratios" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Liquidity Ratios */}
                    {company.liquidity_ratios && <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Liquidity Ratios</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {company.liquidity_ratios.current_ratio && <div className="flex justify-between">
                              <span className="text-sm">Current Ratio</span>
                              <span className="font-medium">{company.liquidity_ratios.current_ratio.toFixed(2)}</span>
                            </div>}
                          {company.liquidity_ratios.quick_ratio && <div className="flex justify-between">
                              <span className="text-sm">Quick Ratio</span>
                              <span className="font-medium">{company.liquidity_ratios.quick_ratio.toFixed(2)}</span>
                            </div>}
                          {company.liquidity_ratios.cash_ratio && <div className="flex justify-between">
                              <span className="text-sm">Cash Ratio</span>
                              <span className="font-medium">{company.liquidity_ratios.cash_ratio.toFixed(2)}</span>
                            </div>}
                        </CardContent>
                      </Card>}

                    {/* Solvency Ratios */}
                    {company.solvency_ratios && <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Solvency Ratios</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {company.solvency_ratios.debt_to_equity && <div className="flex justify-between">
                              <span className="text-sm">Debt-to-Equity</span>
                              <span className="font-medium">{company.solvency_ratios.debt_to_equity.toFixed(2)}</span>
                            </div>}
                          {company.solvency_ratios.times_interest_earned && <div className="flex justify-between">
                              <span className="text-sm">Times Interest Earned</span>
                              <span className="font-medium">{company.solvency_ratios.times_interest_earned.toFixed(2)}</span>
                            </div>}
                        </CardContent>
                      </Card>}

                    {/* Profitability Ratios */}
                    {company.profitability_ratios && <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Profitability Ratios</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {company.profitability_ratios.roe && <div className="flex justify-between">
                              <span className="text-sm">ROE</span>
                              <span className="font-medium">{(company.profitability_ratios.roe * 100).toFixed(1)}%</span>
                            </div>}
                          {company.profitability_ratios.roa && <div className="flex justify-between">
                              <span className="text-sm">ROA</span>
                              <span className="font-medium">{(company.profitability_ratios.roa * 100).toFixed(1)}%</span>
                            </div>}
                          {company.profitability_ratios.net_margin && <div className="flex justify-between">
                              <span className="text-sm">Net Margin</span>
                              <span className="font-medium">{(company.profitability_ratios.net_margin * 100).toFixed(1)}%</span>
                            </div>}
                        </CardContent>
                      </Card>}
                  </div>
                </TabsContent>

                <TabsContent value="timeline">
                  {company.financial_timeline && company.financial_timeline.length > 0 ? <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Year</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Net Income</TableHead>
                          <TableHead>Total Debt</TableHead>
                          <TableHead>Key Events</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {company.financial_timeline.map((year: any, idx: number) => <TableRow key={idx}>
                            <TableCell className="font-medium">{year.year}</TableCell>
                            <TableCell>{year.revenue ? `$${(year.revenue / 1000000).toFixed(1)}M` : 'N/A'}</TableCell>
                            <TableCell>{year.net_income ? `$${(year.net_income / 1000000).toFixed(1)}M` : 'N/A'}</TableCell>
                            <TableCell>{year.total_debt ? `$${(year.total_debt / 1000000).toFixed(1)}M` : 'N/A'}</TableCell>
                            <TableCell className="text-sm">{year.key_events || 'None'}</TableCell>
                          </TableRow>)}
                      </TableBody>
                    </Table> : <p className="text-muted-foreground text-center py-8">No timeline data available</p>}
                </TabsContent>

                <TabsContent value="risk">
                  {company.risk_assessment && <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Credit Risk Level</h4>
                          <Badge className={getStatusBadgeStyle(company.risk_assessment.credit_risk_level)}>
                            {company.risk_assessment.credit_risk_level?.toUpperCase() || 'Unknown'}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Market Position</h4>
                          <p className="text-sm text-muted-foreground">
                            {company.risk_assessment.market_position || 'No information available'}
                          </p>
                        </div>
                      </div>
                      
                      {company.risk_assessment.industry_risks && <div>
                          <h4 className="font-medium mb-2">Industry Risks</h4>
                          <div className="flex flex-wrap gap-2">
                            {company.risk_assessment.industry_risks.map((risk: string, idx: number) => <Badge key={idx} variant="outline">
                                {risk}
                              </Badge>)}
                          </div>
                        </div>}

                      {company.risk_assessment.recent_performance && <div>
                          <h4 className="font-medium mb-2">Recent Performance</h4>
                          <p className="text-sm text-muted-foreground">
                            {company.risk_assessment.recent_performance}
                          </p>
                        </div>}
                    </div>}
                </TabsContent>

                <TabsContent value="zscore">
                  {company.altman_z_score?.calculation_details && <div className="space-y-6">
                      {/* Z-Score Overview */}
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <h3 className="text-2xl font-bold mb-2">Altman Z-Score: {company.altman_z_score.score?.toFixed(2)}</h3>
                        <Badge className={`text-sm ${getStatusBadgeStyle(company.altman_z_score.zone + ' zone')}`}>
                          {company.altman_z_score.zone?.toUpperCase()} ZONE
                        </Badge>
                      </div>

                      {/* Formula Components */}
                      <div>
                        <h4 className="font-medium mb-3">Formula Components</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">A</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.formula_components.A}</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.working_capital_total_assets?.toFixed(3)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">B</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.formula_components.B}</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.retained_earnings_total_assets?.toFixed(3)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">C</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.formula_components.C}</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.ebit_total_assets?.toFixed(3)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">D</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.formula_components.D}</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.market_value_equity_total_debt?.toFixed(3)}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">E</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.formula_components.E}</TableCell>
                              <TableCell>{company.altman_z_score.calculation_details.sales_total_assets?.toFixed(3)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>

                      {/* Calculation Steps */}
                      <div>
                        <h4 className="font-medium mb-3">Calculation Steps</h4>
                        <div className="space-y-2">
                          {company.altman_z_score.calculation_details.calculation_steps?.map((step: string, idx: number) => <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                              <p className="text-sm font-mono">{step}</p>
                            </div>)}
                        </div>
                      </div>

                      {/* Assumptions */}
                      <div>
                        <h4 className="font-medium mb-3">Key Assumptions & Adjustments</h4>
                        <ul className="space-y-2">
                          {company.altman_z_score.calculation_details.assumptions?.map((assumption: string, idx: number) => <li key={idx} className="flex items-start gap-2">
                              <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{assumption}</span>
                            </li>)}
                        </ul>
                      </div>
                    </div>}
                </TabsContent>

                <TabsContent value="summary">
                  <div className="space-y-6">

                    {company.key_strengths && <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          Key Strengths
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {company.key_strengths.map((strength: string, idx: number) => <li key={idx} className="text-sm text-muted-foreground">{strength}</li>)}
                        </ul>
                      </div>}

                    {company.key_weaknesses && <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          Key Weaknesses
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {company.key_weaknesses.map((weakness: string, idx: number) => <li key={idx} className="text-sm text-muted-foreground">{weakness}</li>)}
                        </ul>
                      </div>}

                    {company.recommendations && <div>
                        <h4 className="font-medium mb-2">Recommendations</h4>
                        <p className="text-sm text-muted-foreground">{company.recommendations}</p>
                      </div>}

                    {company.future_outlook && <div>
                        <h4 className="font-medium mb-2">Future Outlook</h4>
                        <p className="text-sm text-muted-foreground">{company.future_outlook}</p>
                      </div>}
                  </div>
                </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>)}
      </div>
    </div>;
};
export default AnalysisResults;
import { useState, useEffect } from "react";
import { Upload, FileText, History, Loader2, Download, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseFile, parseCompaniesFromText } from "@/lib/fileParser";
import CompanyConfirmation from "@/components/CompanyConfirmation";
import AnalysisResults from "@/components/AnalysisResults";
import BatchAnalysisResults from "@/components/BatchAnalysisResults";
import { generatePDF } from "@/lib/pdfGenerator";
import { enhancedAnalysis, generateConsistentId, formatConsistencyReport } from '@/lib/enhancedAnalysis';

import React from "react";

// Enhanced Consistency Indicator Component
const ConsistencyIndicator = ({ consistency, score, cacheStatus }: {
  consistency: any;
  score: number;
  cacheStatus: 'none' | 'hit' | 'miss';
}) => {
  if (!consistency) return null;

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCacheIcon = (status: string) => {
    switch (status) {
      case 'hit': return '🎯';
      case 'miss': return '🔄';
      default: return '📊';
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getCacheIcon(cacheStatus)}</span>
            <div>
              <h3 className="font-semibold text-gray-800">Enhanced Consistency</h3>
              <p className="text-sm text-gray-600">
                {cacheStatus === 'hit' ? 'Cached Result' : 'Fresh Analysis'}
              </p>
            </div>
          </div>
          
          <div className="border-l border-gray-300 pl-4">
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score}/100
              </span>
              <div>
                <p className="text-sm font-medium text-gray-700">Consistency Score</p>
                <p className="text-xs text-gray-500">
                  Seed: {consistency.seed} | Temp: {consistency.temperature}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">
            Attempts: {consistency.attempts}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(consistency.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("assessment");
  const [companies, setCompanies] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'confirm' | 'analyzing' | 'results' | 'batch-results'>('input');
  const [extractedCompanies, setExtractedCompanies] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'detailed'>('quick');
  const { toast } = useToast();
  
  // Enhanced state for consistency tracking
  const [analysisConsistency, setAnalysisConsistency] = useState<any>(null);
  const [cacheStatus, setCacheStatus] = useState<'none' | 'hit' | 'miss'>('none');
  const [consistencyScore, setConsistencyScore] = useState<number>(0);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Sign in anonymously if no session exists
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Failed to sign in anonymously:', error);
          toast({
            title: "Authentication Error",
            description: "Failed to initialize session. Please refresh the page.",
            variant: "destructive"
          });
          return;
        }
      }
      setIsAuthenticated(true);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleAnalyze = async () => {
    try {
      let companiesList: string[] = [];

      // Extract companies from file if uploaded
      if (uploadedFile) {
        companiesList = await parseFile(uploadedFile);
      }

      // Extract companies from manual input
      if (companies.trim()) {
        const manualCompanies = parseCompaniesFromText(companies);
        companiesList = [...companiesList, ...manualCompanies];
      }

      // Remove duplicates
      companiesList = [...new Set(companiesList)];

      if (companiesList.length === 0) {
        toast({
          title: "No companies found",
          description: "Please upload a file or enter company names manually.",
          variant: "destructive",
        });
        return;
      }

      setExtractedCompanies(companiesList);
      setCurrentStep('confirm');

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse companies. Please check your file format.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmCompanies = async (confirmedCompanies: string[]) => {
    try {
      setCurrentStep('analyzing');
      
      // Enhanced analysis with consistency checks
      console.log('🚀 Starting enhanced analysis:', {
        companies: confirmedCompanies,
        timestamp: new Date().toISOString()
      });

      // Check for cached analysis first
      const cachedResult = enhancedAnalysis.getCachedAnalysis(confirmedCompanies, analysisMode);
      if (cachedResult) {
        setCacheStatus('hit');
        setAnalysisResults(cachedResult.data);
        setAnalysisConsistency(cachedResult.consistency);
        setConsistencyScore(98); // High score for cached results
        
        toast({
          title: "Analysis Retrieved from Cache",
          description: `Maximum consistency achieved! ${formatConsistencyReport(cachedResult.consistency)}`,
        });
        
        setCurrentStep('results');
        return;
      }

      setCacheStatus('miss');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check current assessment count and delete oldest if necessary
      const { data: existingAssessments, error: countError } = await supabase
        .from('assessments')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (countError) throw countError;

      // If we have 5 or more assessments, delete the oldest
      if (existingAssessments && existingAssessments.length >= 5) {
        const { error: deleteError } = await supabase
          .from('assessments')
          .delete()
          .eq('id', existingAssessments[0].id);

        if (deleteError) throw deleteError;
      }

      // Generate deterministic seed for consistency
      const analysisSeed = enhancedAnalysis.generateSeed(confirmedCompanies);
      
      // Create assessment record with enhanced metadata
      const { data: assessment, error } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          name: `Enhanced Risk Assessment - ${new Date().toLocaleDateString()}`,
          companies: confirmedCompanies,
          status: 'pending',
          analysis_seed: analysisSeed, // Store seed for consistency
          analysis_mode: analysisMode,
          consistency_level: 'maximum'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentAssessmentId(assessment.id);

      // Enhanced analysis with circuit breaker
      if (enhancedAnalysis.isCircuitOpen()) {
        throw new Error('Service temporarily unavailable. Please try again in a few minutes.');
      }

      // Call the enhanced financial analysis function
      const response = await enhancedAnalysis.withRetry(async () => {
        const result = await supabase.functions.invoke('financial-analysis', {
          body: {
            companies: confirmedCompanies,
            assessmentId: assessment.id,
            mode: analysisMode,
            seed: analysisSeed, // Pass seed for deterministic results
            consistencyLevel: 'maximum'
          }
        });

        if (result.error) {
          throw new Error(result.error.message || 'Analysis failed');
        }

        return result;
      });

      enhancedAnalysis.recordSuccess();

      if (response.data?.success && response.data?.data) {
        const analysisData = response.data.data;
        const consistencyData = response.data.consistency;

        // Cache the results for future consistency
        enhancedAnalysis.setCachedAnalysis(confirmedCompanies, analysisMode, {
          data: analysisData,
          consistency: consistencyData
        });

        // Calculate consistency score
        const score = calculateConsistencyScore(consistencyData);
        setConsistencyScore(score);

        setAnalysisResults(analysisData);
        setAnalysisConsistency(consistencyData);

        // Update assessment status
        await supabase
          .from('assessments')
          .update({ 
            status: 'completed',
            consistency_score: score,
            analysis_metadata: consistencyData
          })
          .eq('id', assessment.id);

        toast({
          title: "Enhanced Analysis Completed!",
          description: `Consistency Score: ${score}/100 | Seed: ${analysisSeed}`,
        });

        setCurrentStep('results');
      } else {
        throw new Error('Invalid response from analysis service');
      }

    } catch (error) {
      enhancedAnalysis.recordFailure();
      console.error('Enhanced analysis error:', error);
      
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      
      setCurrentStep('confirm');
    }
  };

  // Helper function to calculate consistency score
  const calculateConsistencyScore = (consistency: any): number => {
    let score = 100;
    
    // Deduct points for high temperature
    if (consistency.temperature > 0.2) {
      score -= (consistency.temperature - 0.2) * 100;
    }
    
    // Deduct points for multiple attempts
    if (consistency.attempts > 1) {
      score -= (consistency.attempts - 1) * 5;
    }
    
    // Bonus for deterministic seed
    if (consistency.seed) {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const handleCancelAnalysis = () => {
    setCurrentStep('input');
    setExtractedCompanies([]);
    setCompanies("");
    setUploadedFile(null);
    setAnalysisMode('quick');
  };

  const handleSaveResults = () => {
    setCurrentStep('input');
    setExtractedCompanies([]);
    setCompanies("");
    setUploadedFile(null);
    setAnalysisResults(null);
    setCurrentAssessmentId(null);
    setAnalysisMode('quick');
    loadAssessments(); // Refresh the library
  };

  const handleDeleteResults = () => {
    setCurrentStep('input');
    setExtractedCompanies([]);
    setCompanies("");
    setUploadedFile(null);
    setAnalysisResults(null);
    setCurrentAssessmentId(null);
    setAnalysisMode('quick');
  };

  const loadAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Failed to load assessments:', error);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', assessmentId);

      if (error) throw error;

      toast({
        title: "Assessment Deleted",
        description: "The assessment has been successfully removed.",
      });

      loadAssessments();
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadAssessment = async (assessment: any) => {
    try {
      if (!assessment.results) {
        toast({
          title: "No Results",
          description: "This assessment doesn't have results to download.",
          variant: "destructive",
        });
        return;
      }

      await generatePDF(assessment.results, assessment.name);
      toast({
        title: "PDF Downloaded",
        description: "The assessment report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error downloading assessment:', error);
      toast({
        title: "Error",
        description: "Failed to download assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Load assessments on component mount and when tab changes
  React.useEffect(() => {
    if (activeTab === 'library') {
      loadAssessments();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Left Navigation */}
        <div className="w-64 bg-card border-r border-border min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-semibold gradient-text mb-6">Risk Buddy</h2>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("assessment")}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === "assessment"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <FileText className="h-4 w-4 mr-3" />
                Assessment
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === "library"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <History className="h-4 w-4 mr-3" />
                Library
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {activeTab === "assessment" && (
            <>
              {currentStep === 'input' && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="gradient-text">New Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Upload Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Upload Company List</h3>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <Input
                          type="file"
                          accept=".csv,.xlsx,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <div className="cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                          <Button variant="outline" className="mb-2" type="button">
                            Choose File
                          </Button>
                          <p className="text-sm text-muted-foreground">
                            Upload CSV, Excel, or text file with company names
                          </p>
                        </div>
                        {uploadedFile && (
                          <p className="mt-2 text-sm text-primary">
                            Uploaded: {uploadedFile.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Manual Entry Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Or Enter Manually</h3>
                      <Textarea
                        placeholder="Specify the companies you'd like to perform analysis. Example: I will like to perform risk assessments on Apple Inc. and Microsoft Corporation, Google LLC"
                        value={companies}
                        onChange={(e) => setCompanies(e.target.value)}
                        className="min-h-[200px]"
                      />
                    </div>

                    {/* Analysis Mode Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Analysis Mode</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Card 
                          className={`cursor-pointer transition-all ${
                            analysisMode === 'quick' 
                              ? 'ring-2 ring-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setAnalysisMode('quick')}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">Quick Analysis</h4>
                            <p className="text-sm text-muted-foreground">
                              Fast overview of key financial metrics and risk indicators
                            </p>
                          </CardContent>
                        </Card>
                        <Card 
                          className={`cursor-pointer transition-all ${
                            analysisMode === 'detailed' 
                              ? 'ring-2 ring-primary bg-primary/5' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setAnalysisMode('detailed')}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">Detailed Analysis</h4>
                            <p className="text-sm text-muted-foreground">
                              Comprehensive analysis with in-depth insights and recommendations
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <Button 
                      onClick={handleAnalyze} 
                      className="w-full"
                      disabled={!companies.trim() && !uploadedFile}
                    >
                      Start Analysis
                    </Button>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'confirm' && (
                <CompanyConfirmation
                  companies={extractedCompanies}
                  onConfirm={handleConfirmCompanies}
                  onCancel={handleCancelAnalysis}
                />
              )}

              {currentStep === 'analyzing' && (
                <Card className="glass-card">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <h3 className="text-lg font-medium mb-2">Analyzing Companies</h3>
                    <p className="text-muted-foreground text-center">
                      Our AI is performing {analysisMode} analysis on your selected companies. 
                      This may take a few moments...
                    </p>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'results' && analysisResults && (
                <div className="space-y-6">
                  <ConsistencyIndicator 
                    consistency={analysisConsistency}
                    score={consistencyScore}
                    cacheStatus={cacheStatus}
                  />
                  
                  <AnalysisResults
                    results={analysisResults}
                    onSave={handleSaveResults}
                    onDelete={handleDeleteResults}
                    assessmentId={currentAssessmentId}
                  />
                </div>
              )}

              {currentStep === 'batch-results' && analysisResults && (
                <BatchAnalysisResults
                  results={analysisResults}
                  onSave={handleSaveResults}
                  onDelete={handleDeleteResults}
                  assessmentId={currentAssessmentId}
                  onViewDetails={() => {}}
                />
              )}
            </>
          )}

          {activeTab === "library" && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="gradient-text">Assessment Library</CardTitle>
              </CardHeader>
              <CardContent>
                {assessments.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No Assessments Yet</h3>
                    <p className="text-muted-foreground">
                      Your completed assessments will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assessments.map((assessment) => (
                      <Card key={assessment.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{assessment.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {assessment.companies?.length || 0} companies • {' '}
                                {new Date(assessment.created_at).toLocaleDateString()}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  assessment.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {assessment.status}
                                </span>
                                {assessment.consistency_score && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    Consistency: {assessment.consistency_score}/100
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadAssessment(assessment)}
                                disabled={!assessment.results}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteAssessment(assessment.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

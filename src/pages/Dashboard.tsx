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

import React from "react";

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

      // Create assessment record
      const { data: assessment, error } = await supabase
        .from('assessments')
        .insert({
          user_id: user.id,
          name: `Risk Assessment - ${new Date().toLocaleDateString()}`,
          companies: confirmedCompanies,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentAssessmentId(assessment.id);

      // Call the financial analysis edge function
      const response = await supabase.functions.invoke('financial-analysis', {
        body: {
          companies: confirmedCompanies,
          assessmentId: assessment.id,
          mode: analysisMode
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Analysis failed');
      }

      setAnalysisResults(response.data.results);
      setCurrentStep(analysisMode === 'quick' ? 'batch-results' : 'results');

      toast({
        title: "Analysis Complete",
        description: "Financial risk analysis has been completed successfully.",
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze companies. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('input');
    }
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
                        <div 
                          onClick={() => setAnalysisMode('quick')}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            analysisMode === 'quick' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <h4 className="font-medium mb-2">Quick Analysis</h4>
                          <p className="text-sm text-muted-foreground">
                            Essential metrics only - Z-score, key ratios, risk level. Best for multiple companies.
                          </p>
                        </div>
                        <div 
                          onClick={() => setAnalysisMode('detailed')}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            analysisMode === 'detailed' 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <h4 className="font-medium mb-2">Detailed Analysis</h4>
                          <p className="text-sm text-muted-foreground">
                            Comprehensive analysis with full breakdown, timeline, and recommendations. Best for single company.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleAnalyze} 
                      className="w-full bg-gradient-primary"
                      disabled={!companies.trim() && !uploadedFile}
                    >
                      Start {analysisMode === 'quick' ? 'Quick' : 'Detailed'} Analysis
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
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <h3 className="text-lg font-medium mb-2">Analyzing Companies</h3>
                    <p className="text-sm text-muted-foreground">
                      Please wait while we perform comprehensive financial risk analysis...
                    </p>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'results' && analysisResults && currentAssessmentId && (
                <AnalysisResults
                  results={analysisResults}
                  assessmentId={currentAssessmentId}
                  assessmentName={assessments.find(a => a.id === currentAssessmentId)?.name || `Risk Assessment - ${new Date().toLocaleDateString()}`}
                  onSave={handleSaveResults}
                  onDelete={handleDeleteResults}
                />
              )}

              {currentStep === 'batch-results' && analysisResults && currentAssessmentId && (
                <BatchAnalysisResults
                  results={analysisResults}
                  assessmentId={currentAssessmentId}
                  assessmentName={assessments.find(a => a.id === currentAssessmentId)?.name || `Risk Assessment - ${new Date().toLocaleDateString()}`}
                  onSave={handleSaveResults}
                  onDelete={handleDeleteResults}
                  onViewDetails={(companyName) => {
                    // Find the company data from existing batch results
                    const companyData = analysisResults?.companies?.find(
                      (company: any) => company.name.toLowerCase() === companyName.toLowerCase()
                    );
                    
                    if (companyData) {
                      // Use existing data to show detailed view
                      setAnalysisResults({
                        ...analysisResults,
                        companies: [companyData]
                      });
                      setCurrentStep('results');
                    } else {
                      // Fallback: trigger new detailed analysis if company not found
                      setAnalysisMode('detailed');
                      setCompanies(companyName);
                      setCurrentStep('analyzing');
                      handleConfirmCompanies([companyName]);
                    }
                  }}
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
                <div className="space-y-4">
                  {assessments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No assessments found. Create your first risk assessment to get started.</p>
                    </div>
                  ) : (
                    assessments.map((assessment) => (
                      <Card key={assessment.id} className="card-hover">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium mb-1">{assessment.name}</h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                {new Date(assessment.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Companies: {assessment.companies.join(", ")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                assessment.status === "completed" 
                                  ? "bg-green-500/20 text-green-400" 
                                  : assessment.status === "processing"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : assessment.status === "failed"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}>
                                {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                              </span>
                              {assessment.status === "completed" && (
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setAnalysisResults(assessment.results);
                                      setCurrentAssessmentId(assessment.id);
                                      setCurrentStep('results');
                                      setActiveTab('assessment');
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDownloadAssessment(assessment)}
                                    className="flex items-center gap-1"
                                  >
                                    <Download className="h-3 w-3" />
                                    Download
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleDeleteAssessment(assessment.id)}
                                    className="flex items-center gap-1 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
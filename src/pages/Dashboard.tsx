import { useState, useEffect } from "react";
import { Upload, FileText, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseFile, parseCompaniesFromText } from "@/lib/fileParser";
import CompanyConfirmation from "@/components/CompanyConfirmation";
import AnalysisResults from "@/components/AnalysisResults";

import React from "react";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("assessment");
  const [companies, setCompanies] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<'input' | 'confirm' | 'analyzing' | 'results'>('input');
  const [extractedCompanies, setExtractedCompanies] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
          assessmentId: assessment.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Analysis failed');
      }

      setAnalysisResults(response.data.results);
      setCurrentStep('results');

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
  };

  const handleSaveResults = () => {
    setCurrentStep('input');
    setExtractedCompanies([]);
    setCompanies("");
    setUploadedFile(null);
    setAnalysisResults(null);
    setCurrentAssessmentId(null);
    loadAssessments(); // Refresh the library
  };

  const handleDeleteResults = () => {
    setCurrentStep('input');
    setExtractedCompanies([]);
    setCompanies("");
    setUploadedFile(null);
    setAnalysisResults(null);
    setCurrentAssessmentId(null);
  };

  const loadAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Failed to load assessments:', error);
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

                    <Button 
                      onClick={handleAnalyze} 
                      className="w-full bg-gradient-primary"
                      disabled={!companies.trim() && !uploadedFile}
                    >
                      Start Risk Analysis
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
                  onSave={handleSaveResults}
                  onDelete={handleDeleteResults}
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
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setAnalysisResults(assessment.results);
                                    setCurrentAssessmentId(assessment.id);
                                    setCurrentStep('results');
                                    setActiveTab('assessment');
                                  }}
                                >
                                  View Report
                                </Button>
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
import { useState } from "react";
import { Upload, FileText, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("assessment");
  const [companies, setCompanies] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleAnalyze = () => {
    // TODO: Implement analysis logic
    console.log("Analyzing companies:", companies);
    console.log("Uploaded file:", uploadedFile);
  };

  const mockAssessments = [
    {
      id: 1,
      name: "Tech Companies Analysis",
      date: "2024-01-15",
      companies: ["Apple", "Microsoft", "Google"],
      status: "Completed"
    },
    {
      id: 2,
      name: "Energy Sector Review",
      date: "2024-01-10",
      companies: ["ExxonMobil", "Chevron", "BP"],
      status: "Completed"
    },
    {
      id: 3,
      name: "Banking Assessment",
      date: "2024-01-05",
      companies: ["JPMorgan", "Bank of America"],
      status: "In Progress"
    }
  ];

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
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Button variant="outline" className="mb-2">
                        Choose File
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Upload CSV, Excel, or text file with company names
                      </p>
                    </label>
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

          {activeTab === "library" && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="gradient-text">Assessment Library</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAssessments.map((assessment) => (
                    <Card key={assessment.id} className="card-hover">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{assessment.name}</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {assessment.date}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Companies: {assessment.companies.join(", ")}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              assessment.status === "Completed" 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {assessment.status}
                            </span>
                            <Button variant="outline" size="sm">
                              View Report
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
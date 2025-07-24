import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, X } from "lucide-react";

interface CompanyConfirmationProps {
  companies: string[];
  onConfirm: (companies: string[]) => void;
  onCancel: () => void;
}

const CompanyConfirmation = ({ companies, onConfirm, onCancel }: CompanyConfirmationProps) => {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(companies);

  const removeCompany = (companyToRemove: string) => {
    setSelectedCompanies(prev => prev.filter(company => company !== companyToRemove));
  };

  const handleConfirm = () => {
    if (selectedCompanies.length === 0) {
      return;
    }
    onConfirm(selectedCompanies);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="gradient-text">Confirm Company List</CardTitle>
        <p className="text-sm text-muted-foreground">
          Review the extracted companies below. Remove any incorrect entries and confirm to proceed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">Extracted Companies ({selectedCompanies.length})</h4>
          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
            {selectedCompanies.map((company, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-2 px-3 py-1"
              >
                {company}
                <button
                  onClick={() => removeCompany(company)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {selectedCompanies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Trash2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No companies selected. Please add companies to proceed.</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel & Start Over
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedCompanies.length === 0}
            className="flex-1 bg-gradient-primary"
          >
            <Check className="h-4 w-4 mr-2" />
            Confirm & Analyze ({selectedCompanies.length})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyConfirmation;
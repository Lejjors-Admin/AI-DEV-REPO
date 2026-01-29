import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Upload, Download, Eye, Trash2, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ClientDocuments() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const clientId = params.id;
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch client data
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId
  });

  // Fetch documents (placeholder for now)
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/clients", clientId, "documents"],
    enabled: !!clientId,
    // For now, return empty array - this will be implemented with real API
    queryFn: () => Promise.resolve([])
  });

  // Mock documents for demonstration
  const mockDocuments = [
    {
      id: 1,
      name: "Financial Statements 2024.pdf",
      type: "Financial Report",
      size: "2.4 MB",
      uploadedDate: new Date("2024-07-15"),
      uploadedBy: "John Admin"
    },
    {
      id: 2,
      name: "Tax Return 2023.pdf",
      type: "Tax Document",
      size: "1.8 MB",
      uploadedDate: new Date("2024-07-10"),
      uploadedBy: "Tax Specialist"
    },
    {
      id: 3,
      name: "Bank Statements - July 2024.pdf",
      type: "Bank Statement",
      size: "945 KB",
      uploadedDate: new Date("2024-07-20"),
      uploadedBy: "Bookkeeper"
    }
  ];

  const displayDocuments = documents?.length > 0 ? documents : mockDocuments;

  const filteredDocuments = displayDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (clientLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Client Not Found</h1>
          <p className="text-gray-600 mt-2">The client you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/clients")} className="mt-4">
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => setLocation(`/clients/${clientId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Client
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Documents & Files</h1>
            <p className="text-gray-600">{client.name}</p>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Documents
                </CardTitle>
                <CardDescription>
                  Upload financial documents, receipts, and other files for this client
                </CardDescription>
              </div>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          {documentsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="space-y-2">
                    <div className="h-4 w-[250px] bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-[200px] bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : filteredDocuments.length > 0 ? (
            filteredDocuments.map((document) => (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{document.name}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <Badge variant="outline">{document.type}</Badge>
                          <span>{document.size}</span>
                          <span>Uploaded {formatDistanceToNow(document.uploadedDate, { addSuffix: true })}</span>
                          <span>by {document.uploadedBy}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "No documents match your search criteria." : "Upload documents to get started."}
                </p>
                {!searchTerm && (
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload First Document
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Document Categories */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Document Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {displayDocuments.filter(d => d.type.includes('Financial')).length}
                  </div>
                  <div className="text-sm text-gray-600">Financial Reports</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {displayDocuments.filter(d => d.type.includes('Tax')).length}
                  </div>
                  <div className="text-sm text-gray-600">Tax Documents</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {displayDocuments.filter(d => d.type.includes('Bank')).length}
                  </div>
                  <div className="text-sm text-gray-600">Bank Statements</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
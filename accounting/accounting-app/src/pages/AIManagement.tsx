import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AIProviderSettings from "@/components/settings/AIProviderSettings";
import { Brain, Bot, Zap, History, FileText } from "lucide-react";

export default function AIManagement() {
  const [settings, setSettings] = useState({
    documentTypes: {
      receipts: false,
      invoices: false,
      statements: false,
      taxDocs: false
    },
    ocr: {
      enabled: false,
      layoutDetection: false,
      tableExtraction: false,
      handwriting: false
    },
    financialAnalysis: {
      transactionAnalysis: false,
      cashFlow: false
    },
    compliance: {
      auditAssistance: false,
      complianceCheck: false
    }
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Management</h1>
          <p className="text-muted-foreground">
            Control and monitor your AI agents and services
          </p>
        </div>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Providers
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Active Agents
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Usage & Billing
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Document Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document Analysis Settings</CardTitle>
              <CardDescription>Configure AI-powered document processing for receipts, invoices, and financial statements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">OCR & Document Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="ocr-enabled"
                        checked={settings.ocr.enabled}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            ocr: { ...prev.ocr, enabled: checked }
                          }))
                        }
                      />
                      <Label htmlFor="ocr-enabled">Enable OCR Processing</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="layout-detection"
                        checked={settings.ocr.layoutDetection}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            ocr: { ...prev.ocr, layoutDetection: checked }
                          }))
                        }
                      />
                      <Label htmlFor="layout-detection">Layout Detection</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="table-extraction"
                        checked={settings.ocr.tableExtraction}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            ocr: { ...prev.ocr, tableExtraction: checked }
                          }))
                        }
                      />
                      <Label htmlFor="table-extraction">Table Extraction</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="handwriting"
                        checked={settings.ocr.handwriting}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            ocr: { ...prev.ocr, handwriting: checked }
                          }))
                        }
                      />
                      <Label htmlFor="handwriting">Handwriting Recognition</Label>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mb-4 mt-6">Document Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="receipts" 
                        checked={settings.documentTypes.receipts}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            documentTypes: { ...prev.documentTypes, receipts: checked }
                          }))
                        }
                      />
                      <Label htmlFor="receipts">Receipts Processing</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="invoices"
                        checked={settings.documentTypes.invoices}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            documentTypes: { ...prev.documentTypes, invoices: checked }
                          }))
                        }
                      />
                      <Label htmlFor="invoices">Invoice Analysis</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="statements"
                        checked={settings.documentTypes.statements}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            documentTypes: { ...prev.documentTypes, statements: checked }
                          }))
                        }
                      />
                      <Label htmlFor="statements">Financial Statements</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="tax-docs"
                        checked={settings.documentTypes.taxDocs}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            documentTypes: { ...prev.documentTypes, taxDocs: checked }
                          }))
                        }
                      />
                      <Label htmlFor="tax-docs">Tax Documents</Label>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mb-4 mt-6">Financial Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="transaction-analysis"
                        checked={settings.financialAnalysis.transactionAnalysis}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            financialAnalysis: { ...prev.financialAnalysis, transactionAnalysis: checked }
                          }))
                        }
                      />
                      <Label htmlFor="transaction-analysis">Transaction Analysis</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="cash-flow"
                        checked={settings.financialAnalysis.cashFlow}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            financialAnalysis: { ...prev.financialAnalysis, cashFlow: checked }
                          }))
                        }
                      />
                      <Label htmlFor="cash-flow">Cash Flow Prediction</Label>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mb-4 mt-6">Compliance & Audit</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="audit-assistance"
                        checked={settings.compliance.auditAssistance}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            compliance: { ...prev.compliance, auditAssistance: checked }
                          }))
                        }
                      />
                      <Label htmlFor="audit-assistance">Audit Assistance</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="compliance-check"
                        checked={settings.compliance.complianceCheck}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({
                            ...prev,
                            compliance: { ...prev.compliance, complianceCheck: checked }
                          }))
                        }
                      />
                      <Label htmlFor="compliance-check">Compliance Check</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <AIProviderSettings />
        </TabsContent>

        <TabsContent value="agents">
          <div className="grid gap-6">
            {/* Agent Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Multi-Agent System Status</CardTitle>
                <CardDescription>Multiple AI agents working in parallel on document processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">6</div>
                    <div className="text-sm text-green-700">Active Agents</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">12</div>
                    <div className="text-sm text-blue-700">Tasks in Queue</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">3</div>
                    <div className="text-sm text-orange-700">Processing Now</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Details */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Details</CardTitle>
                <CardDescription>Individual agent status and specializations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* OCR Agents */}
                  <div>
                    <h4 className="font-medium mb-2">OCR Specialists</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">OCR Agent 1</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Provider: OpenAI GPT-4o • Layout Detection
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">OCR Agent 2</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Provider: Claude 3.7 • Table Extraction
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Categorization Agents */}
                  <div>
                    <h4 className="font-medium mb-2">Transaction Categorization</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Categorization Agent 1</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Provider: OpenAI GPT-4o • Primary Categorization
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Categorization Agent 2</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Standby</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Provider: Gemini 2.5 Pro • Complex Cases
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Agents */}
                  <div>
                    <h4 className="font-medium mb-2">Document Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Analysis Agent</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Provider: Claude 3.7 • Financial Data Extraction
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Validation Agent</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Provider: OpenAI GPT-4o • Compliance Checking
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Management</CardTitle>
                <CardDescription>Add, remove, or configure AI agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Add New Agent
                    </button>
                    <button className="px-4 py-2 border rounded hover:bg-gray-50">
                      Configure Load Balancing
                    </button>
                    <button className="px-4 py-2 border rounded hover:bg-gray-50">
                      View Task History
                    </button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p><strong>Benefits of Multi-Agent System:</strong></p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Parallel processing reduces document processing time by 60%</li>
                      <li>Specialized agents provide higher accuracy for specific tasks</li>
                      <li>Redundancy ensures continued operation if one agent fails</li>
                      <li>Load balancing optimizes resource usage across providers</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage & Billing</CardTitle>
              <CardDescription>Monitor your AI usage and associated costs</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Usage statistics will go here */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>AI Activity History</CardTitle>
              <CardDescription>View past AI interactions and their results</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Activity history will go here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
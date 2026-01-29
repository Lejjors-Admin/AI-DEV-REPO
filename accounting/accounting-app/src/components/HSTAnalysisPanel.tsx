/**
 * HST Analysis Panel - Enhanced tax classification display
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface HSTAnalysisProps {
  transaction: any;
  analysis: any;
  onApplyAnalysis: (analysis: any) => void;
}

export function HSTAnalysisPanel({
  transaction,
  analysis,
  onApplyAnalysis,
}: HSTAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!analysis) return null;

  const getTaxBadgeColor = (taxCode: string) => {
    switch (taxCode) {
      case "HST":
        return "bg-blue-100 text-blue-800";
      case "GST":
        return "bg-green-100 text-green-800";
      case "PST":
        return "bg-purple-100 text-purple-800";
      case "EXEMPT":
        return "bg-gray-100 text-gray-800";
      case "ZERO_RATED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const taxAmount = analysis.taxAmount || 0;
  const netAmount = analysis.netAmount || transaction.amount;
  const taxRate = (analysis.taxRate || 0) * 100;
  const confidence = analysis.confidence || 0;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <span>HST Analysis</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Less" : "More"}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Net Amount</p>
            <p className="text-lg font-semibold text-green-600">
              ${netAmount.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Tax ({taxRate.toFixed(1)}%)
            </p>
            <p className="text-lg font-semibold text-blue-600">
              ${taxAmount.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">
              ${transaction.amount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Tax Classification */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Tax Classification</p>
            <Badge className={getTaxBadgeColor(analysis.taxCode)}>
              {analysis.taxCode}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <div className="flex items-center gap-2">
              <Progress value={confidence * 100} className="w-16" />
              <span
                className={`text-sm font-medium ${getConfidenceColor(
                  confidence
                )}`}
              >
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Suggested Account */}
        <div>
          <p className="text-sm text-muted-foreground">Suggested Account</p>
          <p className="font-medium">{analysis.accountName}</p>
          <p className="text-sm text-muted-foreground">{analysis.category}</p>
        </div>

        {/* Receipt Requirement */}
        {analysis.needsReceipt && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Receipt required for CRA compliance
            </span>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            <div>
              <p className="text-sm font-medium mb-1">AI Reasoning</p>
              <p className="text-sm text-muted-foreground">
                {analysis.reasoning}
              </p>
            </div>

            {analysis.suggestedRules && analysis.suggestedRules.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Suggested Rules</p>
                <div className="space-y-1">
                  {analysis.suggestedRules.map(
                    (rule: string, index: number) => (
                      <div
                        key={index}
                        className="text-xs p-2 bg-gray-50 rounded"
                      >
                        {rule}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Tax Calculation Breakdown */}
            <div>
              <p className="text-sm font-medium mb-2">Tax Calculation</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Gross Amount:</span>
                  <span>${transaction.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Rate:</span>
                  <span>{taxRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount:</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Net Amount:</span>
                  <span>${netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Apply Analysis Button */}
        <Button
          onClick={() => onApplyAnalysis(analysis)}
          className="w-full"
          disabled={confidence < 0.3}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Apply HST Analysis
        </Button>
      </CardContent>
    </Card>
  );
}

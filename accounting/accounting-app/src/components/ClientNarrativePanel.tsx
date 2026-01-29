import { apiConfig } from "@/lib/api-config";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, TrendingUp, Lightbulb, Activity } from "lucide-react";

interface ClientNarrativePanelProps {
  clientId: string;
}

export function ClientNarrativePanel({ clientId }: ClientNarrativePanelProps) {
  const { data: narrative, isLoading, isError, refetch } = useQuery({
    queryKey: [`/api/clients/${clientId}/overview/narrative`],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(apiConfig.buildUrl(`/api/clients/${clientId}/overview/narrative`), {
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch narrative: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!clientId,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours - matches backend cache
    retry: 1, // Only retry once on error
  });

  const handleRefresh = async () => {
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // Invalidate cache on backend
    await fetch(apiConfig.buildUrl(`/api/clients/${clientId}/overview/narrative/refresh`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
       ...headers,
      },
      credentials: 'include',
    });
    // Refetch
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500">Generating insights...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load financial intelligence. Please try again.</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-blue-600" />
          Financial Intelligence
        </h3>
        <button
          onClick={handleRefresh}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Greeting */}
      <div className="text-gray-700 leading-relaxed">
        {narrative?.greeting}
      </div>

      {/* Performance Summary */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
          PERFORMANCE SUMMARY
        </h4>
        <p className="text-gray-700 leading-relaxed">
          {narrative?.performanceSummary}
        </p>
      </div>

      {/* Industry Insights */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900">🌍 INDUSTRY INSIGHTS</h4>
        <p className="text-gray-700 leading-relaxed">
          {narrative?.industryInsights}
        </p>
      </div>

      {/* Opportunities & Alerts */}
      {narrative?.opportunities && narrative.opportunities.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <Lightbulb className="h-4 w-4 mr-2 text-yellow-600" />
            OPPORTUNITIES & ALERTS
          </h4>
          <ul className="space-y-2">
            {narrative.opportunities.map((opp: string, index: number) => (
              <li key={index} className="flex items-start text-gray-700">
                <span className="mr-2">•</span>
                <span>{opp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Milton's Recommendations */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900">🤖 MILTON'S RECOMMENDATIONS</h4>
        <p className="text-gray-700 leading-relaxed">
          {narrative?.recommendations}
        </p>
      </div>

      {/* Industry Benchmarks Section (Statistics Canada) */}
      {narrative?.externalData?.industryBenchmarks && (
        <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900">📊 INDUSTRY BENCHMARKS</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Industry Classification:</span>{' '}
              NAICS {narrative.externalData.industryBenchmarks.naicsCode} - {narrative.externalData.industryBenchmarks.industryName}
            </p>
            {narrative.externalData.industryBenchmarks.notes && (
              <p className="text-xs text-gray-600 mt-2">
                {narrative.externalData.industryBenchmarks.notes}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Source: {narrative.externalData.industryBenchmarks.source}
            </p>
          </div>
        </div>
      )}

      {/* Economic Context (Bank of Canada) */}
      {narrative?.externalData?.economicIndicators && (
        narrative.externalData.economicIndicators.policyRate !== null || 
        narrative.externalData.economicIndicators.inflationRate !== null
      ) && (
        <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Economic Context</h4>
          <div className="text-xs text-gray-600 space-y-1">
            {narrative.externalData.economicIndicators.policyRate !== null && (
              <p>
                Bank of Canada Policy Rate: {narrative.externalData.economicIndicators.policyRate}%
                {narrative.externalData.economicIndicators.policyRateDate && 
                  ` (${new Date(narrative.externalData.economicIndicators.policyRateDate).toLocaleDateString()})`
                }
              </p>
            )}
            {narrative.externalData.economicIndicators.inflationRate !== null && (
              <p>
                Inflation (CPI): {narrative.externalData.economicIndicators.inflationRate}
                {narrative.externalData.economicIndicators.inflationDate && 
                  ` (${new Date(narrative.externalData.economicIndicators.inflationDate).toLocaleDateString()})`
                }
              </p>
            )}
          </div>
        </div>
      )}

      {/* Data Sources / Citations */}
      {narrative?.citations && narrative.citations.length > 0 && (
        <div className="pt-4 border-t">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700 font-medium">
              Data Sources ({narrative.citations.length})
            </summary>
            <ul className="mt-2 space-y-1 ml-4">
              {narrative.citations.map((citation: any, index: number) => (
                <li key={index}>
                  <a 
                    href={citation.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {citation.source}
                  </a>
                  {' - '}{citation.type}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {/* Cache indicator */}
      {narrative?.cached && (
        <div className="text-xs text-gray-400">
          Generated {new Date(narrative?.generatedAt).toLocaleString()} • Cached
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface BankFeedsListProps {
  clientId: string;
  onSelectBankFeed: (bankFeedId: number) => void;
  selectedBankFeedId: number | null;
}

export function BankFeedsList({ 
  clientId, 
  onSelectBankFeed,
  selectedBankFeedId
}: BankFeedsListProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<Record<number, boolean>>({});

  const { data: bankFeeds = [], isLoading: isLoadingBankFeeds, refetch: refetchBankFeeds } = useQuery<any[]>({
    queryKey: [`/api/bank-feeds/${clientId}`],
    enabled: !!clientId,
  });

  const { data: bankTransactions = [], isLoading: isLoadingBankTransactions } = useQuery<any[]>({
    queryKey: [`/api/bank-transactions/${clientId}`],
    enabled: !!clientId,
  });

  // Count uncategorized transactions for each bank feed
  const getUncategorizedCount = (bankFeedId: number) => {
    if (!bankTransactions) return 0;
    return bankTransactions.filter(
      (tx: any) => tx.bankFeedId === bankFeedId && tx.status === "unreconciled"
    ).length;
  };

  const handleSyncBankFeed = async (bankFeedId: number) => {
    if (isSyncing[bankFeedId]) return;
    
    try {
      setIsSyncing({...isSyncing, [bankFeedId]: true});
      
      await apiRequest('POST', `/api/bank-feeds/${bankFeedId}/sync`);
      
      // Refetch bank feeds and transactions
      await refetchBankFeeds();
      
      // Reset syncing state
      setIsSyncing({...isSyncing, [bankFeedId]: false});
    } catch (error) {
      console.error("Error syncing bank feed:", error);
      setIsSyncing({...isSyncing, [bankFeedId]: false});
    }
  };

  if (isLoadingBankFeeds) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Feeds</CardTitle>
          <CardDescription>Connect and manage your bank accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bankFeeds?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Feeds</CardTitle>
          <CardDescription>Connect and manage your bank accounts</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-4">
          <p className="text-neutral-500 text-center mb-4">
            No bank accounts connected. Connect accounts to automatically import transactions.
          </p>
          <Button 
            className="mb-4"
            disabled={isConnecting}
            onClick={() => setIsConnecting(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Connect Bank
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Bank Feeds</CardTitle>
          <CardDescription>Connected accounts</CardDescription>
        </div>
        <Button 
          className="ml-auto" 
          size="sm"
          disabled={isConnecting}
          onClick={() => setIsConnecting(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Connect Bank
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Account</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Uncategorized</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bankFeeds.map((feed: any) => {
              const uncategorizedCount = getUncategorizedCount(feed.id);
              const isSelected = selectedBankFeedId === feed.id;
              const lastSyncedDate = feed.lastSynced ? new Date(feed.lastSynced) : null;
              const lastSyncedText = lastSyncedDate 
                ? formatDistanceToNow(lastSyncedDate, { addSuffix: true }) 
                : 'Never';
              
              return (
                <TableRow 
                  key={feed.id} 
                  className={isSelected ? "bg-muted/50" : ""}
                  onClick={() => onSelectBankFeed(feed.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell className="font-medium">{feed.name}</TableCell>
                  <TableCell>{feed.institutionName}</TableCell>
                  <TableCell>{lastSyncedText}</TableCell>
                  <TableCell>
                    {feed.status === "active" ? (
                      <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
                        <AlertCircle className="h-3 w-3 mr-1" /> Error
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {uncategorizedCount > 0 ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                        {uncategorizedCount}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100">
                        0
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSyncBankFeed(feed.id);
                      }}
                      disabled={isSyncing[feed.id]}
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing[feed.id] ? 'animate-spin' : ''}`} /> 
                      Sync
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
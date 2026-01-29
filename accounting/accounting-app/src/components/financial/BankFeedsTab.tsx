import { useState } from "react";
import { BankFeedsList } from "./BankFeedsList";
import { BankTransactionsList } from "./BankTransactionsList";
import { Card, CardContent } from "@/components/ui/card";

interface BankFeedsTabProps {
  clientId: string;
  accounts: any[];
  transactions: any[];
  isLoadingTransactions: boolean;
  refetchTransactions: () => void;
}

export default function BankFeedsTab({
  clientId,
  accounts = [],
  transactions = [],
  isLoadingTransactions,
  refetchTransactions
}: BankFeedsTabProps) {
  const [selectedBankFeedId, setSelectedBankFeedId] = useState<number | null>(null);

  if (!clientId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please select a client to view bank feeds.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <BankFeedsList 
          clientId={clientId} 
          onSelectBankFeed={(bankFeedId) => setSelectedBankFeedId(bankFeedId)}
          selectedBankFeedId={selectedBankFeedId}
        />
      </div>
      
      <div className="mb-6">
        <BankTransactionsList 
          clientId={clientId}
          selectedBankFeedId={selectedBankFeedId}
          accounts={accounts}
          regularTransactions={transactions}
          isLoadingRegularTransactions={isLoadingTransactions}
          refetchRegularTransactions={refetchTransactions}
        />
      </div>
    </div>
  );
}
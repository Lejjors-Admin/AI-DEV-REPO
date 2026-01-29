import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: number;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'cost_of_sales';
  balance: number;
  accountNumber?: string;
}

interface AccountTypeEditorProps {
  accounts: Account[];
  clientId: number;
}

const accountTypeColors = {
  asset: "bg-blue-100 text-blue-800",
  liability: "bg-red-100 text-red-800", 
  equity: "bg-purple-100 text-purple-800",
  income: "bg-green-100 text-green-800",
  cost_of_sales: "bg-yellow-100 text-yellow-800",
  expense: "bg-orange-100 text-orange-800"
};

const accountTypeLabels = {
  asset: "Assets",
  liability: "Liabilities", 
  equity: "Equity",
  income: "Income",
  cost_of_sales: "Cost of Sales",
  expense: "Expenses"
};

export function AccountTypeEditor({ accounts, clientId }: AccountTypeEditorProps) {
  const [localAccounts, setLocalAccounts] = useState(accounts);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateAccountTypeMutation = useMutation({
    mutationFn: async ({ accountId, newType }: { accountId: number; newType: string }) => {
      const response = await apiRequest('PATCH', `/api/accounts/${accountId}/type`, { type: newType });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate multiple related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: [`/api/accounts/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', clientId] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/validation`] });
      toast({
        title: "Account Updated",
        description: "Account type has been successfully updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update account type",
        variant: "destructive",
      });
    }
  });

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId) return;

    const accountId = parseInt(draggableId);
    const newType = destination.droppableId as Account['type'];
    
    // Update local state immediately for better UX
    setLocalAccounts(prev => 
      prev.map(account => 
        account.id === accountId 
          ? { ...account, type: newType }
          : account
      )
    );

    // Update on server
    updateAccountTypeMutation.mutate({ accountId, newType });
  };

  const groupedAccounts = localAccounts.reduce((groups, account) => {
    if (!groups[account.type]) {
      groups[account.type] = [];
    }
    groups[account.type].push(account);
    return groups;
  }, {} as Record<Account['type'], Account[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Account Type Editor</h3>
        <p className="text-sm text-muted-foreground">Drag accounts between sections to change their type</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(accountTypeLabels).map(([type, label]) => (
            <Card key={type} className="min-h-[300px]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge className={accountTypeColors[type as Account['type']]}>
                    {label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({groupedAccounts[type as Account['type']]?.length || 0})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={type}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] p-2 rounded-md transition-colors ${
                        snapshot.isDraggingOver 
                          ? 'bg-muted border-2 border-dashed border-primary' 
                          : 'bg-muted/30'
                      }`}
                    >
                      {groupedAccounts[type as Account['type']]?.map((account, index) => (
                        <Draggable 
                          key={account.id} 
                          draggableId={account.id.toString()} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 mb-2 bg-white rounded border shadow-sm transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                              }`}
                            >
                              <div className="text-sm font-medium">{account.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {account.accountNumber && `${account.accountNumber} • `}
                                ${account.balance.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {!groupedAccounts[type as Account['type']]?.length && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          Drop accounts here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
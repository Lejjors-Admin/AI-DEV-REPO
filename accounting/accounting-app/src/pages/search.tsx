import { useState } from "react";
import { Search as SearchIcon, Users, Calculator, FolderOpen, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock search results - in a real app, this would come from an API
  const searchResults = [
    {
      id: 1,
      title: "Test Business Client",
      type: "client",
      module: "CRM",
      description: "Client in retail industry",
      path: "/clients/5"
    },
    {
      id: 2,
      title: "Chart of Accounts",
      type: "accounts",
      module: "BOOKKEEPING",
      description: "Financial account structure",
      path: "/bookkeeping/accounts"
    },
    {
      id: 3,
      title: "Audit Files",
      type: "document",
      module: "BINDERS",
      description: "Client audit documentation",
      path: "/audit-files"
    }
  ].filter(item => 
    searchQuery === "" || 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: string) => {
    switch (type) {
      case "client":
        return <Users className="h-4 w-4" />;
      case "accounts":
        return <Calculator className="h-4 w-4" />;
      case "document":
        return <FolderOpen className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getModuleColor = (module: string) => {
    switch (module) {
      case "CRM":
        return "bg-blue-100 text-blue-800";
      case "BOOKKEEPING":
        return "bg-green-100 text-green-800";
      case "BINDERS":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search</h1>
        <p className="text-gray-600">Search across all modules and data</p>
      </div>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search clients, accounts, documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-lg py-6"
        />
      </div>

      <div className="space-y-4">
        {searchResults.length === 0 && searchQuery !== "" && (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No results found for "{searchQuery}"
            </CardContent>
          </Card>
        )}

        {searchResults.map((result) => (
          <Link key={result.id} href={result.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(result.type)}
                    <CardTitle className="text-lg">{result.title}</CardTitle>
                  </div>
                  <Badge className={getModuleColor(result.module)}>
                    {result.module}
                  </Badge>
                </div>
                <CardDescription>{result.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}

        {searchQuery === "" && (
          <div className="text-center text-gray-500 mt-12">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Enter a search term to find clients, accounts, documents, and more</p>
          </div>
        )}
      </div>
    </div>
  );
}
import { PlusCircle, File, Cloud, Maximize } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConnectIntegrations() {
  const integrations = [
    {
      id: 1,
      name: "Xero",
      description: "Connect your accounting data",
      icon: File,
      bgColor: "bg-accent",
    },
    {
      id: 2,
      name: "Salesforce",
      description: "Sync CRM data",
      icon: Cloud,
      bgColor: "bg-primary",
    },
    {
      id: 3,
      name: "Microsoft 365",
      description: "Connect office tools",
      icon: Maximize,
      bgColor: "bg-secondary",
    },
  ];

  return (
    <Card className="mt-8">
      <CardContent className="pt-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-neutral-900">Connect with Additional Systems</h3>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">Integrate with more business tools to maximize your workflow efficiency.</p>
          </div>
          <div className="mt-5 sm:mt-0">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Connect New App
            </Button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            
            return (
              <div key={integration.id} className="border border-neutral-300 rounded-lg p-5 flex items-center bg-neutral-100">
                <div className={`flex-shrink-0 h-12 w-12 flex items-center justify-center ${integration.bgColor} rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="text-base font-medium text-neutral-900">{integration.name}</h4>
                  <p className="text-sm text-neutral-500">{integration.description}</p>
                </div>
                <div className="ml-2">
                  <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-white">
                    Connect
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

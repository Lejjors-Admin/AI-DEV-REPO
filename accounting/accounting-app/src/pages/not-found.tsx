
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-8">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <div className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</div>
        <Button onClick={() => navigate("/")}>Return to Dashboard</Button>
      </div>
    </div>
  );
}

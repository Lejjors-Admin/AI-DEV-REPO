import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, User, Briefcase, ArrowRight } from "lucide-react";

export default function AuthLanding() {
  const [_, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary to-primary-foreground text-primary-foreground py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Welcome to AccountSync
          </h1>
          <p className="mt-6 text-xl max-w-2xl mx-auto">
            The comprehensive platform that streamlines accounting workflows, client management, 
            and financial data in one secure location.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button 
              variant="secondary" 
              size="lg" 
              onClick={() => navigate("/auth/login")}
            >
              Sign In
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="bg-white/10 text-white hover:bg-white/20 border-white/20"
              onClick={() => document.getElementById('options')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>

      {/* Registration Options */}
      <div id="options" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Choose Your Registration Path</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Accounting Firm */}
            <Card className="border-0 shadow-lg transition-all hover:shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto bg-primary/10 flex items-center justify-center rounded-full mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Accounting Firm</CardTitle>
                <CardDescription className="text-base">
                  Register your accounting practice
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Create and manage your accounting firm</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Add staff members to your practice</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Invite and manage client businesses</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Access all platform features</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  className="w-full" 
                  onClick={() => navigate("/auth/register/firm")}
                >
                  Register Firm
                </Button>
              </CardFooter>
            </Card>

            {/* Business Client */}
            <Card className="border-0 shadow-lg transition-all hover:shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto bg-primary/10 flex items-center justify-center rounded-full mb-4">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Business Client</CardTitle>
                <CardDescription className="text-base">
                  Register your business as a client
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Access your financial data and reports</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>View and approve transactions</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Communicate with your accounting team</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Provide documents and information</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0 space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => navigate("/auth/register/client")}
                >
                  Register Business
                </Button>
                
                {/* Test Login for Development */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-green-800">
                    <div className="font-medium mb-1">🧪 Test Login (Development)</div>
                    <div className="space-y-1 text-xs">
                      <div>Username: <code className="bg-green-100 px-1 rounded">testclient</code></div>
                      <div>Password: <code className="bg-green-100 px-1 rounded">password123</code></div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full mt-2 text-green-700 border-green-300 hover:bg-green-100"
                      onClick={() => navigate("/auth/login")}
                    >
                      Test Business Login
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>

            {/* Staff Member */}
            <Card className="border-0 shadow-lg transition-all hover:shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto bg-primary/10 flex items-center justify-center rounded-full mb-4">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Staff Member</CardTitle>
                <CardDescription className="text-base">
                  Join your accounting firm
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Join with your firm's invitation</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Access assigned client information</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Perform accounting tasks and workflows</span>
                  </li>
                  <li className="flex items-start">
                    <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Collaborate with your team</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  className="w-full" 
                  onClick={() => navigate("/auth/register/staff")}
                >
                  Register with Invitation
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <p className="mb-4 text-muted-foreground">
              Already have an account?
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/auth/login")}
            >
              Sign in to your account
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-neutral-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              title="Client Management" 
              description="Organize client information, track interactions, and manage relationships in one place."
              icon={<Users className="h-8 w-8 text-primary" />}
            />
            <FeatureCard 
              title="QBO Integration" 
              description="Sync financial data directly from QuickBooks Online, reducing manual data entry and errors."
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>}
            />
            <FeatureCard 
              title="Audit File Preparation" 
              description="Create and manage Canadian GAAP-compliant audit files with customizable sections."
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                <path d="m9 9 6 6" />
                <path d="m15 9-6 6" />
              </svg>}
            />
            <FeatureCard 
              title="Bookkeeping Tools" 
              description="Manage accounts, track transactions, reconcile bank feeds, and generate reports."
              icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 17.5v-11" />
              </svg>}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">AccountSync</h2>
            <p className="text-neutral-400 mb-6">
              The comprehensive platform for accounting professionals
            </p>
            <div className="flex justify-center space-x-4 mb-8">
              <Button variant="outline" className="border-white/20 hover:bg-white/10">
                About Us
              </Button>
              <Button variant="outline" className="border-white/20 hover:bg-white/10">
                Contact
              </Button>
              <Button variant="outline" className="border-white/20 hover:bg-white/10">
                Support
              </Button>
            </div>
            <p className="text-neutral-500 text-sm">
              © {new Date().getFullYear()} AccountSync. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md text-center">
      <div className="w-16 h-16 mx-auto bg-primary/10 flex items-center justify-center rounded-full mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}
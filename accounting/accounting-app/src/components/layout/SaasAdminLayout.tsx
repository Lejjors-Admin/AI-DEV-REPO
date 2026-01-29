/**
 * SaaS Admin Layout Component
 * 
 * Provides a collapsible, mobile-responsive layout for super admin users.
 * Features include sidebar collapse, mobile menu, tooltips, and modern design.
 */

import { CollapsibleSaasAdminLayout } from './CollapsibleSaasAdminLayout';

interface SaasAdminLayoutProps {
  children: React.ReactNode;
}

export function SaasAdminLayout({ children }: SaasAdminLayoutProps) {
  return <CollapsibleSaasAdminLayout>{children}</CollapsibleSaasAdminLayout>;
}

export default SaasAdminLayout;
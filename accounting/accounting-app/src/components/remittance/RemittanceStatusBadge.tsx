/**
 * REMITTANCE STATUS BADGE COMPONENT
 * 
 * Displays color-coded status indicators for tax remittances
 * Used across all remittance interface components
 */

import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  DollarSign,
  Calendar
} from "lucide-react";

type RemittanceStatus = 'pending' | 'overdue' | 'paid' | 'partially_paid' | 'cancelled';

interface RemittanceStatusBadgeProps {
  status: RemittanceStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RemittanceStatusBadge({ 
  status, 
  className = "", 
  showIcon = true,
  size = 'md'
}: RemittanceStatusBadgeProps) {
  const getStatusConfig = (status: RemittanceStatus) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
        };
      case 'pending':
        return {
          label: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
        };
      case 'overdue':
        return {
          label: 'Overdue',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
        };
      case 'partially_paid':
        return {
          label: 'Partially Paid',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: DollarSign,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: XCircle,
        };
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: Calendar,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${sizeClasses[size]} ${className} flex items-center gap-1.5`}
      data-testid={`status-badge-${status}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </Badge>
  );
}
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LucideIcon } from 'lucide-react';

interface AlertProps {
  message: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive';
  className?: string;
}

export const BaseAlert: React.FC<AlertProps> = ({ 
  message, 
  icon: Icon, 
  variant = 'default',
  className
}) => (
  <Alert variant={variant} className={`mb-4 ${className || ''}`}>
    <Icon className="h-4 w-4" />
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

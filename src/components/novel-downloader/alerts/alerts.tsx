import React from 'react';
import { BaseAlert } from './base-alert';
import { XCircle, Loader2, AlertCircle } from 'lucide-react';

export const ErrorAlert: React.FC<{ message: string }> = (props) => (
  <BaseAlert icon={XCircle} variant="destructive" {...props} />
);

export const ProgressAlert: React.FC<{ message: string }> = (props) => (
  <BaseAlert icon={Loader2} {...props} />
);

export const WarningAlert: React.FC<{ message: string; className?: string }> = (props) => (
  <BaseAlert icon={AlertCircle} {...props} />
);

'use client';

import { useToast } from '@/hooks/use-toast';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from './toast';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const icons = {
  default:     <Info className="h-4 w-4" />,
  destructive: <XCircle className="h-4 w-4" />,
  success:     <CheckCircle className="h-4 w-4" />,
  warning:     <AlertTriangle className="h-4 w-4" />,
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <div className="flex items-start gap-2.5 flex-1">
            <span className="mt-0.5 shrink-0">
              {icons[variant as keyof typeof icons] || icons.default}
            </span>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

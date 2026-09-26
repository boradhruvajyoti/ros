'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border p-4 shadow-2xl transition-all animate-fade-in opacity-100',
  {
    variants: {
      variant: {
        default:     'border-zinc-700 bg-zinc-900 text-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100',
        destructive: 'border-rose-600 bg-zinc-950 dark:bg-zinc-950 text-rose-200 ring-1 ring-rose-500/40 shadow-rose-950/40',
        success:     'border-emerald-600 bg-zinc-950 dark:bg-zinc-950 text-emerald-200 ring-1 ring-emerald-500/40 shadow-emerald-950/40',
        warning:     'border-amber-600 bg-zinc-950 dark:bg-zinc-950 text-amber-200 ring-1 ring-amber-500/40 shadow-amber-950/40',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn('rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none text-zinc-400 hover:text-zinc-100', className)}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('text-sm font-bold text-zinc-100', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn('text-xs text-zinc-300 font-medium', className)} {...props} />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastPrimitive.Action>;

export {
  type ToastProps, type ToastActionElement,
  ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose,
};

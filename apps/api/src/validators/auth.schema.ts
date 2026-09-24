// =============================================================================
// Auth validators — Zod schemas
// =============================================================================

import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[0-9]/, 'Must contain a number');

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
  branchId: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token:       z.string().min(1),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     passwordSchema,
});

export const onboardRestaurantSchema = z.object({
  name: z.string().min(2, 'Restaurant name must be at least 2 characters'),
  slug: z.string().optional(),
  cuisineType: z.string().optional(),
  plan: z.enum(['starter', 'professional', 'enterprise']).default('professional'),
  currency: z.string().default('INR'),
  timezone: z.string().default('Asia/Kolkata'),
  tagline: z.string().optional(),
  
  // Branch & Location
  branchName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  gstin: z.string().optional(),
  fssai: z.string().optional(),
  operatingHours: z.string().default('11:00 AM - 11:00 PM'),
  
  // Tax & Charges
  taxRate: z.coerce.number().min(0).max(100).default(5),
  serviceChargeRate: z.coerce.number().min(0).max(100).default(0),
  
  // Dining Modes
  diningModes: z.array(z.string()).optional(),
  
  // Kitchen & Tables
  kitchenStations: z.array(z.string()).optional(),
  floorName: z.string().default('Main Dining Floor'),
  tableCount: z.coerce.number().min(1).max(100).default(10),
  tableCapacity: z.coerce.number().min(1).max(50).default(4),
  customTables: z.array(z.object({
    name: z.string().optional(),
    capacity: z.coerce.number().min(1).max(50).default(4),
    shape: z.string().optional().transform((s) => {
      const upper = (s || 'SQUARE').toUpperCase();
      return ['RECTANGLE', 'CIRCLE', 'SQUARE'].includes(upper) ? (upper as 'RECTANGLE' | 'CIRCLE' | 'SQUARE') : 'SQUARE';
    }),
  })).optional(),
  
  // Menu Starter & Uploaded Menu
  menuTemplate: z.string().optional(),
  customMenuItems: z.array(z.object({
    name: z.string().min(1, 'Item name required'),
    category: z.string().default("Chef's Specials"),
    price: z.coerce.number().min(0).default(0),
    foodType: z.string().optional().transform((f) => {
      const upper = (f || 'VEG').toUpperCase().replace('-', '_');
      return ['VEG', 'NON_VEG', 'EGG', 'VEGAN'].includes(upper) ? (upper as 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN') : 'VEG';
    }),
    description: z.string().optional(),
    variants: z.array(z.object({
      name: z.string(),
      price: z.coerce.number().min(0).default(0),
    })).optional(),
  })).optional(),
  parsedMenuCategories: z.array(z.object({
    name: z.string(),
    items: z.array(z.object({
      name: z.string().min(1, 'Dish name required'),
      description: z.string().optional(),
      price: z.coerce.number().min(0).optional().default(0),
      foodType: z.string().optional().transform((f) => {
        const upper = (f || 'VEG').toUpperCase().replace('-', '_');
        return ['VEG', 'NON_VEG', 'EGG', 'VEGAN'].includes(upper) ? (upper as 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN') : 'VEG';
      }),
      variants: z.array(z.object({
        name: z.string(),
        price: z.coerce.number().min(0).default(0),
      })).optional(),
    })),
  })).optional(),
  
  // Owner Credentials
  ownerName: z.string().min(2, 'Owner name is required'),
  ownerEmail: z.string().email('Valid owner email is required'),
  ownerPassword: z.string().min(6, 'Password must be at least 6 characters'),
  ownerPhone: z.string().optional(),
});

export type LoginDto           = z.infer<typeof loginSchema>;
export type ForgotPasswordDto  = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto   = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordDto  = z.infer<typeof changePasswordSchema>;
export type OnboardRestaurantDto = z.infer<typeof onboardRestaurantSchema>;


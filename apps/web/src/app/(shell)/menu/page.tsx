'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed, Plus, Search, CheckCircle2,
  XCircle, Edit3, Trash2, Tag,
  UploadCloud, FileCheck, ShieldCheck, RefreshCw, Wand2, X, Check,
  Layers, ChevronRight, ChevronDown, ChevronUp, AlertCircle, Sparkles, CheckSquare, Square, FileDown, Loader2,
  Calendar, PartyPopper, Flame, Sliders, ToggleLeft, ToggleRight, Info,
  Gift, Percent, Eye, ArrowRight, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost, apiPatch, apiDelete, apiDownloadFile } from '@/lib/api';
import { formatCurrency } from '@ros/utils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function generateFoodLetterCode(name: string): string {
  if (!name) return 'ITM';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const code = words
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
  return code || 'ITM';
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  foodType: 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';
  spiceLevel: 'NONE' | 'MILD' | 'MEDIUM' | 'HOT' | 'EXTRA_HOT';
  isAvailable: boolean;
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string; parentId?: string | null; parent?: { id: string; name: string } | null };
  variants: Array<{ id: string; name: string; price: number; cost: number }>;
  letterCode?: string;
  itemNumber?: string;
  itemCode?: string;
  sku?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  children?: MenuCategory[];
  sortOrder: number;
  isActive?: boolean;
}

export interface SpecialMenuVariantConfig {
  id?: string;
  name: string;
  originalPrice: number;
  festivePrice: number;
}

export interface SpecialMenuItemConfig {
  itemId: string;
  name: string;
  foodType?: 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN' | string;
  categoryName?: string;
  imageUrl?: string;
  basePrice?: number;
  customPrice?: number;
  variants?: SpecialMenuVariantConfig[];
}

export interface SpecialMenu {
  id: string;
  name: string;
  occasion: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  categoryIds: string[];
  items?: SpecialMenuItemConfig[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoodType, setSelectedFoodType] = useState<string>('ALL');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Modal States
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isSpecialMenuModalOpen, setIsSpecialMenuModalOpen] = useState(false);
  const [editingSpecialMenu, setEditingSpecialMenu] = useState<SpecialMenu | null>(null);

  // Special Menu Form States
  const [specialMenuName, setSpecialMenuName] = useState('');
  const [specialMenuOccasion, setSpecialMenuOccasion] = useState('Diwali Special');
  const [specialMenuDescription, setSpecialMenuDescription] = useState('');
  const [specialMenuStartDate, setSpecialMenuStartDate] = useState('');
  const [specialMenuEndDate, setSpecialMenuEndDate] = useState('');
  const [specialMenuCategoryIds, setSpecialMenuCategoryIds] = useState<string[]>([]);
  const [specialMenuItems, setSpecialMenuItems] = useState<SpecialMenuItemConfig[]>([]);
  const [specialMenuIsActive, setSpecialMenuIsActive] = useState(true);
  const [specialMenuDishSearch, setSpecialMenuDishSearch] = useState('');
  const [specialMenuDishFilter, setSpecialMenuDishFilter] = useState<'ALL' | 'SELECTED' | 'VEG' | 'NON_VEG'>('ALL');
  const [expandedSpecialMenuId, setExpandedSpecialMenuId] = useState<string | null>(null);

  // Filter for Main Page Catalogue View (All vs Specific Festive Menu)
  const [selectedFestiveMenuFilter, setSelectedFestiveMenuFilter] = useState<string>('all');

  // Side Flyout Pop-up Modal States for Adding Dish to Festive Menu
  const [isAddToFestiveModalOpen, setIsAddToFestiveModalOpen] = useState(false);
  const [selectedDishForFestive, setSelectedDishForFestive] = useState<MenuItem | null>(null);
  const [targetFestiveMenuId, setTargetFestiveMenuId] = useState<string>('');
  const [flyoutCustomPrice, setFlyoutCustomPrice] = useState<number>(0);
  const [flyoutVariants, setFlyoutVariants] = useState<SpecialMenuVariantConfig[]>([]);

  // View All Festive Menus Modal
  const [isViewAllFestiveMenusOpen, setIsViewAllFestiveMenusOpen] = useState(false);
  const [viewingFestiveMenuDetails, setViewingFestiveMenuDetails] = useState<SpecialMenu | null>(null);

  // Quick subcategory creation in Dish Modal
  const [isQuickAddCategoryOpen, setIsQuickAddCategoryOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickCategoryParentId, setQuickCategoryParentId] = useState<string | null>(null);

  // Add/Edit Dish Form States
  const [dishName, setDishName] = useState('');
  const [dishCategoryId, setDishCategoryId] = useState('');
  const [dishDescription, setDishDescription] = useState('');
  const [dishFoodType, setDishFoodType] = useState<'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN'>('VEG');
  const [dishSpiceLevel, setDishSpiceLevel] = useState<'NONE' | 'MILD' | 'MEDIUM' | 'HOT' | 'VERY_HOT'>('NONE');
  
  // Pricing & Variant Model: Single, Half/Full, Small/Medium/Large, Custom
  const [dishPricingType, setDishPricingType] = useState<'single' | 'half_full' | 'small_medium_large' | 'custom'>('single');
  const [dishSinglePrice, setDishSinglePrice] = useState<number>(250);
  const [dishHalfPrice, setDishHalfPrice] = useState<number>(180);
  const [dishFullPrice, setDishFullPrice] = useState<number>(320);
  const [dishSmallPrice, setDishSmallPrice] = useState<number>(149);
  const [dishMediumPrice, setDishMediumPrice] = useState<number>(249);
  const [dishLargePrice, setDishLargePrice] = useState<number>(379);
  const [dishCustomVariants, setDishCustomVariants] = useState<Array<{ name: string; price: number }>>([
    { name: 'Standard Portion', price: 250 },
  ]);

  // Category Management States
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; parentId?: string | null } | null>(null);

  // Menu OCR Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scannedCategories, setScannedCategories] = useState<Array<{
    name: string;
    items: Array<{
      name: string;
      description: string;
      foodType: 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';
      variants: Array<{ name: string; price: number }>;
    }>;
  }>>([]);
  const [scanInfo, setScanInfo] = useState<{
    fileName: string;
    itemCount: number;
    cleanedUp: boolean;
  } | null>(null);

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportMenuPdf = async () => {
    setIsExportingPdf(true);
    toast.info('Generating Menu PDF 📄', 'Crafting your restaurant-grade menu design. Download will start shortly...');
    try {
      await apiDownloadFile('/menu/export-pdf', 'Restaurant_Menu.pdf');
      toast.success('Menu Downloaded! 🎉', 'Your menu PDF was exported successfully with zero server storage.');
    } catch (err: any) {
      toast.error('Export Failed', err?.response?.data?.error?.message || err?.message || 'Could not export menu PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<MenuCategory[]>({
    queryKey: ['menu', 'categories'],
    queryFn: () => apiGet<MenuCategory[]>('/menu/categories'),
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery<MenuItem[]>({
    queryKey: ['menu', 'items'],
    queryFn: () => apiGet<MenuItem[]>('/menu/items'),
  });

  // Special Menus Query
  const { data: specialMenuData, isLoading: isLoadingSpecialMenus } = useQuery<{
    menus: SpecialMenu[];
    activeMode: 'ALL' | 'MAIN_ONLY' | 'SPECIAL_ONLY';
    activeSpecialMenuId?: string;
  }>({
    queryKey: ['menu', 'special-menus'],
    queryFn: async () => {
      try {
        const res = await apiGet<any>('/menu/special-menus');
        return res || { menus: [], activeMode: 'ALL' };
      } catch {
        return { menus: [], activeMode: 'ALL' };
      }
    },
  });

  const specialMenus = specialMenuData?.menus || [];
  const activeMenuMode = specialMenuData?.activeMode || 'ALL';

  // Derived top-level and subcategories
  const topLevelCategories = categories.filter((c) => !c.parentId);
  const getSubcategories = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  // Mutations
  const createDishMutation = useMutation({
    mutationFn: async (payload: any) => apiPost('/menu/items', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
      toast.success('Dish Added', 'New dish added to menu catalogue.');
      setIsAddDishOpen(false);
      resetDishForm();
    },
    onError: (err: any) => toast.error('Failed to Add Dish', err.message),
  });

  const updateDishMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => apiPatch(`/menu/items/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
      toast.success('Dish Updated', 'Dish details updated.');
      setEditingDish(null);
      resetDishForm();
    },
    onError: (err: any) => toast.error('Update Failed', err.message),
  });

  const deleteDishMutation = useMutation({
    mutationFn: async (id: string) => apiDelete(`/menu/items/${id}`),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
      setSelectedItemIds((prev) => prev.filter((i) => i !== deletedId));
      toast.success('Dish Deleted', 'Item removed from active menu.');
    },
    onError: (err: any) => toast.error('Delete Failed', err.message),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => apiPost('/menu/items/batch-delete', { ids }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
      setSelectedItemIds([]);
      toast.success('Dishes Deleted', res?.message || 'Selected items removed from active menu.');
    },
    onError: (err: any) => toast.error('Bulk Delete Failed', err.message),
  });

  const batchAvailabilityMutation = useMutation({
    mutationFn: async ({ ids, isAvailable }: { ids: string[]; isAvailable: boolean }) => {
      await Promise.all(ids.map((id) => apiPatch(`/menu/items/${id}/availability`, { isAvailable })));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
      toast.success(
        variables.isAvailable ? 'Items Available' : 'Items 86’d (Unavailable)',
        `Updated availability for ${variables.ids.length} dishes.`
      );
    },
    onError: (err: any) => toast.error('Batch Update Failed', err.message),
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      apiPatch(`/menu/items/${id}/availability`, { isAvailable }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
      toast.success(
        variables.isAvailable ? 'Item Available' : 'Item 86’d (Unavailable)',
        'Kitchen and POS displays synchronized.'
      );
    },
    onError: (err: any) => toast.error('Toggle Failed', err.message),
  });

  const createCategoryMutation = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) =>
      apiPost('/menu/categories', { name, parentId: parentId || null, sortOrder: categories.length + 1 }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'categories'] });
      toast.success(
        res?.parentId ? 'Subcategory Created' : 'Category Created',
        res?.parentId ? `Subcategory "${res.name}" created.` : `Category "${res?.name || 'New'}" added.`
      );
      setNewCategoryName('');
      setNewCategoryParentId(null);
      if (isQuickAddCategoryOpen && res?.id) {
        setDishCategoryId(res.id);
        setIsQuickAddCategoryOpen(false);
        setQuickCategoryName('');
        setQuickCategoryParentId(null);
      }
    },
    onError: (err: any) => toast.error('Category Creation Failed', err.message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name, parentId }: { id: string; name: string; parentId?: string | null }) =>
      apiPatch(`/menu/categories/${id}`, { name, ...(parentId !== undefined ? { parentId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'categories'] });
      toast.success('Category Updated', 'Category modified.');
      setEditingCategory(null);
    },
    onError: (err: any) => toast.error('Category Update Failed', err.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => apiDelete(`/menu/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
      toast.success('Category Deactivated', 'Category deactivated.');
    },
    onError: (err: any) => toast.error('Delete Failed', err.message),
  });

  // Active Menu Mode Mutation
  const setActiveMenuModeMutation = useMutation({
    mutationFn: async (payload: { mode: 'ALL' | 'MAIN_ONLY' | 'SPECIAL_ONLY'; activeSpecialMenuId?: string }) =>
      apiPost('/menu/active-mode', payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'special-menus'] });
      queryClient.invalidateQueries({ queryKey: ['pos-menu'] });
      const modeLabels = {
        ALL: 'Both Regular & Festive Menus are Active 🔥',
        MAIN_ONLY: 'Main Everyday Menu is Active 🌟',
        SPECIAL_ONLY: 'Festive / Special Menu is Exclusively Active 🎉',
      };
      toast.success('Active Menu Updated', modeLabels[variables.mode]);
    },
    onError: (err: any) => toast.error('Failed to change active menu', err.message),
  });

  // Special Menu Mutations
  const createSpecialMenuMutation = useMutation({
    mutationFn: async (payload: any) => apiPost('/menu/special-menus', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'special-menus'] });
      toast.success('Special Menu Created! 🎉', 'Festive special menu has been added.');
      setIsSpecialMenuModalOpen(false);
      resetSpecialMenuForm();
    },
    onError: (err: any) => toast.error('Creation Failed', err.message),
  });

  const updateSpecialMenuMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) =>
      apiPatch(`/menu/special-menus/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'special-menus'] });
      toast.success('Special Menu Updated ✨', 'Festive menu changes saved.');
      setIsSpecialMenuModalOpen(false);
      resetSpecialMenuForm();
    },
    onError: (err: any) => toast.error('Update Failed', err.message),
  });

  const deleteSpecialMenuMutation = useMutation({
    mutationFn: async (id: string) => apiDelete(`/menu/special-menus/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'special-menus'] });
      toast.success('Special Menu Deleted', 'Festive menu removed.');
    },
    onError: (err: any) => toast.error('Delete Failed', err.message),
  });

  const addDishToFestiveMenuMutation = useMutation({
    mutationFn: async ({ menuId, payload }: { menuId: string; payload: any }) =>
      apiPost(`/menu/special-menus/${menuId}/items`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'special-menus'] });
      toast.success('Added to Festive Menu! 🎉', `Dish saved in festive menu.`);
      setIsAddToFestiveModalOpen(false);
      setSelectedDishForFestive(null);
    },
    onError: (err: any) => toast.error('Failed to add dish to festive menu', err.message),
  });

  const removeDishFromFestiveMenuMutation = useMutation({
    mutationFn: async ({ menuId, itemId }: { menuId: string; itemId: string }) =>
      apiDelete(`/menu/special-menus/${menuId}/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'special-menus'] });
      toast.success('Removed from Festive Menu', `Dish removed from festive menu.`);
      setIsAddToFestiveModalOpen(false);
      setSelectedDishForFestive(null);
    },
    onError: (err: any) => toast.error('Failed to remove dish', err.message),
  });

  const resetSpecialMenuForm = () => {
    setEditingSpecialMenu(null);
    setSpecialMenuName('');
    setSpecialMenuOccasion('Festive Season');
    setSpecialMenuDescription('');
    setSpecialMenuStartDate('');
    setSpecialMenuEndDate('');
    setSpecialMenuCategoryIds([]);
    setSpecialMenuItems([]);
    setSpecialMenuIsActive(true);
    setSpecialMenuDishSearch('');
    setSpecialMenuDishFilter('ALL');
  };

  const handleOpenCreateSpecialMenu = () => {
    resetSpecialMenuForm();
    setIsSpecialMenuModalOpen(true);
  };

  const handleOpenEditSpecialMenu = (m: SpecialMenu) => {
    setEditingSpecialMenu(m);
    setSpecialMenuName(m.name);
    setSpecialMenuOccasion(m.occasion || 'Festive Season');
    setSpecialMenuDescription(m.description || '');
    setSpecialMenuStartDate(m.startDate || '');
    setSpecialMenuEndDate(m.endDate || '');
    setSpecialMenuCategoryIds(m.categoryIds || []);
    setSpecialMenuItems(Array.isArray(m.items) ? [...m.items] : []);
    setSpecialMenuIsActive(m.isActive !== false);
    setSpecialMenuDishSearch('');
    setSpecialMenuDishFilter('ALL');
    setIsSpecialMenuModalOpen(true);
  };

  // Helper: Import all catalog dishes with their current pricing into the festive menu
  const handleImportAllDishesToSpecialMenu = () => {
    const imported: SpecialMenuItemConfig[] = items.map((itm) => {
      const basePrice = itm.variants?.[0]?.price || 200;
      return {
        itemId: itm.id,
        name: itm.name,
        foodType: itm.foodType,
        categoryName: itm.category?.name || 'General',
        basePrice,
        customPrice: basePrice,
        variants: (itm.variants || []).map((v) => ({
          id: v.id,
          name: v.name,
          originalPrice: v.price,
          festivePrice: v.price,
        })),
      };
    });
    setSpecialMenuItems(imported);
    toast.success('Imported All Dishes! ⚡', `Loaded ${imported.length} items with default pricing. You can now adjust festive prices.`);
  };

  // Helper: Toggle individual dish inclusion in festive menu
  const handleToggleDishInSpecialMenu = (item: MenuItem) => {
    const isPresent = specialMenuItems.some((i) => i.itemId === item.id);
    if (isPresent) {
      setSpecialMenuItems((prev) => prev.filter((i) => i.itemId !== item.id));
    } else {
      const basePrice = item.variants?.[0]?.price || 200;
      const newItem: SpecialMenuItemConfig = {
        itemId: item.id,
        name: item.name,
        foodType: item.foodType,
        categoryName: item.category?.name || 'General',
        basePrice,
        customPrice: basePrice,
        variants: (item.variants || []).map((v) => ({
          id: v.id,
          name: v.name,
          originalPrice: v.price,
          festivePrice: v.price,
        })),
      };
      setSpecialMenuItems((prev) => [...prev, newItem]);
    }
  };

  // Helper: Update custom price for standard single-portion dish in special menu
  const handleUpdateSpecialMenuItemCustomPrice = (itemId: string, newPrice: number) => {
    const safePrice = Math.max(0, newPrice);
    setSpecialMenuItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, customPrice: safePrice } : i))
    );
  };

  // Helper: Update variant price for multi-variant dish in special menu
  const handleUpdateSpecialMenuVariantPrice = (itemId: string, varIdx: number, newPrice: number) => {
    const safePrice = Math.max(0, newPrice);
    setSpecialMenuItems((prev) =>
      prev.map((i) => {
        if (i.itemId !== itemId) return i;
        const variants = (i.variants || []).map((v, idx) => (idx === varIdx ? { ...v, festivePrice: safePrice } : v));
        return { ...i, variants };
      })
    );
  };

  // Helper: Apply bulk percentage discount or surcharge to all imported festive dishes
  const handleApplyBatchFestiveAdjustment = (percentage: number) => {
    const factor = 1 + percentage / 100;
    setSpecialMenuItems((prev) =>
      prev.map((i) => {
        const base = i.basePrice || i.customPrice || 200;
        const customPrice = Math.round(base * factor);
        const variants = (i.variants || []).map((v) => ({
          ...v,
          festivePrice: Math.round(v.originalPrice * factor),
        }));
        return { ...i, customPrice, variants };
      })
    );
    toast.success(
      'Festive Pricing Applied',
      percentage >= 0
        ? `Applied +${percentage}% festive surcharge across all festive items.`
        : `Applied ${percentage}% discount across all festive items.`
    );
  };

  const handleSaveSpecialMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialMenuName.trim()) {
      toast.error('Name Required', 'Please enter a name for the special festive menu.');
      return;
    }
    const payload = {
      name: specialMenuName.trim(),
      occasion: specialMenuOccasion.trim(),
      description: specialMenuDescription.trim() || undefined,
      startDate: specialMenuStartDate || undefined,
      endDate: specialMenuEndDate || undefined,
      categoryIds: specialMenuCategoryIds,
      items: specialMenuItems,
      isActive: specialMenuIsActive,
    };
    if (editingSpecialMenu) {
      updateSpecialMenuMutation.mutate({ id: editingSpecialMenu.id, payload });
    } else {
      createSpecialMenuMutation.mutate(payload);
    }
  };

  // Helper: Open Side Flyout Pop-up for "+ Add to Festive Menu" on Food Item Card
  const handleOpenAddToFestive = (item: MenuItem) => {
    if (specialMenus.length === 0) {
      toast.info('No Festive Menu Configured', 'Please create a festive menu first before adding dishes.');
      handleOpenCreateSpecialMenu();
      return;
    }

    setSelectedDishForFestive(item);
    const initialTargetId = (activeMenuMode === 'SPECIAL_ONLY' && specialMenuData?.activeSpecialMenuId)
      ? specialMenuData.activeSpecialMenuId
      : specialMenus[0].id;
    setTargetFestiveMenuId(initialTargetId);

    const targetMenu = specialMenus.find((m) => m.id === initialTargetId);
    const existingConfig = targetMenu?.items?.find((i) => i.itemId === item.id);

    if (existingConfig) {
      setFlyoutCustomPrice(existingConfig.customPrice ?? (item.variants?.[0]?.price || 200));
      setFlyoutVariants(
        existingConfig.variants && existingConfig.variants.length > 0
          ? existingConfig.variants
          : (item.variants || []).map((v) => ({
              id: v.id,
              name: v.name,
              originalPrice: v.price,
              festivePrice: v.price,
            }))
      );
    } else {
      const defaultPrice = item.variants?.[0]?.price || 200;
      setFlyoutCustomPrice(defaultPrice);
      setFlyoutVariants(
        (item.variants || []).map((v) => ({
          id: v.id,
          name: v.name,
          originalPrice: v.price,
          festivePrice: v.price,
        }))
      );
    }

    setIsAddToFestiveModalOpen(true);
  };

  const handleSelectTargetFestiveMenu = (menuId: string) => {
    setTargetFestiveMenuId(menuId);
    if (!selectedDishForFestive) return;
    const targetMenu = specialMenus.find((m) => m.id === menuId);
    const existingConfig = targetMenu?.items?.find((i) => i.itemId === selectedDishForFestive.id);

    if (existingConfig) {
      setFlyoutCustomPrice(existingConfig.customPrice ?? (selectedDishForFestive.variants?.[0]?.price || 200));
      setFlyoutVariants(
        existingConfig.variants && existingConfig.variants.length > 0
          ? existingConfig.variants
          : (selectedDishForFestive.variants || []).map((v) => ({
              id: v.id,
              name: v.name,
              originalPrice: v.price,
              festivePrice: v.price,
            }))
      );
    } else {
      const defaultPrice = selectedDishForFestive.variants?.[0]?.price || 200;
      setFlyoutCustomPrice(defaultPrice);
      setFlyoutVariants(
        (selectedDishForFestive.variants || []).map((v) => ({
          id: v.id,
          name: v.name,
          originalPrice: v.price,
          festivePrice: v.price,
        }))
      );
    }
  };

  const handleSaveDishToFestiveMenu = () => {
    if (!selectedDishForFestive || !targetFestiveMenuId) return;

    const payload = {
      itemId: selectedDishForFestive.id,
      name: selectedDishForFestive.name,
      foodType: selectedDishForFestive.foodType,
      categoryName: selectedDishForFestive.category?.name || 'General',
      basePrice: selectedDishForFestive.variants?.[0]?.price || 200,
      customPrice: flyoutCustomPrice,
      variants: flyoutVariants.length > 0 ? flyoutVariants : undefined,
    };

    addDishToFestiveMenuMutation.mutate({ menuId: targetFestiveMenuId, payload });
  };

  const resetDishForm = () => {
    setDishName('');
    setDishCategoryId(categories[0]?.id || '');
    setDishDescription('');
    setDishFoodType('VEG');
    setDishSpiceLevel('NONE');
    setDishPricingType('single');
    setDishSinglePrice(250);
    setDishHalfPrice(180);
    setDishFullPrice(320);
    setDishSmallPrice(149);
    setDishMediumPrice(249);
    setDishLargePrice(379);
    setDishCustomVariants([{ name: 'Standard Portion', price: 250 }]);
  };

  const handleOpenAddDish = () => {
    resetDishForm();
    if (categories.length > 0) {
      setDishCategoryId(categories[0].id);
    }
    setIsAddDishOpen(true);
  };

  const handleOpenEditDish = (item: MenuItem) => {
    setEditingDish(item);
    setDishName(item.name);
    setDishCategoryId(item.categoryId || item.category?.id || categories[0]?.id || '');
    setDishDescription(item.description || '');
    setDishFoodType(item.foodType);
    setDishSpiceLevel((item.spiceLevel as any) || 'NONE');

    if (item.variants && item.variants.length > 1) {
      const vNames = item.variants.map((v) => v.name.toLowerCase());
      const hasSmallMediumLarge = vNames.some((n) => n.includes('small') || n.includes('medium') || n.includes('large'));
      const hasHalfFull = vNames.some((n) => n.includes('half') || n.includes('full'));

      if (hasSmallMediumLarge) {
        setDishPricingType('small_medium_large');
        const s = item.variants.find((v) => v.name.toLowerCase().includes('small'));
        const m = item.variants.find((v) => v.name.toLowerCase().includes('medium'));
        const l = item.variants.find((v) => v.name.toLowerCase().includes('large'));
        setDishSmallPrice(s?.price || item.variants[0]?.price || 149);
        setDishMediumPrice(m?.price || item.variants[1]?.price || 249);
        setDishLargePrice(l?.price || item.variants[2]?.price || 379);
      } else if (hasHalfFull) {
        setDishPricingType('half_full');
        const half = item.variants.find((v) => v.name.toLowerCase().includes('half'));
        const full = item.variants.find((v) => v.name.toLowerCase().includes('full')) || item.variants[1];
        setDishHalfPrice(half?.price || item.variants[0]?.price || 180);
        setDishFullPrice(full?.price || item.variants[1]?.price || 320);
      } else {
        setDishPricingType('custom');
        setDishCustomVariants(item.variants.map((v) => ({ name: v.name, price: Number(v.price) })));
      }
    } else {
      setDishPricingType('single');
      setDishSinglePrice(item.variants?.[0]?.price || 200);
    }
  };

  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) {
      toast.error('Dish Name Required', 'Please enter a name for the dish.');
      return;
    }
    if (!dishCategoryId) {
      toast.error('Category Required', 'Please select or create a category first.');
      return;
    }

    let variants: Array<{ name: string; price: number; cost: number; sortOrder: number }> = [];

    if (dishPricingType === 'single') {
      const p = Number(dishSinglePrice) || 100;
      variants = [{ name: 'Regular Portion', price: p, cost: p * 0.35, sortOrder: 1 }];
    } else if (dishPricingType === 'half_full') {
      const h = Number(dishHalfPrice) || 100;
      const f = Number(dishFullPrice) || 200;
      variants = [
        { name: 'Half', price: h, cost: h * 0.35, sortOrder: 1 },
        { name: 'Full', price: f, cost: f * 0.35, sortOrder: 2 },
      ];
    } else if (dishPricingType === 'small_medium_large') {
      const s = Number(dishSmallPrice) || 149;
      const m = Number(dishMediumPrice) || 249;
      const l = Number(dishLargePrice) || 379;
      variants = [
        { name: 'Small', price: s, cost: s * 0.35, sortOrder: 1 },
        { name: 'Medium', price: m, cost: m * 0.35, sortOrder: 2 },
        { name: 'Large', price: l, cost: l * 0.35, sortOrder: 3 },
      ];
    } else if (dishPricingType === 'custom') {
      const valid = dishCustomVariants.filter((v) => v.name.trim() && v.price > 0);
      if (valid.length === 0) {
        toast.error('Variants Required', 'Please provide at least one valid variant with a price.');
        return;
      }
      variants = valid.map((v, idx) => ({
        name: v.name.trim(),
        price: Number(v.price),
        cost: Number(v.price) * 0.35,
        sortOrder: idx + 1,
      }));
    }

    const payload = {
      name: dishName.trim(),
      categoryId: dishCategoryId,
      description: dishDescription.trim() || undefined,
      foodType: dishFoodType,
      spiceLevel: dishSpiceLevel,
      variants,
      isAvailable: true,
      isActive: true,
    };

    if (editingDish) {
      updateDishMutation.mutate({ id: editingDish.id, payload });
    } else {
      createDishMutation.mutate(payload);
    }
  };

  // Local OCR Menu File Upload
  const handleMenuUpload = async (file: File) => {
    if (!file) return;
    setIsScanning(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res: any = await apiPost('/menu/upload-parse', {
            imageBase64: base64Data,
            fileName: file.name,
            mimeType: file.type,
          });

          if (res.categories && res.categories.length > 0) {
            setScannedCategories(res.categories);
            setScanInfo({
              fileName: file.name,
              itemCount: res.totalItems || 0,
              cleanedUp: !!res.serverFileCleanedUp,
            });
            toast.success(
              'Menu Card Scanned!',
              `Detected ${res.totalItems} dishes with Full/Half variant pricing. Uploaded image safely deleted from server disk.`
            );
          } else {
            toast.info('No Dishes Found', 'Could not extract dishes from the image.');
          }
        } catch (err: any) {
          toast.error('Scan Error', err.message || 'Failed to parse menu card.');
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsScanning(false);
      toast.error('File Error', 'Failed to read menu file.');
    }
  };

  const handleLoadSample = async () => {
    setIsScanning(true);
    try {
      const sampleText = `
STARTERS & SOUPS
1. Veg Manchow Soup - 180 (Crispy noodles, ginger garlic broth) [VEG]
2. Kung Pao Chicken Dumplings - Half: 220, Full: 380 (Tossed in Szechuan chili oil) [NON_VEG]
3. Crispy Honey Chili Lotus Stem - 320 (Toasted sesame, scallions) [VEG]

MAIN COURSE & NOODLES
4. Classic Butter Chicken - Half: 260, Full: 480 (Rich cashew tomato butter sauce) [NON_VEG]
5. Paneer Tikka Butter Masala - Half: 220, Full: 420 (Charred tandoori paneer) [VEG]
6. Hakka Garlic Noodles - Half: 190, Full: 340 (Julienned greens, roasted garlic) [VEG]
7. Hyderabadi Dum Biryani - Half: 280, Full: 520 (Fragrant saffron basmati) [NON_VEG]

DESSERTS & DRINKS
8. Belgian Chocolate Lava Cake - 240 (Warm molten chocolate center) [VEG]
9. Mango Basil Cold Brew Iced Tea - 180 (Brewed with fresh Alphonso puree) [VEG]
      `;
      const res: any = await apiPost('/menu/upload-parse', { sampleText, fileName: 'sample-menu.txt' });
      if (res.categories) {
        setScannedCategories(res.categories);
        setScanInfo({
          fileName: 'Sample Multi-Cuisine Menu',
          itemCount: res.totalItems || 0,
          cleanedUp: true,
        });
        toast.success('Sample Menu Loaded', `Detected ${res.totalItems} items.`);
      }
    } catch (err: any) {
      toast.error('Sample Failed', err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBatchImport = async () => {
    if (scannedCategories.length === 0) return;
    setIsImporting(true);
    try {
      const res: any = await apiPost('/menu/batch-import', { categories: scannedCategories });
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['menu', 'categories'] });
      toast.success('Dishes Imported!', res.message || 'Menu catalog has been updated.');
      setIsScanModalOpen(false);
      setScannedCategories([]);
    } catch (err: any) {
      toast.error('Import Failed', err.message || 'Could not import dishes.');
    } finally {
      setIsImporting(false);
    }
  };

  const removeScannedCategory = (catIdx: number) => {
    setScannedCategories((prev) => prev.filter((_, i) => i !== catIdx));
  };

  const removeScannedItem = (catIdx: number, itemIdx: number) => {
    setScannedCategories((prev) =>
      prev.map((cat, cI) => {
        if (cI !== catIdx) return cat;
        return {
          ...cat,
          items: cat.items.filter((_, iI) => iI !== itemIdx),
        };
      }).filter((cat) => cat.items.length > 0)
    );
  };

  const updateScannedPrice = (catIdx: number, itemIdx: number, varIdx: number, newPrice: number) => {
    setScannedCategories((prev) =>
      prev.map((cat, cI) => {
        if (cI !== catIdx) return cat;
        return {
          ...cat,
          items: cat.items.map((item, iI) => {
            if (iI !== itemIdx) return item;
            return {
              ...item,
              variants: item.variants.map((v, vI) => (vI === varIdx ? { ...v, price: newPrice } : v)),
            };
          }),
        };
      })
    );
  };

  const getFoodTypeBadge = (type: MenuItem['foodType']) => {
    switch (type) {
      case 'VEG':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">🟢 Veg</span>;
      case 'NON_VEG':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">🔴 Non-Veg</span>;
      case 'EGG':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">🟡 Egg</span>;
      case 'VEGAN':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">🌱 Vegan</span>;
      default:
        return null;
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    // Festive menu filter
    if (selectedFestiveMenuFilter !== 'all') {
      if (selectedFestiveMenuFilter === 'main') {
        // Main catalogue filter
      } else {
        const targetMenu = specialMenus.find((m) => m.id === selectedFestiveMenuFilter);
        if (targetMenu) {
          const isExplicitlyInMenu = targetMenu.items?.some((i) => i.itemId === item.id);
          const isCatInMenu = targetMenu.categoryIds && targetMenu.categoryIds.length > 0
            ? targetMenu.categoryIds.includes(item.categoryId || item.category?.id)
            : false;
          if (!isExplicitlyInMenu && !isCatInMenu) return false;
        }
      }
    }

    const itemCatId = item.categoryId || item.category?.id;
    const childCategoryIds = categories.filter((c) => c.parentId === selectedCategoryId).map((c) => c.id);
    const matchesCat =
      selectedCategoryId === 'all' ||
      itemCatId === selectedCategoryId ||
      childCategoryIds.includes(itemCatId);
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.itemCode && item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType =
      selectedFoodType === 'ALL' || item.foodType === selectedFoodType;
    return matchesCat && matchesSearch && matchesType;
  });

  const selectedFestiveMenuObj = specialMenus.find((m) => m.id === selectedFestiveMenuFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
            Menu Catalogue
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} dishes across {categories.length} categories &amp; subcategories · Live real-time POS catalogue
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleExportMenuPdf}
            disabled={isExportingPdf || items.length === 0}
            variant="outline"
            className="gap-2 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-500 shadow-sm cursor-pointer rounded-none"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Export Menu PDF
          </Button>
          <Button
            onClick={() => setIsViewAllFestiveMenusOpen(true)}
            variant="outline"
            className="gap-2 border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 shadow-sm cursor-pointer font-semibold rounded-none"
          >
            <Eye className="w-4 h-4 text-purple-400" /> View All Festive Menus ({specialMenus.length})
          </Button>
          <Button
            onClick={handleOpenCreateSpecialMenu}
            variant="outline"
            className="gap-2 border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 shadow-sm cursor-pointer font-semibold rounded-none"
          >
            <PartyPopper className="w-4 h-4 text-purple-400" /> + Festive / Occasion Menu
          </Button>
          <Button
            onClick={() => setIsScanModalOpen(true)}
            variant="outline"
            className="gap-2 border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary shadow-sm cursor-pointer rounded-none"
          >
            <Wand2 className="w-4 h-4" /> Scan Menu Card
          </Button>
          <Button
            onClick={() => setIsManageCategoriesOpen(true)}
            variant="outline"
            className="gap-2 cursor-pointer rounded-none"
          >
            <Tag className="w-4 h-4" /> Manage Categories
          </Button>
          <Button
            onClick={handleOpenAddDish}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer rounded-none"
          >
            <Plus className="w-4 h-4" /> Add Dish
          </Button>
        </div>
      </div>

      {/* SPECIAL FESTIVE MENU & ACTIVE MODE SWITCHER BAR */}
      <div className="p-4 rounded-none border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-card/60 backdrop-blur-md shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-none bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
            <PartyPopper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">Active Menu Configuration</span>
              <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/15 border-purple-500/30 text-purple-300 rounded-none">
                {activeMenuMode === 'ALL'
                  ? 'Both Menus Live (Main + Festive)'
                  : activeMenuMode === 'SPECIAL_ONLY'
                  ? 'Festive Special Menu Only'
                  : 'Main Regular Menu Only'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select which menu catalogue is actively served to POS terminals and customer QR standees during festivals &amp; occasions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex rounded-none bg-muted/60 p-1 border border-border">
            <button
              type="button"
              onClick={() => setActiveMenuModeMutation.mutate({ mode: 'MAIN_ONLY' })}
              disabled={setActiveMenuModeMutation.isPending}
              className={cn(
                'px-3 py-1.5 rounded-none text-xs font-semibold transition-all flex items-center gap-1.5',
                activeMenuMode === 'MAIN_ONLY'
                  ? 'bg-card text-foreground shadow-sm border border-border/80'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>🌟 Main Menu Only</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMenuModeMutation.mutate({ mode: 'SPECIAL_ONLY' })}
              disabled={setActiveMenuModeMutation.isPending}
              className={cn(
                'px-3 py-1.5 rounded-none text-xs font-semibold transition-all flex items-center gap-1.5',
                activeMenuMode === 'SPECIAL_ONLY'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>🎉 Festive Menu Only</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMenuModeMutation.mutate({ mode: 'ALL' })}
              disabled={setActiveMenuModeMutation.isPending}
              className={cn(
                'px-3 py-1.5 rounded-none text-xs font-semibold transition-all flex items-center gap-1.5',
                activeMenuMode === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span>🔥 Both Menus Live</span>
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenCreateSpecialMenu}
            className="text-xs h-9 px-3 gap-1.5 border-purple-500/40 hover:bg-purple-500/20 text-purple-300 rounded-none"
          >
            <Plus className="w-3.5 h-3.5" /> New Festive Menu
          </Button>
        </div>
      </div>

      {/* FESTIVE MENUS FILTER STRIP (Admin Quick Switcher) */}
      {specialMenus.length > 0 && (
        <div className="p-3 bg-muted/20 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-none">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-purple-400" /> Filter by Menu:
            </span>
            <button
              type="button"
              onClick={() => setSelectedFestiveMenuFilter('all')}
              className={cn(
                'px-3 py-1 text-xs font-semibold border transition-all rounded-none',
                selectedFestiveMenuFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card text-muted-foreground hover:text-foreground border-border'
              )}
            >
              All Dishes ({items.length})
            </button>
            {specialMenus.map((sm) => {
              const count = sm.items?.length || 0;
              const isSelected = selectedFestiveMenuFilter === sm.id;
              return (
                <button
                  key={sm.id}
                  type="button"
                  onClick={() => setSelectedFestiveMenuFilter(sm.id)}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold border transition-all flex items-center gap-1.5 rounded-none',
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-card text-purple-300 border-purple-500/30 hover:bg-purple-500/10'
                  )}
                >
                  <PartyPopper className="w-3 h-3" />
                  <span>{sm.name}</span>
                  <Badge variant="outline" className={cn(
                    'text-[10px] font-mono px-1 py-0 rounded-none',
                    isSelected ? 'border-white/30 text-white' : 'border-purple-500/30 text-purple-300'
                  )}>
                    {count} dishes
                  </Badge>
                </button>
              );
            })}
          </div>

          {selectedFestiveMenuObj && (
            <div className="flex items-center gap-2 shrink-0 text-xs">
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/30 rounded-none">
                Occasion: {selectedFestiveMenuObj.occasion}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEditSpecialMenu(selectedFestiveMenuObj)}
                className="h-7 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/20 gap-1 rounded-none"
              >
                <Edit3 className="w-3 h-3" /> Edit Festive Menu
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Categories & Filter Bar */}
      <div className="flex flex-col gap-4">
        {/* Category Chips */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                selectedCategoryId === 'all'
                  ? 'bg-primary text-primary-foreground shadow-md font-semibold'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border'
              )}
            >
              All Items ({items.length})
            </button>
            {topLevelCategories.map((cat) => {
              const childIds = getSubcategories(cat.id).map((c) => c.id);
              const count = items.filter((i) => {
                const cId = i.categoryId || i.category?.id;
                return cId === cat.id || childIds.includes(cId);
              }).length;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md font-semibold'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border'
                  )}
                >
                  <span>{cat.name}</span>
                  <span className="text-xs opacity-75">({count})</span>
                </button>
              );
            })}
            {categories.length === 0 && (
              <button
                onClick={() => setIsManageCategoriesOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-dashed text-xs text-primary font-medium hover:bg-primary/10"
              >
                + Create Category
              </button>
            )}
          </div>

          {/* Subcategory Pills Row (if selected category has children) */}
          {selectedCategoryId !== 'all' && getSubcategories(selectedCategoryId).length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pl-2 py-1 bg-muted/30 border border-border/40 rounded-xl">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-2 flex items-center gap-1">
                <Layers className="w-3 h-3 text-primary" /> Subcategories:
              </span>
              <button
                onClick={() => setSelectedCategoryId(selectedCategoryId)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border',
                  selectedCategoryId === selectedCategoryId
                    ? 'bg-primary/15 border-primary/40 text-primary font-bold'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                )}
              >
                All in {categories.find((c) => c.id === selectedCategoryId)?.name}
              </button>
              {getSubcategories(selectedCategoryId).map((sub) => {
                const subCount = items.filter((i) => (i.categoryId || i.category?.id) === sub.id).length;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedCategoryId(sub.id)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-1',
                      selectedCategoryId === sub.id
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span>↳ {sub.name}</span>
                    <span className="text-[10px] opacity-80">({subCount})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Search & Food Type Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name, ingredients, or food code (e.g. CB, CHN, 001)..."
              className="pl-10 h-11 bg-card border-border rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'VEG', 'NON_VEG', 'EGG', 'VEGAN'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedFoodType(type)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
                  selectedFoodType === type
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-card border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                )}
              >
                {type === 'ALL' ? 'All Types' : type === 'VEG' ? '🟢 Veg' : type === 'NON_VEG' ? '🔴 Non-Veg' : type === 'EGG' ? '🟡 Egg' : '🌱 Vegan'}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-toolbar: Selection Controls & Results Count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 py-1 bg-card/40 border border-border/50 rounded-xl">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none font-medium hover:text-foreground">
              <input
                type="checkbox"
                checked={filteredItems.length > 0 && filteredItems.every((i) => selectedItemIds.includes(i.id))}
                onChange={() => {
                  const filteredIds = filteredItems.map((i) => i.id);
                  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedItemIds.includes(id));
                  if (allSelected) {
                    setSelectedItemIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                  } else {
                    setSelectedItemIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                  }
                }}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary ml-1"
              />
              <span className="font-semibold text-foreground">
                Select All ({filteredItems.length})
              </span>
            </label>
            {selectedItemIds.length > 0 && (
              <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {selectedItemIds.length} selected
              </span>
            )}
          </div>
          <div className="text-[11px] pr-2">
            Showing {filteredItems.length} of {items.length} dishes
          </div>
        </div>
      </div>

      {/* Dish Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredItems.map((item, idx) => {
          const isSelected = selectedItemIds.includes(item.id);
          const categoryDisplay = item.category?.parent
            ? `${item.category.parent.name} › ${item.category.name}`
            : item.category?.name || 'Main';

          const itemIndex = items.findIndex((i) => i.id === item.id);
          const itemNumber = item.itemNumber || String(itemIndex >= 0 ? itemIndex + 1 : idx + 1).padStart(3, '0');
          const letterCode = item.letterCode || generateFoodLetterCode(item.name);
          const itemCode = item.itemCode || `${letterCode} • #${itemNumber}`;

          // Check if item belongs to any configured special festive menus
          const specialMenuMemberships = specialMenus.filter((sm) =>
            sm.items?.some((i) => i.itemId === item.id)
          );

          return (
            <Card
              key={item.id}
              className={cn(
                'border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden relative rounded-none',
                !item.isAvailable && 'opacity-65 border-dashed',
                isSelected && 'ring-2 ring-primary bg-primary/[0.03] border-primary/50 shadow-md',
                specialMenuMemberships.length > 0 && 'border-purple-500/30'
              )}
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 flex-1">
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedItemIds((prev) =>
                            prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id]
                          );
                        }}
                        className="w-4 h-4 rounded-none border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                        title="Select dish for bulk actions"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getFoodTypeBadge(item.foodType)}
                        {/* Auto-applied Food Item Code Badge (Job 2) */}
                        <span
                          className="text-[10px] font-black font-mono text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-none shadow-xs"
                          title={`Auto Food Code: ${letterCode} | Item Sequence: #${itemNumber}`}
                        >
                          {itemCode}
                        </span>
                        {item.spiceLevel && item.spiceLevel !== 'NONE' && (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-none uppercase">
                            {item.spiceLevel}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold text-foreground line-clamp-1">
                        {item.name}
                      </CardTitle>
                    </div>
                  </div>
                  {/* Availability Toggle */}
                  <button
                    onClick={() => toggleAvailabilityMutation.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                    title={item.isAvailable ? 'Click to 86 / Mark Unavailable' : 'Click to Make Available'}
                    className={cn(
                      'p-1.5 rounded-none border transition-colors shrink-0',
                      item.isAvailable
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
                    )}
                  >
                    {item.isAvailable ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Festive Menu Membership Tags */}
                {specialMenuMemberships.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1.5">
                    {specialMenuMemberships.map((sm) => {
                      const cfg = sm.items?.find((i) => i.itemId === item.id);
                      const displayPrice = cfg?.customPrice ?? cfg?.variants?.[0]?.festivePrice;
                      return (
                        <Badge
                          key={sm.id}
                          variant="outline"
                          className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/40 rounded-none font-mono py-0"
                          title={`Configured in '${sm.name}'`}
                        >
                          🎉 {sm.name}: {displayPrice !== undefined ? formatCurrency(displayPrice) : 'Included'}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                  {item.description || 'No description provided.'}
                </p>
              </CardHeader>

              <CardContent className="p-5 pt-0 mt-auto">
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Portion & Pricing
                  </p>
                  <div className="space-y-1.5">
                    {item.variants && item.variants.length > 0 ? (
                      item.variants.map((v) => (
                        <div
                          key={v.id || v.name}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-none bg-accent/40"
                        >
                          <span className="font-medium text-foreground">{v.name}</span>
                          <span className="font-bold text-foreground font-mono">
                            {formatCurrency(v.price)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-muted-foreground">Standard Portion</div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]" title={categoryDisplay}>
                      <span className="font-medium text-foreground">{categoryDisplay}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* + Add to Festive Menu Button */}
                      <Button
                        onClick={() => handleOpenAddToFestive(item)}
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-7 px-2 text-[11px] gap-1 rounded-none font-semibold transition-all',
                          specialMenuMemberships.length > 0
                            ? 'border-purple-500 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25'
                            : 'border-purple-500/40 text-purple-300 hover:bg-purple-500/20'
                        )}
                        title="Add or edit pricing in Special Festive Menu"
                      >
                        <PartyPopper className="w-3.5 h-3.5 text-purple-400" />
                        <span>+ Festive</span>
                      </Button>

                      <Button
                        onClick={() => handleOpenEditDish(item)}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-none"
                        title="Edit dish"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm(`Remove "${item.name}" from menu?`)) {
                            deleteDishMutation.mutate(item.id);
                          }
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-none"
                        title="Delete dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredItems.length === 0 && !isLoadingItems && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border/80 rounded-2xl p-8 bg-card/20">
            <UtensilsCrossed className="w-12 h-12 mb-3 text-muted-foreground opacity-30" />
            <h3 className="text-base font-bold text-foreground">No Menu Items Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery || selectedCategoryId !== 'all'
                ? 'Try adjusting your search filters or selecting another category.'
                : 'Your menu is currently empty. Click "Add Dish" or "Scan Menu Card" to populate your menu catalogue.'}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Button onClick={handleOpenAddDish} size="sm" className="gap-1.5 bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" /> Add Dish
              </Button>
              <Button onClick={() => setIsScanModalOpen(true)} size="sm" variant="outline" className="gap-1.5">
                <Wand2 className="w-4 h-4 text-primary" /> Scan Menu Card
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedItemIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl px-5 py-3.5 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {selectedItemIds.length}
            </span>
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {selectedItemIds.length} {selectedItemIds.length === 1 ? 'Dish' : 'Dishes'} Selected
            </span>
          </div>
          <div className="hidden sm:block h-5 w-px bg-border" />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItemIds([])}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchAvailabilityMutation.mutate({ ids: selectedItemIds, isAvailable: true })}
              disabled={batchAvailabilityMutation.isPending}
              className="text-xs h-8 px-2.5 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Available
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => batchAvailabilityMutation.mutate({ ids: selectedItemIds, isAvailable: false })}
              disabled={batchAvailabilityMutation.isPending}
              className="text-xs h-8 px-2.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" /> 86 (Unavailable)
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedItemIds.length} selected dishes from your menu?`)) {
                  batchDeleteMutation.mutate(selectedItemIds);
                }
              }}
              disabled={batchDeleteMutation.isPending}
              className="text-xs h-8 px-3 gap-1.5 shadow-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {batchDeleteMutation.isPending ? 'Deleting...' : `Delete Selected (${selectedItemIds.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* ADD / EDIT DISH MODAL */}
      {(isAddDishOpen || editingDish) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  {editingDish ? 'Edit Dish' : 'Add New Dish'}
                </h3>
                <p className="text-xs text-muted-foreground">Configure dish name, category, portion sizes, and pricing</p>
              </div>
              <button
                onClick={() => {
                  setIsAddDishOpen(false);
                  setEditingDish(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Dish Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="e.g. Szechuan Kung Pao Chicken"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Category / Subcategory <span className="text-destructive">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickAddCategoryOpen(!isQuickAddCategoryOpen);
                        if (!isQuickAddCategoryOpen && dishCategoryId) {
                          const curr = categories.find((c) => c.id === dishCategoryId);
                          if (curr && !curr.parentId) {
                            setQuickCategoryParentId(curr.id);
                          }
                        }
                      }}
                      className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New Subcategory
                    </button>
                  </div>

                  {/* Inline quick category / subcategory creator */}
                  {isQuickAddCategoryOpen && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2 mb-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" /> Quick Create
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsQuickAddCategoryOpen(false)}
                          className="text-muted-foreground hover:text-foreground text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">Parent Category</label>
                        <select
                          value={quickCategoryParentId || ''}
                          onChange={(e) => setQuickCategoryParentId(e.target.value || null)}
                          className="w-full h-8 px-2 rounded border border-input bg-background text-xs"
                        >
                          <option value="">None (Top-Level Category)</option>
                          {topLevelCategories.map((c) => (
                            <option key={c.id} value={c.id}>📁 {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {quickCategoryParentId ? 'Subcategory Name' : 'Category Name'}
                        </label>
                        <div className="flex gap-1">
                          <Input
                            value={quickCategoryName}
                            onChange={(e) => setQuickCategoryName(e.target.value)}
                            placeholder={quickCategoryParentId ? "e.g. Dim Sum, Mocktails" : "e.g. Starters, Main Course"}
                            className="h-8 text-xs flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && quickCategoryName.trim()) {
                                e.preventDefault();
                                createCategoryMutation.mutate({
                                  name: quickCategoryName.trim(),
                                  parentId: quickCategoryParentId || null,
                                });
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={!quickCategoryName.trim() || createCategoryMutation.isPending}
                            onClick={() => {
                              if (quickCategoryName.trim()) {
                                createCategoryMutation.mutate({
                                  name: quickCategoryName.trim(),
                                  parentId: quickCategoryParentId || null,
                                });
                              }
                            }}
                            className="h-8 px-2.5 text-xs bg-primary text-primary-foreground"
                          >
                            {createCategoryMutation.isPending ? '...' : 'Add'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <select
                    value={dishCategoryId}
                    onChange={(e) => setDishCategoryId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none"
                    required
                  >
                    <option value="" disabled>Select category or subcategory...</option>
                    {topLevelCategories.map((topCat) => {
                      const subs = getSubcategories(topCat.id);
                      return (
                        <optgroup key={topCat.id} label={`📁 ${topCat.name}`}>
                          <option value={topCat.id}>{topCat.name} (General)</option>
                          {subs.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              &nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                    {/* Any orphaned subcategories */}
                    {categories.filter((c) => c.parentId && !topLevelCategories.some((t) => t.id === c.parentId)).map((orphan) => (
                      <option key={orphan.id} value={orphan.id}>↳ {orphan.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-foreground">Dietary Type</label>
                  <select
                    value={dishFoodType}
                    onChange={(e) => setDishFoodType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none"
                  >
                    <option value="VEG">🟢 Veg</option>
                    <option value="NON_VEG">🔴 Non-Veg</option>
                    <option value="EGG">🟡 Egg</option>
                    <option value="VEGAN">🌱 Vegan</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <Input
                  value={dishDescription}
                  onChange={(e) => setDishDescription(e.target.value)}
                  placeholder="e.g. Wok tossed chicken with toasted peanuts and chili oil"
                />
              </div>

              {/* Pricing & Portion Configuration (Job 3) */}
              <div className="border border-border/70 rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-foreground block">Portion &amp; Pricing Model</label>
                    <span className="text-[10px] text-muted-foreground">Select variant style for this food item</span>
                  </div>
                  <div className="flex flex-wrap rounded-lg border border-border overflow-hidden text-xs bg-card/60 p-0.5">
                    <button
                      type="button"
                      onClick={() => setDishPricingType('single')}
                      className={cn(
                        'px-2 py-1 font-semibold rounded transition-colors text-[11px]',
                        dishPricingType === 'single'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      Single Price
                    </button>
                    <button
                      type="button"
                      onClick={() => setDishPricingType('half_full')}
                      className={cn(
                        'px-2 py-1 font-semibold rounded transition-colors text-[11px]',
                        dishPricingType === 'half_full'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      Half / Full
                    </button>
                    <button
                      type="button"
                      onClick={() => setDishPricingType('small_medium_large')}
                      className={cn(
                        'px-2 py-1 font-semibold rounded transition-colors text-[11px]',
                        dishPricingType === 'small_medium_large'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      Small / Med / Large
                    </button>
                    <button
                      type="button"
                      onClick={() => setDishPricingType('custom')}
                      className={cn(
                        'px-2 py-1 font-semibold rounded transition-colors text-[11px]',
                        dishPricingType === 'custom'
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {dishPricingType === 'single' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] text-muted-foreground font-semibold">Standard Portion Price (₹)</label>
                    <Input
                      type="number"
                      value={dishSinglePrice}
                      onChange={(e) => setDishSinglePrice(parseFloat(e.target.value) || 0)}
                      className="font-mono font-bold"
                    />
                  </div>
                )}

                {dishPricingType === 'half_full' && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-semibold">Half Portion (₹)</label>
                      <Input
                        type="number"
                        value={dishHalfPrice}
                        onChange={(e) => setDishHalfPrice(parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-semibold">Full Portion (₹)</label>
                      <Input
                        type="number"
                        value={dishFullPrice}
                        onChange={(e) => setDishFullPrice(parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {dishPricingType === 'small_medium_large' && (
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-semibold">Small (₹)</label>
                      <Input
                        type="number"
                        value={dishSmallPrice}
                        onChange={(e) => setDishSmallPrice(parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-semibold">Medium (₹)</label>
                      <Input
                        type="number"
                        value={dishMediumPrice}
                        onChange={(e) => setDishMediumPrice(parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-semibold">Large (₹)</label>
                      <Input
                        type="number"
                        value={dishLargePrice}
                        onChange={(e) => setDishLargePrice(parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {dishPricingType === 'custom' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">Custom Variants</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDishCustomVariants((prev) => [...prev, { name: '', price: 100 }])}
                        className="h-6 px-2 text-[10px] text-primary hover:text-primary font-bold"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Variant
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {dishCustomVariants.map((v, vIdx) => (
                        <div key={vIdx} className="flex items-center gap-2">
                          <Input
                            placeholder="Variant name (e.g. 500ml, 4 Pcs)"
                            value={v.name}
                            onChange={(e) =>
                              setDishCustomVariants((prev) =>
                                prev.map((item, idx) => (idx === vIdx ? { ...item, name: e.target.value } : item))
                              )
                            }
                            className="h-8 text-xs flex-1"
                          />
                          <div className="w-24">
                            <Input
                              type="number"
                              placeholder="Price"
                              value={v.price}
                              onChange={(e) =>
                                setDishCustomVariants((prev) =>
                                  prev.map((item, idx) =>
                                    idx === vIdx ? { ...item, price: parseFloat(e.target.value) || 0 } : item
                                  )
                                )
                              }
                              className="h-8 text-xs font-mono font-bold"
                            />
                          </div>
                          {dishCustomVariants.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setDishCustomVariants((prev) => prev.filter((_, idx) => idx !== vIdx))
                              }
                              className="text-muted-foreground hover:text-destructive p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddDishOpen(false);
                    setEditingDish(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createDishMutation.isPending || updateDishMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {editingDish ? 'Save Changes' : 'Create Dish'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE CATEGORIES MODAL */}
      {isManageCategoriesOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Manage Menu Categories &amp; Subcategories
                </h3>
                <p className="text-xs text-muted-foreground">Create hierarchical sections (e.g. Starters → Dim Sum)</p>
              </div>
              <button
                onClick={() => setIsManageCategoriesOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add Category / Subcategory Form */}
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-2.5 shrink-0">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" /> Add New Category or Subcategory
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">Parent Category</label>
                  <select
                    value={newCategoryParentId || ''}
                    onChange={(e) => setNewCategoryParentId(e.target.value || null)}
                    className="w-full h-9 px-2 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none"
                  >
                    <option value="">None (Top-Level Category)</option>
                    {topLevelCategories.map((c) => (
                      <option key={c.id} value={c.id}>📁 {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {newCategoryParentId ? 'Subcategory Name' : 'Category Name'}
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder={newCategoryParentId ? "e.g. Dim Sum, Wood-Fired Pizzas" : "e.g. Starters, Main Course, Drinks"}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          e.preventDefault();
                          createCategoryMutation.mutate({
                            name: newCategoryName.trim(),
                            parentId: newCategoryParentId || null,
                          });
                        }
                      }}
                      className="text-xs h-9 flex-1"
                    />
                    <Button
                      type="button"
                      disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          createCategoryMutation.mutate({
                            name: newCategoryName.trim(),
                            parentId: newCategoryParentId || null,
                          });
                        }
                      }}
                      className="bg-primary text-primary-foreground shrink-0 text-xs h-9 px-3 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Hierarchical Categories & Subcategories List */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {topLevelCategories.map((topCat) => {
                const isEditingTop = editingCategory?.id === topCat.id;
                const subs = getSubcategories(topCat.id);
                const subIds = subs.map((s) => s.id);
                const directCount = items.filter((i) => (i.categoryId || i.category?.id) === topCat.id).length;
                const totalCount = items.filter((i) => {
                  const cId = i.categoryId || i.category?.id;
                  return cId === topCat.id || subIds.includes(cId);
                }).length;

                return (
                  <div key={topCat.id} className="rounded-xl border border-border/80 bg-card/60 overflow-hidden">
                    {/* Top Level Category Row */}
                    <div className="p-3 bg-muted/40 flex items-center justify-between gap-3 text-xs border-b border-border/50">
                      {isEditingTop ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="h-8 text-xs font-semibold"
                          />
                          <Button
                            size="sm"
                            onClick={() => updateCategoryMutation.mutate({ id: topCat.id, name: editingCategory.name })}
                            className="h-8 px-2.5 bg-primary text-primary-foreground"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCategory(null)}
                            className="h-8 px-2 text-muted-foreground"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 font-bold text-foreground">
                            <span className="text-sm">📁</span>
                            <span className="text-sm">{topCat.name}</span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              ({totalCount} dishes{subs.length > 0 ? ` · ${subs.length} subcategories` : ''})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setNewCategoryParentId(topCat.id);
                              }}
                              className="h-7 text-[11px] px-2 text-primary border-primary/30 hover:bg-primary/10 gap-1"
                              title="Add subcategory under this category"
                            >
                              <Plus className="w-3 h-3" /> Subcategory
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCategory({ id: topCat.id, name: topCat.name, parentId: null })}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete category "${topCat.name}" and all its subcategories?`)) {
                                  deleteCategoryMutation.mutate(topCat.id);
                                }
                              }}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Subcategories nested under top-level */}
                    {subs.length > 0 && (
                      <div className="p-2 pl-6 space-y-1.5 bg-background/50">
                        {subs.map((sub) => {
                          const isEditingSub = editingCategory?.id === sub.id;
                          const subCount = items.filter((i) => (i.categoryId || i.category?.id) === sub.id).length;
                          return (
                            <div
                              key={sub.id}
                              className="p-2 px-3 rounded-lg border border-border/50 bg-card/80 flex items-center justify-between gap-3 text-xs"
                            >
                              {isEditingSub ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <Input
                                    value={editingCategory.name}
                                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                    className="h-7 text-xs font-medium"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => updateCategoryMutation.mutate({ id: sub.id, name: editingCategory.name })}
                                    className="h-7 px-2 bg-primary text-primary-foreground text-xs"
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingCategory(null)}
                                    className="h-7 px-2 text-muted-foreground text-xs"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                                    <span className="text-primary font-bold">↳</span>
                                    <span>{sub.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-normal">({subCount} dishes)</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingCategory({ id: sub.id, name: sub.name, parentId: topCat.id })}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm(`Delete subcategory "${sub.name}"?`)) {
                                          deleteCategoryMutation.mutate(sub.id);
                                        }
                                      }}
                                      className="h-6 w-6 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {topLevelCategories.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No categories created yet. Add your first category above.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsManageCategoriesOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SCAN MENU CARD MODAL */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Local AI Menu Card Scanner (Server OCR)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Upload an image or document to auto-extract categories, items, and Full/Half prices
                </p>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Zero Retention Security Notice */}
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-2.5 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>Zero Retention Guarantee:</strong> Uploaded menu card files are processed entirely on your local server sandbox via Tesseract OCR and <strong className="text-foreground">permanently deleted from disk immediately</strong> after extraction.
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Dropzone */}
              <div className="border-2 border-dashed border-border/80 rounded-2xl p-6 bg-card/40 text-center space-y-3 hover:border-primary/60 transition-colors relative">
                <input
                  type="file"
                  accept="image/*,application/pdf,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleMenuUpload(file);
                    e.target.value = '';
                  }}
                  disabled={isScanning}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />

                {isScanning ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-bold text-foreground">Extracting Categories, Dishes & Prices...</p>
                    <p className="text-xs text-muted-foreground">Running server-side OCR and portion recognition</p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">
                        Drop restaurant menu card here or <span className="text-primary underline">browse file</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP, and PDF menu cards supported
                      </p>
                    </div>
                    <div className="pt-2 flex justify-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadSample();
                        }}
                        className="text-xs font-semibold gap-1.5 z-20"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-primary" />
                        Load Sample Multi-Cuisine Menu
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Scanned Results */}
              {scannedCategories.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Dishes Ready to Import ({scannedCategories.length} Categories)
                      </span>
                    </div>
                    {scanInfo && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                        Server File Auto-Deleted
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    {scannedCategories.map((cat, catIdx) => (
                      <div key={catIdx} className="p-3.5 rounded-xl border border-border/60 bg-card/60 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            {cat.name} ({cat.items.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => removeScannedCategory(catIdx)}
                            className="text-muted-foreground hover:text-destructive text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cat.items.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="p-2.5 rounded-lg border border-border/40 bg-background/80 flex flex-col justify-between gap-1.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">
                                      {item.foodType === 'NON_VEG' ? '🔴' : item.foodType === 'EGG' ? '🟡' : '🟢'}
                                    </span>
                                    <span className="text-xs font-bold text-foreground">{item.name}</span>
                                  </div>
                                  {item.description && (
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeScannedItem(catIdx, itemIdx)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                                {item.variants.map((v, vIdx) => (
                                  <div
                                    key={vIdx}
                                    className="flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/40"
                                  >
                                    <span className="text-muted-foreground font-sans font-semibold">{v.name}:</span>
                                    <span className="text-primary font-bold">₹</span>
                                    <input
                                      type="number"
                                      value={v.price}
                                      onChange={(e) =>
                                        updateScannedPrice(
                                          catIdx,
                                          itemIdx,
                                          vIdx,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-10 bg-transparent text-foreground font-bold focus:outline-none text-[10px]"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScanModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={scannedCategories.length === 0 || isImporting}
                onClick={handleBatchImport}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Import Dishes to Menu Catalogue
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SPECIAL FESTIVE & OCCASIONS MENU MANAGEMENT MODAL (Job 1) */}
      {isSpecialMenuModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-purple-500/40 rounded-none max-w-4xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Special Occasion &amp; Festival Menus
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Import catalogue dishes, customize festive pricing, and configure which menu is served during festivals
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSpecialMenuModalOpen(false);
                  resetSpecialMenuForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 pr-1">
              {/* Active Menu Mode Switcher in Modal */}
              <div className="p-3.5 rounded-none border border-purple-500/30 bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Active Menu Mode for Restaurant
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border-purple-500/30 rounded-none">
                    Live Status
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveMenuModeMutation.mutate({ mode: 'MAIN_ONLY' })}
                    disabled={setActiveMenuModeMutation.isPending}
                    className={cn(
                      'p-2.5 rounded-none border text-left transition-all',
                      activeMenuMode === 'MAIN_ONLY'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-card/60 hover:bg-muted/40 text-muted-foreground'
                    )}
                  >
                    <div className="font-bold text-xs text-foreground">🌟 Main Menu Only</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Regular daily catalogue</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMenuModeMutation.mutate({ mode: 'SPECIAL_ONLY' })}
                    disabled={setActiveMenuModeMutation.isPending}
                    className={cn(
                      'p-2.5 rounded-none border text-left transition-all',
                      activeMenuMode === 'SPECIAL_ONLY'
                        ? 'border-purple-500 bg-purple-500/15 shadow-sm'
                        : 'border-border bg-card/60 hover:bg-muted/40 text-muted-foreground'
                    )}
                  >
                    <div className="font-bold text-xs text-purple-300">🎉 Festive Menu Only</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Exclusive festival edition</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMenuModeMutation.mutate({ mode: 'ALL' })}
                    disabled={setActiveMenuModeMutation.isPending}
                    className={cn(
                      'p-2.5 rounded-none border text-left transition-all',
                      activeMenuMode === 'ALL'
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                        : 'border-border bg-card/60 hover:bg-muted/40 text-muted-foreground'
                    )}
                  >
                    <div className="font-bold text-xs text-emerald-400">🔥 Both Menus Live</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Main + Festive combined</div>
                  </button>
                </div>
              </div>

              {/* Create / Edit Form */}
              <form onSubmit={handleSaveSpecialMenu} className="p-4 rounded-none border border-border/80 bg-muted/20 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    {editingSpecialMenu ? 'Edit Special Festive Menu' : 'Create New Special Festive Menu'}
                  </span>
                  {editingSpecialMenu && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetSpecialMenuForm}
                      className="h-6 text-[10px] text-muted-foreground rounded-none"
                    >
                      Clear &amp; Create New
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Menu Name *</label>
                    <Input
                      value={specialMenuName}
                      onChange={(e) => setSpecialMenuName(e.target.value)}
                      placeholder="e.g. Diwali Dhamaka Grand Feast"
                      className="h-9 text-xs rounded-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Occasion / Festival</label>
                    <Input
                      value={specialMenuOccasion}
                      onChange={(e) => setSpecialMenuOccasion(e.target.value)}
                      placeholder="e.g. Diwali, Christmas, Valentine's Day, New Year"
                      className="h-9 text-xs rounded-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Start Date (Optional)</label>
                    <Input
                      type="date"
                      value={specialMenuStartDate}
                      onChange={(e) => setSpecialMenuStartDate(e.target.value)}
                      className="h-9 text-xs rounded-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">End Date (Optional)</label>
                    <Input
                      type="date"
                      value={specialMenuEndDate}
                      onChange={(e) => setSpecialMenuEndDate(e.target.value)}
                      className="h-9 text-xs rounded-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">Description / Chef Note</label>
                  <Input
                    value={specialMenuDescription}
                    onChange={(e) => setSpecialMenuDescription(e.target.value)}
                    placeholder="e.g. Authentic celebration thalis, royal delicacies, and chef festive specials"
                    className="h-9 text-xs rounded-none"
                  />
                </div>

                {/* Categories Association */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground">Include Specific Categories in this Special Menu</label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-background/80 rounded-none border border-border/60">
                    {categories.map((c) => {
                      const isChecked = specialMenuCategoryIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSpecialMenuCategoryIds((prev) =>
                              isChecked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-none text-[11px] font-medium border transition-colors flex items-center gap-1',
                            isChecked
                              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold'
                              : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {isChecked ? <Check className="w-3 h-3 text-purple-400" /> : <Plus className="w-3 h-3 text-muted-foreground" />}
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                    {categories.length === 0 && (
                      <span className="text-xs text-muted-foreground">No categories available.</span>
                    )}
                  </div>
                </div>

                {/* DISHES SELECTION & FESTIVE PRICING PANEL */}
                <div className="p-4 bg-background border border-purple-500/30 rounded-none space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <UtensilsCrossed className="w-4 h-4 text-purple-400" />
                        Festive Dishes Selection &amp; Custom Pricing
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Select which dishes and variants are in this festive menu and adjust special festival prices
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleImportAllDishesToSpecialMenu}
                        disabled={items.length === 0}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 gap-1.5 rounded-none font-bold shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5" /> Import All Main Menu Dishes ({items.length})
                      </Button>
                    </div>
                  </div>

                  {/* Batch Pricing Adjustment Toolbar */}
                  {specialMenuItems.length > 0 && (
                    <div className="p-2.5 bg-purple-950/20 border border-purple-500/20 flex flex-wrap items-center justify-between gap-2 rounded-none">
                      <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Quick Batch Price Adjustments ({specialMenuItems.length} dishes selected):
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleApplyBatchFestiveAdjustment(-10)}
                          className="px-2 py-1 text-[10px] font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-none"
                        >
                          -10% Discount
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyBatchFestiveAdjustment(-15)}
                          className="px-2 py-1 text-[10px] font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-none"
                        >
                          -15% Discount
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyBatchFestiveAdjustment(10)}
                          className="px-2 py-1 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-none"
                        >
                          +10% Festive Surcharge
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyBatchFestiveAdjustment(0)}
                          className="px-2 py-1 text-[10px] font-semibold bg-muted hover:bg-accent text-muted-foreground hover:text-foreground border border-border rounded-none"
                        >
                          Reset to Standard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dish Search & Type Filter Inside Modal */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={specialMenuDishSearch}
                        onChange={(e) => setSpecialMenuDishSearch(e.target.value)}
                        placeholder="Search dish name or code..."
                        className="pl-8 h-8 text-xs bg-card border-border rounded-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {(['ALL', 'SELECTED', 'VEG', 'NON_VEG'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setSpecialMenuDishFilter(filter)}
                          className={cn(
                            'px-2.5 py-1 text-[11px] font-semibold border transition-all rounded-none',
                            specialMenuDishFilter === filter
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-card text-muted-foreground hover:text-foreground border-border'
                          )}
                        >
                          {filter === 'ALL'
                            ? `All Dishes (${items.length})`
                            : filter === 'SELECTED'
                            ? `Selected (${specialMenuItems.length})`
                            : filter === 'VEG'
                            ? '🟢 Veg'
                            : '🔴 Non-Veg'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dish List for Special Menu */}
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-border/40">
                    {items
                      .filter((itm) => {
                        const matchesSearch =
                          itm.name.toLowerCase().includes(specialMenuDishSearch.toLowerCase()) ||
                          (itm.itemCode && itm.itemCode.toLowerCase().includes(specialMenuDishSearch.toLowerCase()));
                        const isSelected = specialMenuItems.some((i) => i.itemId === itm.id);
                        if (!matchesSearch) return false;
                        if (specialMenuDishFilter === 'SELECTED') return isSelected;
                        if (specialMenuDishFilter === 'VEG') return itm.foodType === 'VEG' || itm.foodType === 'VEGAN';
                        if (specialMenuDishFilter === 'NON_VEG') return itm.foodType === 'NON_VEG' || itm.foodType === 'EGG';
                        return true;
                      })
                      .map((itm) => {
                        const isSelected = specialMenuItems.some((i) => i.itemId === itm.id);
                        const configuredItem = specialMenuItems.find((i) => i.itemId === itm.id);

                        return (
                          <div
                            key={itm.id}
                            className={cn(
                              'p-2.5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                              isSelected ? 'bg-purple-500/5' : 'hover:bg-muted/30'
                            )}
                          >
                            <div className="flex items-start gap-2.5 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleDishInSpecialMenu(itm)}
                                className="w-4 h-4 rounded-none border-border text-purple-600 focus:ring-purple-500/20 cursor-pointer accent-purple-600 mt-0.5"
                              />
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs">
                                    {itm.foodType === 'NON_VEG' ? '🔴' : itm.foodType === 'EGG' ? '🟡' : '🟢'}
                                  </span>
                                  <span className="text-xs font-bold text-foreground">{itm.name}</span>
                                  {itm.category?.name && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 rounded-none text-muted-foreground border-border">
                                      {itm.category.name}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Standard Price: {formatCurrency(itm.variants?.[0]?.price || 200)}
                                </div>
                              </div>
                            </div>

                            {/* Festive Pricing Controls */}
                            {isSelected && (
                              <div className="flex items-center gap-2 flex-wrap shrink-0">
                                {itm.variants && itm.variants.length > 1 ? (
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {itm.variants.map((v, vIdx) => {
                                      const configuredVariant = configuredItem?.variants?.[vIdx];
                                      const festivePrice = configuredVariant?.festivePrice ?? v.price;
                                      return (
                                        <div
                                          key={v.id || v.name}
                                          className="flex items-center gap-1 bg-card px-2 py-1 border border-purple-500/30 rounded-none text-[11px]"
                                        >
                                          <span className="text-muted-foreground font-semibold">{v.name}:</span>
                                          <span className="text-purple-400 font-bold">₹</span>
                                          <input
                                            type="number"
                                            value={festivePrice}
                                            onChange={(e) =>
                                              handleUpdateSpecialMenuVariantPrice(
                                                itm.id,
                                                vIdx,
                                                parseFloat(e.target.value) || 0
                                              )
                                            }
                                            className="w-14 bg-background px-1 py-0.5 border border-border text-foreground font-mono font-bold text-[11px] focus:outline-none focus:border-purple-500 rounded-none"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-card px-2 py-1 border border-purple-500/30 rounded-none text-[11px]">
                                    <span className="text-muted-foreground font-semibold">Festive Price:</span>
                                    <span className="text-purple-400 font-bold">₹</span>
                                    <input
                                      type="number"
                                      value={configuredItem?.customPrice ?? itm.variants?.[0]?.price ?? 200}
                                      onChange={(e) =>
                                        handleUpdateSpecialMenuItemCustomPrice(
                                          itm.id,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-16 bg-background px-1.5 py-0.5 border border-border text-foreground font-mono font-bold text-[11px] focus:outline-none focus:border-purple-500 rounded-none"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createSpecialMenuMutation.isPending || updateSpecialMenuMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs font-semibold rounded-none px-4"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {editingSpecialMenu ? 'Update Special Menu' : 'Create Special Menu'}
                  </Button>
                </div>
              </form>

              {/* List of Existing Special Menus with Dishes Preview */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Configured Festive Menus ({specialMenus.length})
                </span>
                {specialMenus.length > 0 ? (
                  <div className="space-y-2.5">
                    {specialMenus.map((m) => {
                      const isExpanded = expandedSpecialMenuId === m.id;
                      const menuItems = m.items || [];
                      return (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-none border border-purple-500/25 bg-card/60 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-foreground">{m.name}</span>
                                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/30 rounded-none">
                                  🎉 {m.occasion}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-mono bg-card text-foreground border-border rounded-none">
                                  {menuItems.length} festive dishes
                                </Badge>
                                {m.startDate && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {m.startDate} {m.endDate ? `to ${m.endDate}` : ''}
                                  </span>
                                )}
                              </div>
                              {m.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1">{m.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedSpecialMenuId(isExpanded ? null : m.id)}
                                className="h-7 text-[11px] px-2 text-purple-300 border-purple-500/30 hover:bg-purple-500/10 rounded-none gap-1"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isExpanded ? 'Hide Dishes' : 'View Dishes'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditSpecialMenu(m)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-none"
                                title="Edit Special Menu"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Delete special festive menu "${m.name}"?`)) {
                                    deleteSpecialMenuMutation.mutate(m.id);
                                  }
                                }}
                                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-none"
                                title="Delete Special Menu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Expandable Dishes Table */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-border/50 space-y-1.5">
                              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Included Festive Dishes ({menuItems.length})
                              </div>
                              {menuItems.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                  {menuItems.map((item) => (
                                    <div
                                      key={item.itemId}
                                      className="p-2 rounded-none bg-background border border-border/60 text-xs flex flex-col justify-between gap-1"
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-foreground truncate">{item.name}</span>
                                        <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono rounded-none">
                                          {item.foodType}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-border/40">
                                        {item.variants && item.variants.length > 0 ? (
                                          <div className="space-y-0.5 w-full">
                                            {item.variants.map((v, vIdx) => (
                                              <div key={vIdx} className="flex justify-between">
                                                <span className="text-muted-foreground">{v.name}:</span>
                                                <span className="font-bold text-purple-400">₹{v.festivePrice}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <>
                                            <span className="text-muted-foreground">Festive Price:</span>
                                            <span className="font-bold text-purple-400">₹{item.customPrice ?? item.basePrice}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  No dishes individually configured. All main dishes are accessible under this menu banner.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-none p-4 text-muted-foreground">
                    <p className="text-xs font-medium">No special festive menus created yet.</p>
                    <p className="text-[10px] mt-0.5">Use the form above to add your first festival or occasion menu.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none"
                onClick={() => {
                  setIsSpecialMenuModalOpen(false);
                  resetSpecialMenuForm();
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SIDE FLYOUT POP-UP MODAL: ADD / EDIT DISH IN FESTIVE MENU */}
      {isAddToFestiveModalOpen && selectedDishForFestive && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-end p-0 sm:p-4">
          <div className="bg-card border-l sm:border border-purple-500/40 rounded-none w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] p-6 shadow-2xl space-y-5 animate-in slide-in-from-right duration-200 flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-none bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                    <PartyPopper className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Add to Festive Menu</h3>
                    <p className="text-[11px] text-muted-foreground">Configure custom festival price for POS &amp; QR</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddToFestiveModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selected Dish Card Summary */}
              <div className="p-3.5 bg-muted/30 border border-border space-y-1.5 rounded-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">
                    {selectedDishForFestive.foodType === 'NON_VEG' ? '🔴' : selectedDishForFestive.foodType === 'EGG' ? '🟡' : '🟢'}
                  </span>
                  <span className="text-sm font-bold text-foreground">{selectedDishForFestive.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Category: <span className="font-semibold text-foreground">{selectedDishForFestive.category?.name || 'Main'}</span>
                </div>
                {selectedDishForFestive.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{selectedDishForFestive.description}</p>
                )}
              </div>

              {/* Select Target Festive Menu (if multiple exist) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Gift className="w-3.5 h-3.5 text-purple-400" />
                  Select Festive Menu ({specialMenus.length})
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {specialMenus.map((sm) => {
                    const isTarget = targetFestiveMenuId === sm.id;
                    const isAlreadyIn = sm.items?.some((i) => i.itemId === selectedDishForFestive.id);
                    return (
                      <button
                        key={sm.id}
                        type="button"
                        onClick={() => handleSelectTargetFestiveMenu(sm.id)}
                        className={cn(
                          'w-full p-2.5 text-left border transition-all flex items-center justify-between gap-2 rounded-none',
                          isTarget
                            ? 'bg-purple-500/15 border-purple-500 text-purple-200 font-bold shadow-xs'
                            : 'bg-card hover:bg-muted/40 text-muted-foreground border-border'
                        )}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <PartyPopper className="w-3 h-3 text-purple-400" />
                            {sm.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Occasion: {sm.occasion} {sm.startDate ? `(${sm.startDate})` : ''}
                          </div>
                        </div>
                        {isAlreadyIn && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 rounded-none shrink-0">
                            ✓ In Menu
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Festive Pricing Customizer */}
              <div className="p-3.5 bg-background border border-purple-500/30 rounded-none space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Custom Festive Pricing</span>
                  <span className="text-[10px] text-purple-400 font-mono">Special Occasion Rate</span>
                </div>

                {flyoutVariants.length > 1 ? (
                  <div className="space-y-2">
                    {flyoutVariants.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-muted/20 border border-border rounded-none text-xs">
                        <div>
                          <div className="font-bold text-foreground">{v.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">Std: ₹{v.originalPrice}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-purple-400 font-bold">₹</span>
                          <Input
                            type="number"
                            value={v.festivePrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setFlyoutVariants((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, festivePrice: val } : item))
                              );
                            }}
                            className="w-20 h-8 text-xs font-mono font-bold rounded-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 p-2 bg-muted/20 border border-border rounded-none text-xs">
                      <div>
                        <div className="font-bold text-foreground">Portion Price</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Std: ₹{selectedDishForFestive.variants?.[0]?.price || 200}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-400 font-bold">₹</span>
                        <Input
                          type="number"
                          value={flyoutCustomPrice}
                          onChange={(e) => setFlyoutCustomPrice(parseFloat(e.target.value) || 0)}
                          className="w-24 h-8 text-xs font-mono font-bold rounded-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick % adjustment buttons */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground font-semibold">Quick adjust:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const base = selectedDishForFestive.variants?.[0]?.price || 200;
                      setFlyoutCustomPrice(Math.round(base * 0.9));
                      setFlyoutVariants((prev) => prev.map((v) => ({ ...v, festivePrice: Math.round(v.originalPrice * 0.9) })));
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-none hover:bg-purple-500/20"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = selectedDishForFestive.variants?.[0]?.price || 200;
                      setFlyoutCustomPrice(Math.round(base * 0.8));
                      setFlyoutVariants((prev) => prev.map((v) => ({ ...v, festivePrice: Math.round(v.originalPrice * 0.8) })));
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded-none hover:bg-purple-500/20"
                  >
                    -20%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = selectedDishForFestive.variants?.[0]?.price || 200;
                      setFlyoutCustomPrice(Math.round(base * 1.1));
                      setFlyoutVariants((prev) => prev.map((v) => ({ ...v, festivePrice: Math.round(v.originalPrice * 1.1) })));
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-none hover:bg-amber-500/20"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = selectedDishForFestive.variants?.[0]?.price || 200;
                      setFlyoutCustomPrice(base);
                      setFlyoutVariants((prev) => prev.map((v) => ({ ...v, festivePrice: v.originalPrice })));
                    }}
                    className="px-2 py-0.5 text-[10px] text-muted-foreground border border-border rounded-none hover:bg-muted"
                  >
                    Standard
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
              {specialMenus.find((m) => m.id === targetFestiveMenuId)?.items?.some((i) => i.itemId === selectedDishForFestive.id) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    removeDishFromFestiveMenuMutation.mutate({
                      menuId: targetFestiveMenuId,
                      itemId: selectedDishForFestive.id,
                    })
                  }
                  disabled={removeDishFromFestiveMenuMutation.isPending}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs rounded-none border-rose-500/30"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddToFestiveModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleSaveDishToFestiveMenu}
                disabled={addDishToFestiveMenuMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 rounded-none px-4 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" /> Save to Festive Menu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ALL FESTIVE MENUS OVERVIEW MODAL */}
      {isViewAllFestiveMenusOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-purple-500/40 rounded-none max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    All Special Occasion &amp; Festive Menus ({specialMenus.length})
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Overview of all configured festive menus, dish lineups, date ranges, and live pricing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewAllFestiveMenusOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
              {specialMenus.length > 0 ? (
                <div className="space-y-4">
                  {specialMenus.map((sm) => {
                    const menuItems = sm.items || [];
                    return (
                      <div
                        key={sm.id}
                        className="p-4 rounded-none border border-purple-500/30 bg-card/60 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-foreground">{sm.name}</span>
                              <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30 rounded-none">
                                🎉 {sm.occasion}
                              </Badge>
                              {sm.startDate && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3" /> {sm.startDate} {sm.endDate ? `to ${sm.endDate}` : ''}
                                </span>
                              )}
                            </div>
                            {sm.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{sm.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsViewAllFestiveMenusOpen(false);
                                handleOpenEditSpecialMenu(sm);
                              }}
                              className="h-7 text-xs text-purple-300 border-purple-500/30 hover:bg-purple-500/10 rounded-none gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Manage Menu
                            </Button>
                          </div>
                        </div>

                        {/* Dish items in this menu */}
                        <div>
                          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Configured Festive Dishes ({menuItems.length})
                          </div>
                          {menuItems.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {menuItems.map((itm) => (
                                <div
                                  key={itm.itemId}
                                  className="p-2.5 rounded-none bg-background border border-border/70 flex flex-col justify-between gap-1 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-foreground truncate">{itm.name}</span>
                                    <span className="text-[10px]">
                                      {itm.foodType === 'NON_VEG' ? '🔴' : itm.foodType === 'EGG' ? '🟡' : '🟢'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-border/40 font-mono text-[11px]">
                                    {itm.variants && itm.variants.length > 0 ? (
                                      <div className="space-y-0.5 w-full">
                                        {itm.variants.map((v, idx) => (
                                          <div key={idx} className="flex justify-between">
                                            <span className="text-muted-foreground">{v.name}:</span>
                                            <span className="font-bold text-purple-400">₹{v.festivePrice}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-muted-foreground">Festive Rate:</span>
                                        <span className="font-bold text-purple-400">₹{itm.customPrice ?? itm.basePrice}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              No individual dish overrides. Serves full menu catalogue under this festive banner.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed rounded-none p-6 text-muted-foreground space-y-2">
                  <PartyPopper className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
                  <p className="text-xs font-semibold">No special festive menus created yet.</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsViewAllFestiveMenusOpen(false);
                      handleOpenCreateSpecialMenu();
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-none"
                  >
                    + Create First Festive Menu
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none"
                onClick={() => setIsViewAllFestiveMenusOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

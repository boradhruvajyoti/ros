'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed, Plus, Search, CheckCircle2,
  XCircle, Edit3, Trash2, Tag,
  UploadCloud, FileCheck, ShieldCheck, RefreshCw, Wand2, X, Check,
  Layers, ChevronRight, AlertCircle, Sparkles, CheckSquare, Square
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { formatCurrency } from '@ros/utils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [dishPricingType, setDishPricingType] = useState<'single' | 'variants'>('single');
  const [dishSinglePrice, setDishSinglePrice] = useState<number>(250);
  const [dishHalfPrice, setDishHalfPrice] = useState<number>(180);
  const [dishFullPrice, setDishFullPrice] = useState<number>(320);

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

  // Queries
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<MenuCategory[]>({
    queryKey: ['menu', 'categories'],
    queryFn: () => apiGet<MenuCategory[]>('/menu/categories'),
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery<MenuItem[]>({
    queryKey: ['menu', 'items'],
    queryFn: () => apiGet<MenuItem[]>('/menu/items'),
  });

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
      setDishPricingType('variants');
      const half = item.variants.find((v) => v.name.toLowerCase().includes('half'));
      const full = item.variants.find((v) => v.name.toLowerCase().includes('full')) || item.variants[1];
      setDishHalfPrice(half?.price || item.variants[0].price);
      setDishFullPrice(full?.price || item.variants[1].price);
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

    const variants = dishPricingType === 'variants'
      ? [
          { name: 'Half', price: Number(dishHalfPrice) || 100, cost: (Number(dishHalfPrice) || 100) * 0.35, sortOrder: 1 },
          { name: 'Full', price: Number(dishFullPrice) || 200, cost: (Number(dishFullPrice) || 200) * 0.35, sortOrder: 2 },
        ]
      : [
          { name: 'Regular Portion', price: Number(dishSinglePrice) || 100, cost: (Number(dishSinglePrice) || 100) * 0.35, sortOrder: 1 },
        ];

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
    const itemCatId = item.categoryId || item.category?.id;
    const childCategoryIds = categories.filter((c) => c.parentId === selectedCategoryId).map((c) => c.id);
    const matchesCat =
      selectedCategoryId === 'all' ||
      itemCatId === selectedCategoryId ||
      childCategoryIds.includes(itemCatId);
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedFoodType === 'ALL' || item.foodType === selectedFoodType;
    return matchesCat && matchesSearch && matchesType;
  });

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
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsScanModalOpen(true)}
            variant="outline"
            className="gap-2 border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary shadow-sm"
          >
            <Wand2 className="w-4 h-4" /> Scan Menu Card
          </Button>
          <Button
            onClick={() => setIsManageCategoriesOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Tag className="w-4 h-4" /> Manage Categories
          </Button>
          <Button
            onClick={handleOpenAddDish}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Dish
          </Button>
        </div>
      </div>

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
              placeholder="Search dishes by name, ingredients, or description..."
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
        {filteredItems.map((item) => {
          const isSelected = selectedItemIds.includes(item.id);
          const categoryDisplay = item.category?.parent
            ? `${item.category.parent.name} › ${item.category.name}`
            : item.category?.name || 'Main';

          return (
            <Card
              key={item.id}
              className={cn(
                'border border-border/80 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden relative',
                !item.isAvailable && 'opacity-65 border-dashed',
                isSelected && 'ring-2 ring-primary bg-primary/[0.03] border-primary/50 shadow-md'
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
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                        title="Select dish for bulk actions"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getFoodTypeBadge(item.foodType)}
                        {item.spiceLevel && item.spiceLevel !== 'NONE' && (
                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">
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
                      'p-1.5 rounded-lg border transition-colors shrink-0',
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
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-accent/40"
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
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={categoryDisplay}>
                      Category: <span className="font-medium text-foreground">{categoryDisplay}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleOpenEditDish(item)}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
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
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
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

              {/* Pricing & Portion Configuration */}
              <div className="border border-border/70 rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Portion & Pricing Model</label>
                  <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setDishPricingType('single')}
                      className={cn('px-2.5 py-1 font-semibold transition-colors', dishPricingType === 'single' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                    >
                      Single Price
                    </button>
                    <button
                      type="button"
                      onClick={() => setDishPricingType('variants')}
                      className={cn('px-2.5 py-1 font-semibold transition-colors', dishPricingType === 'variants' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                    >
                      Half / Full
                    </button>
                  </div>
                </div>

                {dishPricingType === 'single' ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">Standard Portion Price (₹)</label>
                    <Input
                      type="number"
                      value={dishSinglePrice}
                      onChange={(e) => setDishSinglePrice(parseFloat(e.target.value) || 0)}
                      className="font-mono font-bold"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Half Portion (₹)</label>
                      <Input
                        type="number"
                        value={dishHalfPrice}
                        onChange={(e) => setDishHalfPrice(parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Full Portion (₹)</label>
                      <Input
                        type="number"
                        value={dishFullPrice}
                        onChange={(e) => setDishFullPrice(parseFloat(e.target.value) || 0)}
                        className="font-mono font-bold"
                      />
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
    </div>
  );
}

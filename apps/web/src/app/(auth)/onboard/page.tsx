'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  UtensilsCrossed,
  Building2,
  Percent,
  LayoutGrid,
  ChefHat,
  ShieldCheck,
  Rocket,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  QrCode,
  DollarSign,
  Clock,
  MapPin,
  FileText,
  Flame,
  Coffee,
  Pizza,
  Wine,
  Soup,
  Fish,
  Beef,
  Beer,
  Sandwich,
  Citrus,
  CookingPot,
  Eye,
  EyeOff,
  Check,
  Store,
  Sliders,
  BadgePercent,
  Plus,
  Trash2,
  ArrowRight,
  Shield,
  Zap,
  UploadCloud,
  FileImage,
  RefreshCw,
  FileCheck,
  Edit2,
  X,
  Wand2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import { apiPost } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { downscaleImage } from '@/lib/image-utils';

// Cuisine options (Expanded to 13 popular restaurant concepts)
const CUISINE_OPTIONS = [
  { id: 'chinese', name: 'Chinese & Szechuan', icon: Soup, desc: 'Kung Pao chicken, dim sum, Hakka wok noodles, Manchurian & hot pots' },
  { id: 'italian', name: 'Italian & Pizza', icon: Pizza, desc: 'Wood-fired pizzas, handcrafted pastas, risottos, wines & tiramisu' },
  { id: 'indian', name: 'Royal Indian & Mughlai', icon: Flame, desc: 'Tandoor grills, rich gravies, aromatic dum biryanis, clay-oven naans' },
  { id: 'asian', name: 'Pan-Asian & Dim Sum', icon: Soup, desc: 'Japanese ramen, sushi rolls, steamed dim sum, wok noodles & boba' },
  { id: 'cafe', name: 'Artisan Cafe & Bakery', icon: Coffee, desc: 'Specialty coffee brews, sourdough brunch, viennoiserie, cheesecakes' },
  { id: 'general', name: 'Modern Bistro & Bar', icon: UtensilsCrossed, desc: 'Gourmet burgers, steak cuts, craft mocktails, artisan tapas' },
  { id: 'mexican', name: 'Mexican & Cantina', icon: Sparkles, desc: 'Baja tacos, loaded burrito bowls, sizzling fajitas, guacamole & churros' },
  { id: 'fastfood', name: 'Fast Casual & Burgers', icon: Sandwich, desc: 'Double smash burgers, Nashville crispy chicken, curly fries & thick shakes' },
  { id: 'mediterranean', name: 'Mediterranean & Mezze', icon: Citrus, desc: 'Velvet hummus, falafel platters, spiced shawarma bowls, pita & dips' },
  { id: 'steakhouse', name: 'Fine Dining & Steakhouse', icon: Beef, desc: 'Charcoal-grilled prime steaks, truffle reductions, sommelier cellar pairings' },
  { id: 'seafood', name: 'Coastal & Seafood Bar', icon: Fish, desc: 'Tiger prawns, fresh Atlantic salmon, Goan coconut curries, calamari' },
  { id: 'southindian', name: 'South Indian Heritage', icon: CookingPot, desc: 'Ghee roast dosas, fluffy idlis, Malabar parottas, filter coffee' },
  { id: 'brewery', name: 'Craft Brewery & Smokehouse', icon: Beer, desc: 'Hickory-smoked BBQ brisket, craft beers, bourbon wings, beer cheese pretzels' },
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹ - Indian Rupee)' },
  { code: 'USD', symbol: '$', label: 'USD ($ - US Dollar)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€ - Euro)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£ - British Pound)' },
  { code: 'AED', symbol: 'د.إ', label: 'AED (د.إ - UAE Dirham)' },
];

const PLANS = [
  { id: 'starter', name: 'Starter', price: '₹2,999/mo', desc: '1 Branch, POS, KOT & Dine-In' },
  { id: 'professional', name: 'Professional', price: '₹4,999/mo', desc: 'Multi-Station KDS, Inventory, QR Ordering, AI Insights', popular: true },
  { id: 'enterprise', name: 'Enterprise', price: '₹9,999/mo', desc: 'Multi-Branch, Procurement, Biometrics, Robotics, Unlimited' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provisioningStatus, setProvisioningStatus] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  // Step 1: Brand & Identity
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [cuisineType, setCuisineType] = useState('italian');
  const [tagline, setTagline] = useState('Fine dining & authentic culinary heritage');
  const [currency, setCurrency] = useState('INR');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [plan, setPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File Too Large', 'Please upload a logo image under 10MB.');
      return;
    }
    try {
      const downscaledBase64 = await downscaleImage(file, 150);
      setLogoUrl(downscaledBase64);
      toast.success('Logo Optimized & Uploaded', 'Restaurant logo auto-downscaled to 150px.');
    } catch (err: any) {
      toast.error('Upload Failed', err.message || 'Could not process logo image');
    }
  };

  // Step 2: Branch Location & Taxes
  const [branchName, setBranchName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [branchEmail, setBranchEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [fssai, setFssai] = useState('');
  const [operatingHours, setOperatingHours] = useState('11:00 AM - 11:30 PM');
  const [taxRate, setTaxRate] = useState<number>(5);
  const [serviceChargeRate, setServiceChargeRate] = useState<number>(0);

  // Step 3: Dining Modes & Kitchen Stations
  const [diningModes, setDiningModes] = useState<string[]>([
    'DINE_IN',
    'TAKEAWAY',
    'DELIVERY',
    'QR_ORDER',
  ]);
  const [kitchenStations, setKitchenStations] = useState<string[]>([
    'Main Kitchen',
    'Beverage Bar',
    'Dessert & Bakery',
  ]);
  const [newStationInput, setNewStationInput] = useState('');

  // Step 4: Floor & Tables
  const [floorName, setFloorName] = useState('Ground Floor Dining');
  const [tableCount, setTableCount] = useState<number>(10);
  const [tableCapacity, setTableCapacity] = useState<number>(4);
  const [customTables, setCustomTables] = useState<Array<{
    name: string;
    capacity: number;
    shape: 'SQUARE' | 'RECTANGLE' | 'CIRCLE';
  }>>(() =>
    Array.from({ length: 10 }, (_, i) => {
      const num = i + 1;
      return {
        name: `T-${num < 10 ? '0' + num : num}`,
        capacity: num % 4 === 0 ? 6 : num % 3 === 0 ? 2 : 4,
        shape: num % 4 === 0 ? 'RECTANGLE' : num % 3 === 0 ? 'CIRCLE' : 'SQUARE',
      };
    })
  );
  const [selectedTableIdx, setSelectedTableIdx] = useState<number | null>(null);

  // Synchronize customTables when tableCount changes
  const handleTableCountChange = (newCount: number) => {
    setTableCount(newCount);
    setCustomTables((prev) => {
      const updated = [...prev];
      if (newCount > prev.length) {
        for (let i = prev.length; i < newCount; i++) {
          const num = i + 1;
          updated.push({
            name: `T-${num < 10 ? '0' + num : num}`,
            capacity: tableCapacity,
            shape: num % 4 === 0 ? 'RECTANGLE' : num % 3 === 0 ? 'CIRCLE' : 'SQUARE',
          });
        }
      } else if (newCount < prev.length) {
        return updated.slice(0, newCount);
      }
      return updated;
    });
  };

  const updateIndividualTableCapacity = (index: number, newCap: number) => {
    const safeCap = Math.max(1, Math.min(newCap, 50));
    setCustomTables((prev) =>
      prev.map((t, i) => (i === index ? { ...t, capacity: safeCap } : t))
    );
  };

  const updateIndividualTableShape = (index: number, shape: 'SQUARE' | 'RECTANGLE' | 'CIRCLE') => {
    setCustomTables((prev) =>
      prev.map((t, i) => (i === index ? { ...t, shape } : t))
    );
  };

  const applyBatchCapacityPreset = (preset: 'all2' | 'all4' | 'all6' | 'smartMix') => {
    setCustomTables((prev) =>
      prev.map((t, i) => {
        const num = i + 1;
        if (preset === 'all2') return { ...t, capacity: 2, shape: 'CIRCLE' };
        if (preset === 'all4') return { ...t, capacity: 4, shape: 'SQUARE' };
        if (preset === 'all6') return { ...t, capacity: 6, shape: 'RECTANGLE' };
        // smartMix: 2, 4, 6, 8
        const cap = num % 4 === 0 ? 6 : num % 3 === 0 ? 2 : num % 5 === 0 ? 8 : 4;
        const shape = cap === 2 ? 'CIRCLE' : cap === 6 || cap === 8 ? 'RECTANGLE' : 'SQUARE';
        return { ...t, capacity: cap, shape: shape as any };
      })
    );
    toast.success('Table Presets Applied', 'Updated capacities across all configured tables.');
  };

  // Step 5: Menu Catalog & Upload Scanner
  const [menuTemplate, setMenuTemplate] = useState<string>('italian');
  const [menuSource, setMenuSource] = useState<'upload' | 'template'>('template');
  const [isParsingMenu, setIsParsingMenu] = useState(false);
  const [parsedMenuCategories, setParsedMenuCategories] = useState<Array<{
    name: string;
    items: Array<{
      name: string;
      description: string;
      price?: number;
      foodType: 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';
      variants?: Array<{ name: string; price: number }>;
    }>;
  }>>([]);
  const [menuUploadInfo, setMenuUploadInfo] = useState<{
    fileName: string;
    itemCount: number;
    cleanedUp: boolean;
  } | null>(null);

  const [customItems, setCustomItems] = useState<Array<{ name: string; category: string; price: number; foodType: 'VEG' | 'NON_VEG' }>>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemType, setCustomItemType] = useState<'VEG' | 'NON_VEG'>('VEG');

  // Local Server Menu Parser Call with zero-retention guarantee
  const handleMenuFileUpload = async (file: File) => {
    if (!file) return;
    setIsParsingMenu(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res: any = await apiPost('/auth/parse-menu', {
            imageBase64: base64Data,
            fileName: file.name,
            mimeType: file.type,
          });

          if (res.categories && res.categories.length > 0) {
            setParsedMenuCategories(res.categories);
            setMenuSource('upload');
            setMenuUploadInfo({
              fileName: file.name,
              itemCount: res.totalItems || 0,
              cleanedUp: !!res.serverFileCleanedUp,
            });
            toast.success(
              'Menu Parsed Successfully!',
              `Extracted ${res.totalItems} items across ${res.categories.length} categories. Uploaded image safely deleted from server.`
            );
          } else {
            toast.info('No Items Detected', 'Could not detect structured dishes. Using starter template.');
          }
        } catch (err: any) {
          toast.error('Parsing Failed', err.message || 'Unable to scan menu image.');
        } finally {
          setIsParsingMenu(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsParsingMenu(false);
      toast.error('File Error', 'Failed to read file.');
    }
  };

  const handleLoadSampleMenu = async () => {
    setIsParsingMenu(true);
    try {
      const sampleText = `
APPETIZERS & SOUPS
1. Veg Manchow Soup - 180 (Crispy noodles, ginger garlic broth) [VEG]
2. Kung Pao Chicken Dumplings - Half: 220, Full: 380 (Tossed in Szechuan chili oil) [NON_VEG]
3. Crispy Honey Chili Lotus Stem - 320 (Toasted sesame, scallions) [VEG]

MAIN DISHES & WOK
4. Classic Butter Chicken - Half: 260, Full: 480 (Rich cashew tomato butter sauce) [NON_VEG]
5. Paneer Tikka Butter Masala - Half: 220, Full: 420 (Charred tandoori paneer) [VEG]
6. Hakka Garlic Noodles - Half: 190, Full: 340 (Julienned greens, roasted garlic) [VEG]
7. Hyderabadi Dum Biryani - Half: 280, Full: 520 (Fragrant saffron basmati) [NON_VEG]

DESSERTS & DRINKS
8. Belgian Chocolate Lava Cake - 240 (Warm molten chocolate center) [VEG]
9. Mango Basil Cold Brew Iced Tea - 180 (Brewed with fresh Alphonso puree) [VEG]
      `;
      const res: any = await apiPost('/auth/parse-menu', { sampleText, fileName: 'sample-catalogue.txt' });
      if (res.categories) {
        setParsedMenuCategories(res.categories);
        setMenuSource('upload');
        setMenuUploadInfo({
          fileName: 'Sample Multi-Cuisine Menu',
          itemCount: res.totalItems || 0,
          cleanedUp: true,
        });
        toast.success('Sample Menu Loaded', `Extracted ${res.totalItems} items with Half/Full price options.`);
      }
    } catch (err: any) {
      toast.error('Sample Load Failed', err.message);
    } finally {
      setIsParsingMenu(false);
    }
  };

  const removeParsedCategory = (catIdx: number) => {
    setParsedMenuCategories((prev) => prev.filter((_, i) => i !== catIdx));
  };

  const removeParsedItem = (catIdx: number, itemIdx: number) => {
    setParsedMenuCategories((prev) =>
      prev.map((cat, cI) => {
        if (cI !== catIdx) return cat;
        return {
          ...cat,
          items: cat.items.filter((_, iI) => iI !== itemIdx),
        };
      }).filter((cat) => cat.items.length > 0)
    );
  };

  const updateParsedItemPrice = (catIdx: number, itemIdx: number, varIdx: number, newPrice: number) => {
    setParsedMenuCategories((prev) =>
      prev.map((cat, cI) => {
        if (cI !== catIdx) return cat;
        return {
          ...cat,
          items: cat.items.map((item, iI) => {
            if (iI !== itemIdx) return item;
            return {
              ...item,
              variants: (item.variants || []).map((v, vI) => (vI === varIdx ? { ...v, price: newPrice } : v)),
            };
          }),
        };
      })
    );
  };

  // Step 6: Owner Admin Account
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Auto-fill slug from restaurant name
  const handleNameChange = (val: string) => {
    setRestaurantName(val);
    if (!slug || slug === restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
    if (!branchName) {
      setBranchName(`${val} - Flagship Outlet`);
    }
  };

  const toggleDiningMode = (mode: string) => {
    setDiningModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const addKitchenStation = () => {
    if (newStationInput.trim() && !kitchenStations.includes(newStationInput.trim())) {
      setKitchenStations([...kitchenStations, newStationInput.trim()]);
      setNewStationInput('');
    }
  };

  const removeKitchenStation = (name: string) => {
    if (kitchenStations.length > 1) {
      setKitchenStations(kitchenStations.filter((s) => s !== name));
    }
  };

  const addCustomMenuItem = () => {
    if (customItemName.trim() && customItemPrice) {
      setCustomItems([
        ...customItems,
        {
          name: customItemName.trim(),
          category: "Chef's Signature",
          price: parseFloat(customItemPrice) || 299,
          foodType: customItemType,
        },
      ]);
      setCustomItemName('');
      setCustomItemPrice('');
    }
  };

  const removeCustomMenuItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!restaurantName.trim()) {
        toast.error('Restaurant Name Required', 'Please enter your restaurant or brand name.');
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!city.trim()) {
        toast.error('City Required', 'Please provide the operating city for your branch.');
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (diningModes.length === 0) {
        toast.error('Select Dining Modes', 'Please enable at least one dining service mode.');
        return false;
      }
      if (kitchenStations.length === 0) {
        toast.error('Kitchen Station Required', 'Please maintain at least 1 kitchen station.');
        return false;
      }
      return true;
    }
    if (currentStep === 4) {
      if (tableCount < 1) {
        toast.error('Invalid Table Count', 'Please configure at least 1 table.');
        return false;
      }
      return true;
    }
    if (currentStep === 6) {
      if (!ownerName.trim()) {
        toast.error('Owner Name Required', 'Please enter your full name.');
        return false;
      }
      if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
        toast.error('Valid Email Required', 'Please enter a valid administrator email.');
        return false;
      }
      if (ownerPassword.length < 6) {
        toast.error('Password Too Short', 'Please choose a password with at least 6 characters.');
        return false;
      }
      return true;
    }
    return true;
  };

  const validateAllRequiredFields = (): boolean => {
    if (!restaurantName.trim()) {
      setCurrentStep(1);
      toast.error('Restaurant Name Required', 'Please enter your restaurant name in Step 1.');
      return false;
    }
    if (!city.trim()) {
      setCurrentStep(2);
      toast.error('Operating City Required', 'Please enter your branch city in Step 2.');
      return false;
    }
    if (!ownerName.trim()) {
      setCurrentStep(6);
      toast.error('Owner Name Required', 'Please enter the administrator full name in Step 6.');
      return false;
    }
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      setCurrentStep(6);
      toast.error('Valid Email Required', 'Please enter a valid email address in Step 6.');
      return false;
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      setCurrentStep(6);
      toast.error('Password Required', 'Please enter a secure password (min 6 characters) in Step 6.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 7));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit and Provision
  const handleLaunchOnboarding = async () => {
    if (!validateAllRequiredFields()) return;

    setIsSubmitting(true);
    setProvisioningStatus('Initiating Restaurant Operating System...');

    const payload = {
      name: restaurantName.trim(),
      slug: slug.trim() || undefined,
      cuisineType,
      logoUrl: logoUrl.trim() || undefined,
      plan,
      tagline: tagline.trim() || undefined,
      currency: currency || 'INR',
      timezone: timezone || 'Asia/Kolkata',

      branchName: branchName.trim() || `${restaurantName.trim()} - Flagship Outlet`,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: branchEmail.trim() || ownerEmail.trim(),
      gstin: gstin.trim() || undefined,
      fssai: fssai.trim() || undefined,
      operatingHours: operatingHours || '11:00 AM - 11:00 PM',

      taxRate: Number(taxRate) >= 0 ? Number(taxRate) : 5,
      serviceChargeRate: Number(serviceChargeRate) >= 0 ? Number(serviceChargeRate) : 0,
      diningModes: diningModes.length > 0 ? diningModes : ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_ORDER'],
      kitchenStations: kitchenStations.length > 0 ? kitchenStations : ['Main Kitchen', 'Beverage Bar', 'Dessert & Bakery'],

      floorName: floorName.trim() || 'Main Dining Floor',
      tableCount: Number(tableCount) || 10,
      tableCapacity: Number(tableCapacity) || 4,
      customTables: customTables.map((t, idx) => ({
        name: t.name || `T-${idx < 9 ? '0' + (idx + 1) : idx + 1}`,
        capacity: Number(t.capacity) || 4,
        shape: t.shape || 'SQUARE',
      })),

      menuTemplate: cuisineType,
      parsedMenuCategories: parsedMenuCategories.length > 0
        ? parsedMenuCategories.map((cat) => ({
            name: cat.name,
            items: cat.items.map((item) => ({
              name: item.name,
              description: item.description || '',
              price: Number(item.price) || (item.variants?.[0]?.price ? Number(item.variants[0].price) : 250),
              foodType: item.foodType || 'VEG',
              variants: item.variants && item.variants.length > 0
                ? item.variants.map((v) => ({ name: v.name, price: Number(v.price) || 0 }))
                : undefined,
            })),
          }))
        : undefined,
      customMenuItems: customItems.length > 0
        ? customItems.map((item) => ({
            name: item.name,
            category: item.category || "Chef's Specials",
            price: Number(item.price) || 299,
            foodType: item.foodType || 'VEG',
          }))
        : undefined,

      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      ownerPassword,
      ownerPhone: ownerPhone.trim() || phone.trim() || undefined,
    };

    try {
      setProvisioningStatus('Provisioning Multi-Tenant Architecture & Roles...');
      await new Promise((r) => setTimeout(r, 400));

      setProvisioningStatus('Creating Branch, Floor Plan & Tables with QR Tokens...');
      await new Promise((r) => setTimeout(r, 400));

      setProvisioningStatus('Injecting Menu Catalog & Kitchen Stations...');

      const response: any = await apiPost('/auth/onboard', payload);

      setProvisioningStatus('Securing Credentials & Authorizing Session...');
      await new Promise((r) => setTimeout(r, 400));

      // Save Auth State
      if (response?.accessToken && response?.user) {
        setAuth(response.accessToken, response.user);
        connectSocket(response.accessToken);
      }

      toast.success(
        `Welcome to ROS, ${ownerName}!`,
        `${restaurantName} has been successfully provisioned and configured.`
      );

      // Transition to Dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setIsSubmitting(false);
      setProvisioningStatus('');
      
      let errMsg = 'Failed to provision restaurant. Please check the details and try again.';
      if (err?.response?.data?.error?.fieldErrors) {
        const fieldKeys = Object.keys(err.response.data.error.fieldErrors);
        if (fieldKeys.length > 0) {
          const firstField = fieldKeys[0];
          const msgs = err.response.data.error.fieldErrors[firstField];
          errMsg = `${firstField}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`;
        }
      } else if (err?.response?.data?.error?.message) {
        errMsg = err.response.data.error.message;
      } else if (err?.message) {
        errMsg = err.message;
      }
      toast.error('Onboarding Failed', errMsg);
    }
  };

  const steps = [
    { num: 1, title: 'Brand & Identity', icon: Building2 },
    { num: 2, title: 'Location & Taxes', icon: MapPin },
    { num: 3, title: 'Dining & Kitchen', icon: ChefHat },
    { num: 4, title: 'Floor & Tables', icon: LayoutGrid },
    { num: 5, title: 'Menu Catalog', icon: UtensilsCrossed },
    { num: 6, title: 'Owner Account', icon: ShieldCheck },
    { num: 7, title: 'Launch OS', icon: Rocket },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card/50 to-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-primary/80 to-amber-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <ChefHat className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">ROS Onboarding</h1>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-bold">
                  Self-Serve Setup
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Onboard your restaurant brand, tables, kitchen, tax rules, and menu in under 2 minutes
              </p>
            </div>
          </div>
          <a
            href="/login"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            Existing user? <span className="text-primary hover:underline">Log in</span>
          </a>
        </div>

        {/* Step Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2 scrollbar-none">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.num;
              const isCompleted = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => {
                    if (s.num < currentStep) setCurrentStep(s.num);
                  }}
                  disabled={s.num > currentStep || isSubmitting}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold scale-105'
                      : isCompleted
                      ? 'bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer'
                      : 'bg-muted/40 text-muted-foreground opacity-60 cursor-not-allowed'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
          <div className="w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary via-amber-500 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content Card */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-xl shadow-2xl shadow-black/10 overflow-hidden">
          {/* STEP 1: Brand & Identity */}
          {currentStep === 1 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Restaurant Identity & Brand Profile
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell us about your culinary concept and establish your restaurant's digital presence
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Restaurant / Brand Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Bella Napoli Trattoria"
                    value={restaurantName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-11 bg-background text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    URL Identifier / Tenant Slug
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-xs text-muted-foreground font-mono">ros.io/</span>
                    <Input
                      placeholder="bella-napoli"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="h-11 bg-background pl-16 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="col-span-full space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Brand Tagline / Slogan</label>
                  <Input
                    placeholder="e.g. Authentic Wood-Fired Artisanal Flavors"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="h-11 bg-background text-sm"
                  />
                </div>

                {/* Restaurant Brand Logo Upload */}
                <div className="col-span-full p-4 rounded-xl border border-border bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-primary" />
                        Restaurant Brand Logo
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Upload your high-res restaurant logo (PNG, JPG, SVG, WebP up to 5MB) or enter an image URL
                      </p>
                    </div>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLogoUrl('')}
                        className="text-xs h-7 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove Logo
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Logo Preview */}
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-primary/40 bg-card flex items-center justify-center overflow-hidden shrink-0 relative group">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Restaurant Logo"
                          className="w-full h-full object-cover rounded-full p-0.5"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-muted-foreground">
                          <ChefHat className="w-7 h-7" />
                          <span className="text-[9px] font-semibold mt-1">NO LOGO</span>
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="flex-1 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <div className="h-10 px-4 rounded-lg border border-border bg-card hover:bg-accent text-xs font-semibold text-foreground flex items-center justify-center gap-2 transition-colors">
                            <UploadCloud className="w-4 h-4 text-primary" />
                            <span>Browse & Upload Logo File</span>
                          </div>
                        </label>
                      </div>

                      <div className="relative">
                        <Input
                          placeholder="Or paste direct image URL (https://...)"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="h-9 text-xs bg-card"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cuisine Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-foreground">
                  Primary Cuisine Concept <span className="text-xs text-muted-foreground">(Sets up tailored menu & KDS)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CUISINE_OPTIONS.map((c) => {
                    const Icon = c.icon;
                    const isSelected = cuisineType === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setCuisineType(c.id);
                          setMenuTemplate(c.id);
                        }}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5',
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                            : 'border-border/60 bg-card/40 hover:border-border hover:bg-accent/40'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            {c.name}
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regional Preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Operating Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {CURRENCIES.map((cur) => (
                      <option key={cur.code} value={cur.code}>
                        {cur.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                    <option value="America/New_York">America/New_York (EST -5:00)</option>
                    <option value="Europe/London">Europe/London (GMT +0:00)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                  </select>
                </div>
              </div>

              {/* Plan Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Select Operating Subscription Plan</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.map((p) => {
                    const isSelected = plan === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setPlan(p.id as any)}
                        className={cn(
                          'p-4 rounded-xl border transition-all cursor-pointer relative',
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                            : 'border-border/60 bg-card/30 hover:border-border'
                        )}
                      >
                        {p.popular && (
                          <Badge className="absolute -top-2.5 right-3 bg-amber-500 text-black text-[10px] font-extrabold px-2 py-0.5">
                            POPULAR
                          </Badge>
                        )}
                        <div className="text-sm font-bold text-foreground">{p.name}</div>
                        <div className="text-base font-black text-primary mt-1">{p.price}</div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{p.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location, Compliance & Taxes */}
          {currentStep === 2 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Outlet Location & Legal Tax Configuration
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure your primary branch address, compliance licenses, and billing tax rates
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Branch / Outlet Name</label>
                  <Input
                    placeholder="e.g. Connaught Place Flagship"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="h-11 bg-background text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    City <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Mumbai, New Delhi, Bangalore, London"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-11 bg-background text-sm font-medium"
                  />
                </div>

                <div className="col-span-full space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Full Street Address</label>
                  <Input
                    placeholder="e.g. Unit 4, Heritage Block, High Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-11 bg-background text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Contact Phone</label>
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 bg-background text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Operating Hours</label>
                  <Input
                    placeholder="e.g. 11:00 AM - 11:30 PM"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    className="h-11 bg-background text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">GSTIN / Tax ID Number</label>
                  <Input
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="h-11 bg-background text-sm font-mono uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">FSSAI / Food Safety License</label>
                  <Input
                    placeholder="e.g. 10019011000543"
                    value={fssai}
                    onChange={(e) => setFssai(e.target.value)}
                    className="h-11 bg-background text-sm font-mono"
                  />
                </div>
              </div>

              {/* Tax & Charges Policy */}
              <div className="border-t border-border/60 pt-5 space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BadgePercent className="w-4 h-4 text-primary" />
                  Tax Structure & Guest Charges
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">Default GST / VAT Rate</label>
                      <span className="text-sm font-extrabold text-primary">{taxRate}%</span>
                    </div>
                    <div className="flex gap-2">
                      {[0, 5, 12, 18].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setTaxRate(rate)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all',
                            taxRate === rate
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                          )}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically creates split CGST ({(taxRate / 2).toFixed(1)}%) + SGST ({(taxRate / 2).toFixed(1)}%) in invoicing.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground">Service Charge</label>
                      <span className="text-sm font-extrabold text-primary">{serviceChargeRate}%</span>
                    </div>
                    <div className="flex gap-2">
                      {[0, 5, 10].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setServiceChargeRate(rate)}
                          className={cn(
                            'flex-1 py-1.5 rounded-lg text-xs font-bold transition-all',
                            serviceChargeRate === rate
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                          )}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Discretionary dining service charge applied to guest bills.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Dining Modes & Kitchen Stations */}
          {currentStep === 3 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" />
                  Service Modes & Kitchen Station Routing
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose operational fulfillment channels and configure kitchen display stations (KDS)
                </p>
              </div>

              {/* Dining Modes */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-foreground">Enabled Dining Fulfillment Modes</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'DINE_IN', label: 'Dine-In Table Service', desc: 'Table management, captain ordering & split billing' },
                    { id: 'TAKEAWAY', label: 'Takeaway / Counter', desc: 'Quick counter billing & customer pickup display' },
                    { id: 'DELIVERY', label: 'Direct Delivery', desc: 'In-house delivery dispatch & driver tracking' },
                    { id: 'QR_ORDER', label: 'QR Self-Ordering', desc: 'Guest mobile browser ordering via table QR stickers' },
                    { id: 'BAR_CELLAR', label: 'Bar & Cellar Lounge', desc: 'Beverage ticketing, bot inventory & sommeliers' },
                    { id: 'DRIVE_THRU', label: 'Drive-Thru Lane', desc: 'Headset queue, timer sensor & window expediter' },
                  ].map((mode) => {
                    const isChecked = diningModes.includes(mode.id);
                    return (
                      <div
                        key={mode.id}
                        onClick={() => toggleDiningMode(mode.id)}
                        className={cn(
                          'p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2',
                          isChecked
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border/60 bg-card/30 opacity-70 hover:opacity-100'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{mode.label}</span>
                          <div
                            className={cn(
                              'w-4 h-4 rounded-md flex items-center justify-center border transition-all',
                              isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                            )}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">{mode.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kitchen Stations */}
              <div className="border-t border-border/60 pt-5 space-y-3">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Kitchen Preparation Stations (KDS / KOT Routing)</span>
                  <span className="text-xs text-muted-foreground">Dishes route automatically based on station</span>
                </label>

                <div className="flex flex-wrap gap-2">
                  {kitchenStations.map((station) => (
                    <Badge
                      key={station}
                      variant="secondary"
                      className="px-3 py-1.5 text-xs font-semibold flex items-center gap-2 bg-accent/80 border border-border"
                    >
                      <ChefHat className="w-3.5 h-3.5 text-primary" />
                      {station}
                      {kitchenStations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeKitchenStation(station)}
                          className="hover:text-destructive transition-colors ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 pt-1 max-w-md">
                  <Input
                    placeholder="Add custom station (e.g. Wood-Fired Oven, Sushi Bar)"
                    value={newStationInput}
                    onChange={(e) => setNewStationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKitchenStation();
                      }
                    }}
                    className="h-10 bg-background text-xs"
                  />
                  <Button
                    type="button"
                    onClick={addKitchenStation}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Floor & Table Grid Designer */}
          {currentStep === 4 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                  Floor Plan & Table Grid Layout
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure table count, adjust individual table seating capacities on-the-fly, and prepare QR ordering tokens
                </p>
              </div>

              {/* Main Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Floor Name</label>
                  <Input
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    placeholder="e.g. Main Dining Hall"
                    className="h-11 bg-background text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground">
                      Total Tables <span className="text-destructive">*</span>
                    </label>
                    <span className="text-xs font-extrabold text-primary">{tableCount} Tables</span>
                  </div>
                  <select
                    value={tableCount}
                    onChange={(e) => handleTableCountChange(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Table' : 'Tables'} {num === 10 ? '— Standard (10)' : num === 20 ? '— Medium (20)' : num === 50 ? '— Large Hall (50)' : num === 100 ? '— Max Capacity (100)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-foreground">Quick Batch Presets</label>
                    <span className="text-[11px] text-muted-foreground">Bulk apply</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyBatchCapacityPreset('all2')}
                      className="py-2.5 rounded-lg text-xs font-bold transition-all border bg-muted/40 border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground text-center"
                      title="Set all tables to 2 guests"
                    >
                      2 Pax
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBatchCapacityPreset('all4')}
                      className="py-2.5 rounded-lg text-xs font-bold transition-all border bg-muted/40 border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground text-center"
                      title="Set all tables to 4 guests"
                    >
                      4 Pax
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBatchCapacityPreset('all6')}
                      className="py-2.5 rounded-lg text-xs font-bold transition-all border bg-muted/40 border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground text-center"
                      title="Set all tables to 6 guests"
                    >
                      6 Pax
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBatchCapacityPreset('smartMix')}
                      className="py-2.5 rounded-lg text-xs font-bold transition-all border bg-primary/15 border-primary/40 text-primary hover:bg-primary/25 text-center"
                      title="Mix of 2, 4, 6 and 8 guests"
                    >
                      Mix
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Seating Statistics & Individual Capacity Adjuster */}
              <div className="border border-border/70 rounded-2xl p-5 bg-card/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Interactive Table Layout & Seating Customizer
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      Edit Any Table Capacity
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Total Floor Seating:{' '}
                      <strong className="text-primary font-mono text-sm">
                        {customTables.reduce((acc, t) => acc + (t.capacity || 0), 0)} Guests
                      </strong>
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-muted-foreground">
                      Tables: <strong className="text-foreground font-mono">{customTables.length}</strong>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Click the <strong className="text-foreground">-</strong> or <strong className="text-foreground">+</strong> buttons on any table card below to edit its exact guest capacity. You can also edit table shapes or adjust capacity after onboarding under the Tables module.
                </p>

                {/* Table Grid with Direct Steppers */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {customTables.map((table, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5',
                        selectedTableIdx === idx
                          ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary'
                          : 'border-border/70 bg-background/80 hover:border-border'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground">{table.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">
                            {table.shape === 'CIRCLE' ? '●' : table.shape === 'RECTANGLE' ? '▭' : '■'}
                          </span>
                        </div>
                        <QrCode className="w-3.5 h-3.5 text-emerald-400 opacity-80" />
                      </div>

                      {/* Seating Stepper */}
                      <div className="flex items-center justify-between bg-muted/40 rounded-lg p-1 border border-border/50">
                        <button
                          type="button"
                          onClick={() => updateIndividualTableCapacity(idx, table.capacity - 1)}
                          disabled={table.capacity <= 1}
                          className="w-6 h-6 rounded flex items-center justify-center bg-card hover:bg-accent text-foreground disabled:opacity-30 text-xs font-bold"
                        >
                          -
                        </button>
                        <div className="flex items-center gap-1 font-mono text-xs font-extrabold text-primary">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span>{table.capacity} pax</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateIndividualTableCapacity(idx, table.capacity + 1)}
                          disabled={table.capacity >= 30}
                          className="w-6 h-6 rounded flex items-center justify-center bg-card hover:bg-accent text-foreground disabled:opacity-30 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>

                      {/* Shape toggle */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                        <span>Shape:</span>
                        <div className="flex gap-1">
                          {(['SQUARE', 'RECTANGLE', 'CIRCLE'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => updateIndividualTableShape(idx, s)}
                              className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors',
                                table.shape === s
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted text-muted-foreground'
                              )}
                            >
                              {s === 'SQUARE' ? 'Sq' : s === 'RECTANGLE' ? 'Rec' : 'Cir'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Menu Catalog & Local Server OCR Scanner */}
          {currentStep === 5 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                  Menu Catalogue & Local Auto-Scanner
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload an existing restaurant menu card to auto-extract categories, items, and Full/Half prices with zero server retention, or use a starter pack
                </p>
              </div>

              {/* Source Switcher */}
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setMenuSource('upload')}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all flex items-center gap-2.5',
                    menuSource === 'upload'
                      ? 'border-primary bg-primary/10 shadow-sm font-bold text-foreground'
                      : 'border-border/60 bg-card/30 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <UploadCloud className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Upload Menu Card</div>
                    <div className="text-[10px] text-muted-foreground">Auto-Scan Image / PDF</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMenuSource('template')}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all flex items-center gap-2.5',
                    menuSource === 'template'
                      ? 'border-primary bg-primary/10 shadow-sm font-bold text-foreground'
                      : 'border-border/60 bg-card/30 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Cuisine Starter Pack</div>
                    <div className="text-[10px] text-muted-foreground">Pre-loaded dishes</div>
                  </div>
                </button>
              </div>

              {/* UPLOAD & OCR PARSER SECTION */}
              {menuSource === 'upload' && (
                <div className="space-y-5">
                  {/* Zero Retention Security Notice */}
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-emerald-400">
                        Local Server Processing & Zero Image Retention Guarantee
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Menu images are parsed by our high-precision local OCR engine and the uploaded image file is <strong>instantly and permanently deleted</strong> from local server storage immediately after items are extracted.
                      </p>
                    </div>
                  </div>

                  {/* Drag & Drop Upload Zone */}
                  <div className="border-2 border-dashed border-border/80 rounded-2xl p-6 sm:p-8 bg-card/40 text-center space-y-3 hover:border-primary/60 transition-colors relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf,text/plain"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMenuFileUpload(file);
                        e.target.value = '';
                      }}
                      disabled={isParsingMenu}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />

                    {isParsingMenu ? (
                      <div className="flex flex-col items-center justify-center py-4 space-y-3">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">Extracting Categories, Dishes & Prices...</p>
                          <p className="text-xs text-muted-foreground">Parsing Full/Half variants and dietary indicators</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">
                            Drop your restaurant menu card here or <span className="text-primary underline">browse file</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supports JPG, PNG, WEBP, and PDF menu cards
                          </p>
                        </div>
                        <div className="pt-2 flex justify-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadSampleMenu();
                            }}
                            className="text-xs font-semibold gap-1.5 z-20"
                          >
                            <Wand2 className="w-3.5 h-3.5 text-primary" />
                            Load Sample Multi-Course Menu
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Parsed Menu Preview */}
                  {parsedMenuCategories.length > 0 && (
                    <div className="border border-border/70 rounded-2xl p-5 bg-card/40 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Extracted Menu Structure ({parsedMenuCategories.length} Categories)
                          </span>
                        </div>
                        {menuUploadInfo && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                              Image Deleted from Disk
                            </Badge>
                            <span className="text-muted-foreground">
                              {menuUploadInfo.itemCount} Items Detected
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Categories List */}
                      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                        {parsedMenuCategories.map((cat, catIdx) => (
                          <div key={catIdx} className="p-3.5 rounded-xl border border-border/60 bg-background/70 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                {cat.name} ({cat.items.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => removeParsedCategory(catIdx)}
                                className="text-muted-foreground hover:text-destructive text-xs transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Items inside category */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {cat.items.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="p-3 rounded-lg border border-border/40 bg-card/60 flex flex-col justify-between gap-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs">
                                          {item.foodType === 'NON_VEG' ? '🔴' : item.foodType === 'EGG' ? '🟡' : '🟢'}
                                        </span>
                                        <span className="text-xs font-bold text-foreground">{item.name}</span>
                                      </div>
                                      {item.description && (
                                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeParsedItem(catIdx, itemIdx)}
                                      className="text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {/* Pricing variants (Full / Half / Regular) */}
                                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                                    {(item.variants || []).map((v, vIdx) => (
                                      <div
                                        key={vIdx}
                                        className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px] font-mono border border-border/40"
                                      >
                                        <span className="text-muted-foreground font-sans text-[10px] font-semibold">{v.name}:</span>
                                        <span className="text-primary font-bold">₹</span>
                                        <input
                                          type="number"
                                          value={v.price}
                                          onChange={(e) =>
                                            updateParsedItemPrice(
                                              catIdx,
                                              itemIdx,
                                              vIdx,
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                          className="w-12 bg-transparent text-foreground font-bold focus:outline-none text-[11px]"
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
              )}

              {/* TEMPLATE FALLBACK SECTION */}
              {menuSource === 'template' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          Included Starter Menu Pack ({cuisineType.toUpperCase()})
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                        Ready to Sell on POS
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your restaurant will be seeded with top-selling signature starters, mains, and beverage items mapped to Kitchen Stations with automated costings and tax rules.
                    </p>
                  </div>

                  {/* Custom Item Quick Add */}
                  <div className="border-t border-border/60 pt-4 space-y-3">
                    <label className="text-xs font-bold text-foreground">Add Custom Specialty Items (Optional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <Input
                        placeholder="Dish Name (e.g. Signature Truffle Risotto)"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        className="sm:col-span-2 h-10 bg-background text-xs font-medium"
                      />
                      <Input
                        placeholder="Price (e.g. 450)"
                        type="number"
                        value={customItemPrice}
                        onChange={(e) => setCustomItemPrice(e.target.value)}
                        className="h-10 bg-background text-xs font-mono"
                      />
                      <div className="flex gap-2">
                        <select
                          value={customItemType}
                          onChange={(e) => setCustomItemType(e.target.value as any)}
                          className="h-10 px-2 rounded-md border border-input bg-background text-xs font-medium focus:outline-none flex-1"
                        >
                          <option value="VEG">VEG 🟢</option>
                          <option value="NON_VEG">NON-VEG 🔴</option>
                        </select>
                        <Button
                          type="button"
                          onClick={addCustomMenuItem}
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Custom items list */}
                    {customItems.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {customItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card/50 text-xs"
                          >
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                              <span>{item.foodType === 'VEG' ? '🟢' : '🔴'}</span>
                              <span>{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-primary">₹{item.price}</span>
                              <button
                                type="button"
                                onClick={() => removeCustomMenuItem(idx)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Owner Admin Account */}
          {currentStep === 6 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Owner Administrator Credentials
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your master account to manage POS, kitchen displays, inventory, staff, and finances
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Owner Full Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Chef Marco Rossi / Rajiv Sharma"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="h-11 bg-background text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Work Email Address <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="owner@restaurant.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="h-11 bg-background text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Master Password <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="h-11 bg-background pr-10 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {ownerPassword && (
                    <div className="flex items-center gap-1.5 text-[11px] pt-1">
                      <div
                        className={cn(
                          'h-1 flex-1 rounded-full',
                          ownerPassword.length >= 8 ? 'bg-emerald-500' : ownerPassword.length >= 6 ? 'bg-amber-500' : 'bg-destructive'
                        )}
                      />
                      <span className="text-muted-foreground">
                        {ownerPassword.length >= 8 ? 'Strong' : ownerPassword.length >= 6 ? 'Moderate' : 'Weak'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Mobile Phone Number</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="h-11 bg-background text-sm font-mono"
                  />
                </div>
              </div>

              {/* Security guarantee */}
              <div className="p-4 rounded-xl border border-border/70 bg-card/40 flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="font-bold text-foreground">Enterprise Multi-Tenant Security Guarantee</div>
                  <p>
                    Your restaurant data is strictly tenant-isolated with cryptographically hashed passwords and role-based access control (RBAC).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Launch & Review */}
          {currentStep === 7 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-primary" />
                  Review & Instant Launch
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Double check your configuration summary before provisioning your restaurant system
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Restaurant Brand</div>
                  <div className="text-base font-extrabold text-foreground">{restaurantName}</div>
                  <div className="text-xs text-muted-foreground">{tagline}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase">{cuisineType}</Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">{currency} • {timezone}</Badge>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Outlet & Taxes</div>
                  <div className="text-base font-extrabold text-foreground">{branchName || restaurantName}</div>
                  <div className="text-xs text-muted-foreground">{city} • {operatingHours}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary" className="text-[10px] font-bold">GST: {taxRate}%</Badge>
                    {serviceChargeRate > 0 && (
                      <Badge variant="secondary" className="text-[10px] font-bold">Service: {serviceChargeRate}%</Badge>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dining & Layout</div>
                  <div className="text-sm font-bold text-foreground">{floorName}</div>
                  <div className="text-xs text-muted-foreground">
                    {tableCount} Tables (~{tableCount * tableCapacity} Seats) with Unique QR Tokens
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {kitchenStations.length} Kitchen Stations: {kitchenStations.join(', ')}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border/70 bg-card/40 space-y-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Administrator Account</div>
                  <div className="text-sm font-bold text-foreground">{ownerName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{ownerEmail}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                      ROLE: OWNER (Super Admin)
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Progress feedback when submitting */}
              {isSubmitting && (
                <div className="p-5 rounded-2xl border border-primary/40 bg-primary/10 text-center space-y-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                  <div className="text-sm font-bold text-foreground">{provisioningStatus}</div>
                  <p className="text-xs text-muted-foreground">
                    Setting up tables, permissions, menu, and securing credentials...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer Navigation Buttons */}
          <div className="p-6 bg-accent/20 border-t border-border/60 flex items-center justify-between gap-4">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 7 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleLaunchOnboarding}
                disabled={isSubmitting}
                className="gap-2 bg-gradient-to-r from-primary via-amber-500 to-emerald-500 hover:opacity-95 text-primary-foreground font-extrabold px-6 shadow-lg shadow-primary/25"
              >
                <Rocket className="w-5 h-5" /> Launch Restaurant OS
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

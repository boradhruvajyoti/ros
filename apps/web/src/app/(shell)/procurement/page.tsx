'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Plus, Search, FileText, CheckCircle2, Clock, AlertCircle,
  Building2, Phone, Mail, ArrowRight, PackageCheck, Download, Loader2, ShoppingCart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';

interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  paymentTerms?: string | null;
  gstin?: string | null;
}

interface PurchaseOrderItem {
  id: string;
  ingredientId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier?: Supplier;
  supplierId: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  expectedDate?: string | null;
  createdAt: string;
  items?: PurchaseOrderItem[];
}

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<'pos' | 'suppliers'>('pos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddPoOpen, setIsAddPoOpen] = useState(false);

  // Supplier form
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supGstin, setSupGstin] = useState('');
  const [supTerms, setSupTerms] = useState('NET 15 Days');

  // PO form
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItemName, setPoItemName] = useState('');
  const [poQty, setPoQty] = useState('');
  const [poUnitPrice, setPoUnitPrice] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ['procurement-suppliers'],
    queryFn: () => apiGet<Supplier[]>('/procurement/suppliers'),
  });

  const { data: purchaseOrders = [], isLoading: loadingPOs } = useQuery<PurchaseOrder[]>({
    queryKey: ['procurement-orders'],
    queryFn: () => apiGet<PurchaseOrder[]>('/procurement/orders'),
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => apiPost('/procurement/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      toast.success('Supplier registered successfully');
      setIsAddSupplierOpen(false);
      setSupName('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
      setSupGstin('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create supplier');
    },
  });

  const createPoMutation = useMutation({
    mutationFn: (data: any) => apiPost('/procurement/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement-orders'] });
      toast.success('Purchase Order created successfully');
      setIsAddPoOpen(false);
      setPoItemName('');
      setPoQty('');
      setPoUnitPrice('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create Purchase Order');
    },
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    createSupplierMutation.mutate({
      name: supName.trim(),
      contactName: supContact.trim() || undefined,
      phone: supPhone.trim() || undefined,
      email: supEmail.trim() || undefined,
      gstin: supGstin.trim() || undefined,
      paymentTerms: supTerms,
    });
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (!poQty || Number(poQty) <= 0 || !poUnitPrice || Number(poUnitPrice) <= 0) {
      toast.error('Please specify valid quantity and unit price');
      return;
    }
    createPoMutation.mutate({
      supplierId: poSupplierId,
      items: [
        {
          ingredientId: 'raw-material',
          quantity: Number(poQty),
          unitPrice: Number(poUnitPrice),
        },
      ],
    });
  };

  const getStatusBadge = (st: PurchaseOrder['status']) => {
    switch (st) {
      case 'DRAFT':
        return <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">Draft</span>;
      case 'SENT':
        return <span className="text-[11px] font-semibold text-blue-500 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/30">Sent to Supplier</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">Partially Received</span>;
      case 'RECEIVED':
        return <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">Received &amp; Stocked</span>;
      case 'CANCELLED':
        return <span className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">Cancelled</span>;
      default:
        return <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">{st}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Procurement &amp; Supply Chain
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage vendor directories, issue Purchase Orders, and track incoming goods
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsAddSupplierOpen(true)}
            className="gap-2"
          >
            <Building2 className="w-4 h-4" /> Add Vendor
          </Button>
          <Button
            onClick={() => {
              if (suppliers.length === 0) {
                toast.error('Please add at least one supplier first.');
                setIsAddSupplierOpen(true);
                return;
              }
              setPoSupplierId(suppliers[0]?.id || '');
              setIsAddPoOpen(true);
            }}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Purchase Order
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'pos', label: 'Purchase Orders', count: purchaseOrders.length },
          { id: 'suppliers', label: 'Suppliers Directory', count: suppliers.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {tab.label}
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold', activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Purchase Orders */}
      {activeTab === 'pos' && (
        <div>
          {loadingPOs ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading purchase orders...</p>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No Purchase Orders Created</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Generate POs to order dairy, produce, spices, and supplies from your registered vendors.
              </p>
              <Button
                onClick={() => {
                  if (suppliers.length === 0) {
                    setIsAddSupplierOpen(true);
                  } else {
                    setPoSupplierId(suppliers[0]?.id || '');
                    setIsAddPoOpen(true);
                  }
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Create First PO
              </Button>
            </Card>
          ) : (
            <Card className="border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">PO Number</th>
                      <th className="px-6 py-3.5 font-semibold">Vendor</th>
                      <th className="px-6 py-3.5 font-semibold">Order Date</th>
                      <th className="px-6 py-3.5 font-semibold">Amount</th>
                      <th className="px-6 py-3.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-foreground font-mono">{po.poNumber}</p>
                          <p className="text-[11px] text-muted-foreground">{po.items?.length || 1} items</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">{po.supplier?.name || 'Vendor'}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-foreground">{formatCurrency(po.totalAmount)}</td>
                        <td className="px-6 py-4">{getStatusBadge(po.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div>
          {loadingSuppliers ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading suppliers...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No Suppliers Registered</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Add your wholesale produce vendors, dairy suppliers, and packaging partners.
              </p>
              <Button onClick={() => setIsAddSupplierOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add First Supplier
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suppliers.map((sup) => (
                <Card key={sup.id} className="border-border/70 bg-card/60 backdrop-blur-sm p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground">{sup.name}</h3>
                      {sup.contactName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5" /> {sup.contactName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {sup.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" /> {sup.phone}
                      </p>
                    )}
                    {sup.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5" /> {sup.email}
                      </p>
                    )}
                    {sup.gstin && <p className="font-mono text-[11px] pt-1">GSTIN: {sup.gstin}</p>}
                  </div>

                  {sup.paymentTerms && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {sup.paymentTerms}
                      </span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-fade-in">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold">Register Vendor / Supplier</CardTitle>
              <CardDescription>Add contact details and terms for procurement</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleCreateSupplier} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Supplier / Company Name *</label>
                  <Input
                    required
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    placeholder="e.g. Metro Dairy Wholesalers"
                    className="h-10"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Contact Person</label>
                    <Input
                      value={supContact}
                      onChange={(e) => setSupContact(e.target.value)}
                      placeholder="e.g. Suresh Singhania"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Phone Number</label>
                    <Input
                      value={supPhone}
                      onChange={(e) => setSupPhone(e.target.value)}
                      placeholder="+91 98101 22334"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Email</label>
                    <Input
                      type="email"
                      value={supEmail}
                      onChange={(e) => setSupEmail(e.target.value)}
                      placeholder="orders@vendor.com"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Payment Terms</label>
                    <select
                      value={supTerms}
                      onChange={(e) => setSupTerms(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option>Cash On Delivery</option>
                      <option>NET 7 Days</option>
                      <option>NET 15 Days</option>
                      <option>NET 30 Days</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">GSTIN Number</label>
                  <Input
                    value={supGstin}
                    onChange={(e) => setSupGstin(e.target.value)}
                    placeholder="07AAACM1234F1Z1"
                    className="h-10 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsAddSupplierOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSupplierMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground font-semibold"
                  >
                    {createSupplierMutation.isPending ? 'Saving...' : 'Save Supplier'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add PO Modal */}
      {isAddPoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-fade-in">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold">Create Purchase Order</CardTitle>
              <CardDescription>Issue an order requisition to a vendor</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleCreatePO} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Select Vendor *</label>
                  <select
                    value={poSupplierId}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Quantity *</label>
                    <Input
                      type="number"
                      required
                      value={poQty}
                      onChange={(e) => setPoQty(e.target.value)}
                      placeholder="e.g. 25"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Unit Price (₹) *</label>
                    <Input
                      type="number"
                      required
                      value={poUnitPrice}
                      onChange={(e) => setPoUnitPrice(e.target.value)}
                      placeholder="e.g. 320"
                      className="h-10"
                    />
                  </div>
                </div>

                {Number(poQty) > 0 && Number(poUnitPrice) > 0 && (
                  <div className="p-3 bg-accent/40 rounded-lg text-xs font-medium flex justify-between">
                    <span>Estimated Total:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(Number(poQty) * Number(poUnitPrice))}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsAddPoOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPoMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground font-semibold"
                  >
                    {createPoMutation.isPending ? 'Issuing...' : 'Issue Order'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid3X3, List, Plus, Users, Clock, CircleCheck, CircleDot,
  Wrench, Ban, Edit3, Trash2, X, Check, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface Table {
  id: string;
  name: string;
  capacity: number;
  shape?: 'RECTANGLE' | 'CIRCLE' | 'SQUARE';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED';
  floorId?: string;
  floor?: { id: string; name: string };
  orders?: any[];
  posX: number; posY: number; width: number; height: number;
}

const STATUS_META = {
  AVAILABLE: { label: 'Available', color: 'bg-green-500', icon: CircleCheck, bg: 'table-available', text: 'text-green-600' },
  OCCUPIED:  { label: 'Occupied',  color: 'bg-red-500',   icon: CircleDot,  bg: 'table-occupied',  text: 'text-red-500'  },
  RESERVED:  { label: 'Reserved',  color: 'bg-amber-500', icon: Clock,      bg: 'table-reserved',  text: 'text-amber-500'},
  CLEANING:  { label: 'Cleaning',  color: 'bg-sky-500',   icon: Wrench,     bg: 'table-cleaning',  text: 'text-sky-500'  },
  BLOCKED:   { label: 'Blocked',   color: 'bg-zinc-500',  icon: Ban,        bg: 'table-blocked',   text: 'text-zinc-500' },
};

type ViewMode = 'grid' | 'floor';

export default function TablesPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Edit / Create Table Modal State
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableCapacityInput, setTableCapacityInput] = useState<number>(4);
  const [tableShapeInput, setTableShapeInput] = useState<'RECTANGLE' | 'CIRCLE' | 'SQUARE'>('SQUARE');
  const [tableStatusInput, setTableStatusInput] = useState<Table['status']>('AVAILABLE');
  const [tableFloorIdInput, setTableFloorIdInput] = useState<string>('');

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => apiGet<any[]>('/tables/floors'),
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['tables', statusFilter],
    queryFn: () => apiGet(`/tables${statusFilter ? `?status=${statusFilter}` : ''}`),
    refetchInterval: 30000,
  });

  // Mutations
  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiPatch(`/tables/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Table Updated', `Table details and seating capacity updated.`);
      setEditingTable(null);
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.message || 'Could not update table capacity.');
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiPost('/tables', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Table Created', 'New table added to dining floor.');
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      toast.error('Creation Failed', err.message || 'Could not create table.');
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiDelete(`/tables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Table Removed', 'Table deactivated.');
      setEditingTable(null);
    },
    onError: (err: any) => {
      toast.error('Delete Failed', err.message || 'Could not delete table.');
    },
  });

  const handleOpenEdit = (table: Table) => {
    setEditingTable(table);
    setTableNameInput(table.name);
    setTableCapacityInput(table.capacity);
    setTableShapeInput(table.shape || 'SQUARE');
    setTableStatusInput(table.status);
    setTableFloorIdInput(table.floorId || (floors[0] as any)?.id || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    updateTableMutation.mutate({
      id: editingTable.id,
      data: {
        name: tableNameInput.trim(),
        capacity: Number(tableCapacityInput) || 4,
        shape: tableShapeInput,
        status: tableStatusInput,
        floorId: tableFloorIdInput || undefined,
      },
    });
  };

  const handleOpenCreate = () => {
    setTableNameInput(`T-${tables.length + 1 < 10 ? `0${tables.length + 1}` : tables.length + 1}`);
    setTableCapacityInput(4);
    setTableShapeInput('SQUARE');
    setTableStatusInput('AVAILABLE');
    setTableFloorIdInput((floors[0] as any)?.id || '');
    setIsCreateModalOpen(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTableMutation.mutate({
      name: tableNameInput.trim(),
      capacity: Number(tableCapacityInput) || 4,
      shape: tableShapeInput,
      floorId: tableFloorIdInput || undefined,
    });
  };

  // Quick inline capacity adjust
  const handleQuickCapacityChange = (table: Table, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCap = Math.max(1, Math.min(table.capacity + delta, 50));
    if (newCap === table.capacity) return;
    updateTableMutation.mutate({
      id: table.id,
      data: { capacity: newCap },
    });
  };

  const statusCounts = Object.entries(STATUS_META).reduce((acc, [key]) => {
    acc[key] = tables.filter((t) => t.status === key).length;
    return acc;
  }, {} as Record<string, number>);

  const totalSeats = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tables & Floor Management</h1>
          <p className="text-sm text-muted-foreground">
            {tables.length} tables · {totalSeats} total seating capacity · {statusCounts.OCCUPIED || 0} occupied
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 transition-colors', view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
              title="Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('floor')}
              className={cn('p-2 transition-colors', view === 'floor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
              title="Floor Layout"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button size="sm" onClick={handleOpenCreate} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4" /> Add Table
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter(null)}
            className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
              !statusFilter ? 'bg-primary text-primary-foreground border-transparent font-bold' : 'border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            All ({tables.length})
          </button>
          {Object.entries(STATUS_META).map(([status, meta]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status === statusFilter ? null : status)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5',
                statusFilter === status ? `${meta.bg} border-transparent font-bold` : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              <div className={cn('w-2 h-2 rounded-full', meta.color)} />
              {meta.label} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {tables.map((table) => {
            const meta = STATUS_META[table.status];
            const Icon = meta.icon;
            return (
              <div
                key={table.id}
                onClick={() => handleOpenEdit(table)}
                className={cn(
                  'relative flex flex-col items-center justify-between p-4 rounded-2xl border-2 cursor-pointer',
                  'transition-all duration-200 hover:scale-[1.02] hover:shadow-lg aspect-square group',
                  table.status === 'AVAILABLE' ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10' :
                  table.status === 'OCCUPIED'  ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10' :
                  table.status === 'RESERVED'  ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' :
                  table.status === 'CLEANING'  ? 'border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10' :
                  'border-zinc-500/30 bg-zinc-500/5'
                )}
              >
                {/* Header info */}
                <div className="w-full flex items-center justify-between">
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', meta.text)}>
                    {meta.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(table);
                    }}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-background/80 text-muted-foreground transition-opacity"
                    title="Edit capacity & properties"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Table Identity */}
                <div className="flex flex-col items-center justify-center my-auto">
                  <Icon className={cn('w-5 h-5 mb-1.5', meta.text)} />
                  <p className="text-base font-black text-foreground">{table.name}</p>
                  {table.floor?.name && (
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{table.floor.name}</span>
                  )}
                </div>

                {/* Seating Stepper */}
                <div
                  className="w-full flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-xl px-2 py-1 border border-border/50 text-xs mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => handleQuickCapacityChange(table, -1, e)}
                    disabled={table.capacity <= 1}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 font-bold"
                  >
                    -
                  </button>
                  <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                    <Users className="w-3 h-3 text-primary" />
                    <span>{table.capacity} pax</span>
                  </div>
                  <button
                    onClick={(e) => handleQuickCapacityChange(table, 1, e)}
                    disabled={table.capacity >= 50}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 font-bold"
                  >
                    +
                  </button>
                </div>

                {table.status === 'OCCUPIED' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
            );
          })}

          {tables.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Grid3X3 className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-semibold">No tables found</p>
              <p className="text-xs mt-1">Click &apos;Add Table&apos; to create dining seating</p>
            </div>
          )}
        </div>
      ) : (
        /* Floor plan view */
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {(floors as any[]).map((floor: any) => (
            <div key={floor.id} className="p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-widest">{floor.name}</h3>
              <div className="relative bg-muted/30 rounded-xl" style={{ height: '500px' }}>
                {(floor.tables || []).map((t: Table) => {
                  const meta = STATUS_META[t.status];
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleOpenEdit(t)}
                      style={{
                        position: 'absolute',
                        left: t.posX,
                        top: t.posY,
                        width: t.width,
                        height: t.height,
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-xl border-2 cursor-pointer transition-all hover:scale-105 hover:shadow-md text-center p-1',
                        t.status === 'AVAILABLE' ? 'border-green-500/50 bg-green-500/10' :
                        t.status === 'OCCUPIED'  ? 'border-red-500/50 bg-red-500/10' :
                        t.status === 'RESERVED'  ? 'border-amber-500/50 bg-amber-500/10' :
                        t.status === 'CLEANING'  ? 'border-sky-500/50 bg-sky-500/10' :
                        'border-zinc-500/50 bg-zinc-500/10'
                      )}
                    >
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground font-semibold">{t.capacity} seats</p>
                      <div className={cn('mt-1 w-1.5 h-1.5 rounded-full', meta.color)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT TABLE CAPACITY MODAL */}
      {editingTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  Edit Table & Seating Capacity
                </h3>
                <p className="text-xs text-muted-foreground">Modify table properties and guest pax</p>
              </div>
              <button
                onClick={() => setEditingTable(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Table Name</label>
                <Input
                  value={tableNameInput}
                  onChange={(e) => setTableNameInput(e.target.value)}
                  placeholder="e.g. T-01, VIP-A"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Seating Capacity (Pax)</label>
                  <span className="font-mono text-sm font-extrabold text-primary">{tableCapacityInput} Guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={tableCapacityInput}
                    onChange={(e) => setTableCapacityInput(parseInt(e.target.value, 10) || 1)}
                    className="font-mono font-bold"
                  />
                  <div className="flex gap-1">
                    {[2, 4, 6, 8].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setTableCapacityInput(cap)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                          tableCapacityInput === cap
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                        )}
                      >
                        {cap}p
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Shape</label>
                  <select
                    value={tableShapeInput}
                    onChange={(e) => setTableShapeInput(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none"
                  >
                    <option value="SQUARE">Square ■</option>
                    <option value="RECTANGLE">Rectangle ▭</option>
                    <option value="CIRCLE">Circle ●</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Current Status</label>
                  <select
                    value={tableStatusInput}
                    onChange={(e) => setTableStatusInput(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to deactivate table ${editingTable.name}?`)) {
                      deleteTableMutation.mutate(editingTable.id);
                    }
                  }}
                  className="gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Deactivate
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTable(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateTableMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW TABLE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Add New Table
                </h3>
                <p className="text-xs text-muted-foreground">Assign table name and guest capacity</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Table Name</label>
                <Input
                  value={tableNameInput}
                  onChange={(e) => setTableNameInput(e.target.value)}
                  placeholder="e.g. T-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Seating Capacity (Pax)</label>
                  <span className="font-mono text-sm font-extrabold text-primary">{tableCapacityInput} Guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={tableCapacityInput}
                    onChange={(e) => setTableCapacityInput(parseInt(e.target.value, 10) || 1)}
                    className="font-mono font-bold"
                  />
                  <div className="flex gap-1">
                    {[2, 4, 6, 8].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setTableCapacityInput(cap)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                          tableCapacityInput === cap
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/60 text-muted-foreground hover:bg-accent'
                        )}
                      >
                        {cap}p
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Shape</label>
                <select
                  value={tableShapeInput}
                  onChange={(e) => setTableShapeInput(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-xs font-medium focus:outline-none"
                >
                  <option value="SQUARE">Square ■</option>
                  <option value="RECTANGLE">Rectangle ▭</option>
                  <option value="CIRCLE">Circle ●</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createTableMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Create Table
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

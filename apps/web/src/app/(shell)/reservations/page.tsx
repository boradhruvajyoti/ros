'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck, Plus, Search, Filter, Phone, Users, Clock,
  CheckCircle2, XCircle, UserCheck, AlertCircle, Sparkles, MapPin, Loader2, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  date: string;
  timeSlot: string;
  occasion?: string | null;
  specialRequests?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'ARRIVED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  table?: {
    id: string;
    tableNumber: string;
  } | null;
}

const statusMeta: Record<string, { label: string; badge: string }> = {
  PENDING: { label: 'Pending', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  CONFIRMED: { label: 'Confirmed', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  ARRIVED: { label: 'Arrived', badge: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  SEATED: { label: 'Seated', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  COMPLETED: { label: 'Completed', badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
  CANCELLED: { label: 'Cancelled', badge: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
  NO_SHOW: { label: 'No Show', badge: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
};

export default function ReservationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('19:30');
  const [occasion, setOccasion] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations'],
    queryFn: () => apiGet<Reservation[]>('/reservations'),
  });

  const createReservationMutation = useMutation({
    mutationFn: (data: any) => apiPost('/reservations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservation booked successfully');
      setIsAddOpen(false);
      setName('');
      setPhone('');
      setOccasion('');
      setSpecialRequests('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create reservation');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/reservations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservation status updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update reservation');
    },
  });

  const filteredReservations = reservations.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch =
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerPhone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Customer name and phone are required');
      return;
    }
    createReservationMutation.mutate({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      partySize: Number(partySize) || 2,
      date,
      timeSlot,
      occasion: occasion.trim() || undefined,
      specialRequests: specialRequests.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary" />
            Table Reservations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage advance bookings, guest arrival status, and table allocations
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Booking
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name or phone..."
            className="pl-10 h-11 bg-card border-border rounded-xl"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['ALL', 'PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap',
                statusFilter === st
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              )}
            >
              {st === 'ALL' ? 'All Bookings' : statusMeta[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading reservations...</p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Reservations Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Record guest bookings, party sizes, time slots, and special celebration requests.
          </p>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Book First Table
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReservations.map((res) => {
            const meta = statusMeta[res.status] || { label: res.status, badge: 'bg-muted text-muted-foreground' };
            return (
              <Card
                key={res.id}
                className="border-border/70 bg-card/60 backdrop-blur-sm transition-all hover:shadow-lg hover:border-border flex flex-col justify-between"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {res.customerName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{res.customerPhone}</span>
                      </div>
                    </div>
                    <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full border', meta.badge)}>
                      {meta.label}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-lg bg-accent/40">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-foreground">{res.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span className="font-semibold text-foreground">{res.partySize} Guests</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>Table: <strong className="text-foreground">{res.table?.tableNumber || 'Auto-allocated'}</strong></span>
                    </div>
                  </div>

                  {res.occasion && (
                    <div className="text-xs text-amber-500 font-medium flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      <Sparkles className="w-3 h-3" />
                      {res.occasion}
                    </div>
                  )}

                  {res.specialRequests && (
                    <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded-md">
                      &ldquo;{res.specialRequests}&rdquo;
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    {res.status === 'PENDING' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: res.id, status: 'CONFIRMED' })}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm
                      </Button>
                    )}
                    {res.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: res.id, status: 'SEATED' })}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" /> Seat Guest
                      </Button>
                    )}
                    {res.status === 'SEATED' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: res.id, status: 'COMPLETED' })}
                        className="flex-1 bg-zinc-700 hover:bg-zinc-800 text-white text-xs h-8"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                      </Button>
                    )}
                    {['PENDING', 'CONFIRMED'].includes(res.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: res.id, status: 'CANCELLED' })}
                        className="text-xs h-8 text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Booking Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-fade-in">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold">New Table Booking</CardTitle>
              <CardDescription>Reserve a dining table for an upcoming guest</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleCreateReservation} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Guest Name *</label>
                    <Input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="h-10"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Phone Number *</label>
                    <Input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Guests</label>
                    <Input
                      type="number"
                      min="1"
                      value={partySize}
                      onChange={(e) => setPartySize(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Date</label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Time Slot</label>
                    <Input
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      placeholder="19:30"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Occasion</label>
                  <Input
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder="e.g. Birthday, Anniversary, Business"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Special Requests</label>
                  <Input
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. Window seat, high chair needed"
                    className="h-10"
                  />
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createReservationMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground font-semibold"
                  >
                    {createReservationMutation.isPending ? 'Booking...' : 'Confirm Booking'}
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

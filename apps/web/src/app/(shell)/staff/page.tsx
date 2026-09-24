'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck, Plus, Search, Clock, Calendar, Shield, Phone,
  Mail, CheckCircle2, XCircle, AlertCircle, Briefcase, Award, Users, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';

interface Employee {
  id: string;
  name: string;
  department: string;
  designation: string;
  phone?: string | null;
  email?: string | null;
  shift?: string | null;
  salary?: number | null;
  attendance?: Array<{
    id: string;
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
    checkInAt?: string | null;
    checkOutAt?: string | null;
    date: string;
  }>;
}

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance' | 'leaves'>('directory');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Kitchen');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSalary, setNewSalary] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['staff-employees'],
    queryFn: () => apiGet<Employee[]>('/staff/employees'),
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: any) => apiPost('/staff/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-employees'] });
      toast.success('Staff member registered successfully');
      setIsAddModalOpen(false);
      setNewName('');
      setNewDesignation('');
      setNewPhone('');
      setNewEmail('');
      setNewSalary('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add staff member');
    },
  });

  const punchAttendanceMutation = useMutation({
    mutationFn: (data: { employeeId: string; status: 'PRESENT' | 'LEAVE' | 'ABSENT' }) =>
      apiPost('/staff/attendance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-employees'] });
      toast.success('Attendance updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update attendance');
    },
  });

  const departments = ['ALL', 'Management', 'Kitchen', 'Service', 'Bar', 'Cleaning'];

  const filteredStaff = employees.filter((e) => {
    const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.designation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const activeCount = employees.filter((e) => e.attendance?.[0]?.status === 'PRESENT').length;
  const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesignation.trim()) {
      toast.error('Please provide name and designation');
      return;
    }
    createEmployeeMutation.mutate({
      name: newName.trim(),
      department: newDept,
      designation: newDesignation.trim(),
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      salary: newSalary ? Number(newSalary) : 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-primary" />
            Staff &amp; Human Resources
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage employee rosters, live attendance check-ins, department shifts, and salaries
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Team Member
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <span className="text-xs font-semibold text-muted-foreground">Total Staff Count</span>
          <p className="text-2xl font-bold text-foreground mt-2">{employees.length} members</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Active directory roster</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <span className="text-xs font-semibold text-muted-foreground">Currently Clocked In</span>
          <p className="text-2xl font-bold text-emerald-500 mt-2">{activeCount} Active</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">On duty shift</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <span className="text-xs font-semibold text-muted-foreground">Monthly Payroll Est.</span>
          <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalPayroll)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total salary commitment</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <span className="text-xs font-semibold text-muted-foreground">On Leave Today</span>
          <p className="text-2xl font-bold text-amber-500 mt-2">
            {employees.filter((e) => e.attendance?.[0]?.status === 'LEAVE').length} Members
          </p>
          <p className="text-[11px] text-amber-500 mt-0.5 font-medium">Approved leaves</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'directory', label: 'Staff Directory' },
          { id: 'attendance', label: 'Live Attendance & Roster' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Staff Directory */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name or designation..."
                className="pl-10 h-11 bg-card border-border rounded-xl"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDept(d)}
                  className={cn(
                    'px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap',
                    selectedDept === d
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {d === 'ALL' ? 'All Departments' : d}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading staff members...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No staff members found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Add your kitchen chefs, managers, waitstaff, and bartenders to manage rosters and payroll.
              </p>
              <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add First Team Member
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((emp) => {
                const isClockedIn = emp.attendance?.[0]?.status === 'PRESENT';
                return (
                  <Card key={emp.id} className="border-border/70 bg-card/60 backdrop-blur-sm p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-base text-foreground">{emp.name}</h3>
                        <p className="text-xs text-primary font-medium">{emp.designation}</p>
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded mt-1 inline-block">
                          {emp.department}
                        </span>
                      </div>
                      {isClockedIn ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          ● On Duty
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                          Off Duty
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      {emp.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5" /> {emp.phone}
                        </p>
                      )}
                      {emp.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> {emp.email}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs font-bold text-foreground">
                        {formatCurrency(emp.salary || 0)} / mo
                      </span>
                      <Button
                        size="sm"
                        variant={isClockedIn ? 'outline' : 'default'}
                        onClick={() =>
                          punchAttendanceMutation.mutate({
                            employeeId: emp.id,
                            status: isClockedIn ? 'ABSENT' : 'PRESENT',
                          })
                        }
                        className="text-xs h-7"
                      >
                        {isClockedIn ? 'Punch Out' : 'Punch In'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Attendance Tracker */}
      {activeTab === 'attendance' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-4">
          <CardTitle className="text-base">Duty Attendance Roster</CardTitle>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff members enrolled in roster.</p>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => {
                const isClockedIn = emp.attendance?.[0]?.status === 'PRESENT';
                return (
                  <div key={emp.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-accent/30">
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.designation} · Dept: {emp.department}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isClockedIn ? (
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                          ● Present
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                          Off Duty
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          punchAttendanceMutation.mutate({
                            employeeId: emp.id,
                            status: isClockedIn ? 'ABSENT' : 'PRESENT',
                          })
                        }
                        className="text-xs h-7"
                      >
                        Toggle
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-fade-in">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold">Add Staff Member</CardTitle>
              <CardDescription>Enroll a new employee into your restaurant team roster</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleCreateEmployee} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Full Name *</label>
                  <Input
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Harish Kumar"
                    className="h-10"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Department *</label>
                    <select
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option>Kitchen</option>
                      <option>Service</option>
                      <option>Bar</option>
                      <option>Management</option>
                      <option>Cleaning</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Designation *</label>
                    <Input
                      required
                      value={newDesignation}
                      onChange={(e) => setNewDesignation(e.target.value)}
                      placeholder="e.g. Head Chef"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Phone Number</label>
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Monthly Salary (₹)</label>
                    <Input
                      type="number"
                      value={newSalary}
                      onChange={(e) => setNewSalary(e.target.value)}
                      placeholder="35000"
                      className="h-10 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Email Address</label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="staff@restaurant.in"
                    className="h-10"
                  />
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createEmployeeMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground font-semibold"
                  >
                    {createEmployeeMutation.isPending ? 'Saving...' : 'Enroll Employee'}
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

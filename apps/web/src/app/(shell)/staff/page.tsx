'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCheck, Plus, Search, Clock, Calendar, Shield, Phone,
  Mail, CheckCircle2, XCircle, AlertCircle, Briefcase, Award, Users, Loader2,
  Trash2, Key, Check, Lock, ShieldCheck, Eye, EyeOff, Sparkles, User, AlertTriangle,
  Edit3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface Employee {
  id: string;
  name: string;
  department: string;
  designation: string;
  phone?: string | null;
  email?: string | null;
  shift?: string | null;
  salary?: number | null;
  userId?: string | null;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  } | null;
  attendance?: Array<{
    id: string;
    status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
    checkInAt?: string | null;
    checkOutAt?: string | null;
    date: string;
  }>;
}

const FEATURE_MODULES = [
  {
    id: 'pos',
    name: 'Point of Sale (POS)',
    icon: '🛒',
    description: 'Touch order billing, table orders, cart modifiers, fast pay',
    keyPermission: 'orders:create',
    permissions: ['orders:create', 'orders:edit', 'payments:create', 'discount:apply', 'menu:view'],
  },
  {
    id: 'tables',
    name: 'Tables & Orders Command Center',
    icon: '🍽️',
    description: 'Floor view, live table orders, KOT status advance, billing preview',
    keyPermission: 'tables:view',
    permissions: ['tables:view', 'tables:edit', 'orders:view', 'orders:edit', 'menu:view'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen Display System (KDS)',
    icon: '👨‍🍳',
    description: 'Live KOT tickets, accept orders, food ready bump action',
    keyPermission: 'kitchen:view',
    permissions: ['kitchen:view', 'kitchen:update', 'orders:view', 'menu:view'],
  },
  {
    id: 'history',
    name: 'Order History & Invoices',
    icon: '📜',
    description: 'View previous orders, reprint receipts, audit customer bills',
    keyPermission: 'payments:view',
    permissions: ['orders:view', 'payments:view'],
  },
  {
    id: 'reservations',
    name: 'Table Reservations',
    icon: '📅',
    description: 'Book tables, manage calendar, guest arrivals',
    keyPermission: 'reservations:view',
    permissions: ['reservations:view', 'reservations:create', 'reservations:edit', 'reservations:cancel'],
  },
  {
    id: 'menu',
    name: 'Menu & Category Management',
    icon: '📖',
    description: 'Create dishes, prices, half/full variants, modifier groups',
    keyPermission: 'menu:create',
    permissions: ['menu:view', 'menu:create', 'menu:edit', 'menu:delete'],
  },
  {
    id: 'inventory',
    name: 'Inventory & Recipe Yields',
    icon: '📦',
    description: 'Track ingredient stocks, production recipes, stock transfers',
    keyPermission: 'inventory:view',
    permissions: ['inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:transfer'],
  },
  {
    id: 'procurement',
    name: 'Procurement & Vendors',
    icon: '🚚',
    description: 'Purchase orders, supplier goods receipt notes',
    keyPermission: 'procurement:view',
    permissions: ['procurement:view', 'procurement:create', 'procurement:receive'],
  },
  {
    id: 'customers',
    name: 'Customers CRM & Loyalty',
    icon: '👥',
    description: 'Guest contacts, visit frequency, loyalty points',
    keyPermission: 'customers:view',
    permissions: ['customers:view', 'customers:create', 'customers:edit', 'loyalty:view'],
  },
  {
    id: 'expenses',
    name: 'Expenses & Financials',
    icon: '💰',
    description: 'Daily operational expenses, payouts, cash out logs',
    keyPermission: 'expenses:view',
    permissions: ['expenses:view', 'expenses:create', 'expenses:approve'],
  },
  {
    id: 'reports',
    name: 'Reports & P&L Analytics',
    icon: '📊',
    description: 'Sales summaries, tax reports, item performance',
    keyPermission: 'reports:view',
    permissions: ['reports:view', 'reports:export'],
  },
  {
    id: 'staff',
    name: 'Staff & Team HR',
    icon: '👤',
    description: 'Employee roster, attendance check-ins, staff accounts',
    keyPermission: 'staff:view',
    permissions: ['staff:view', 'staff:create', 'staff:edit', 'attendance:view', 'attendance:manage'],
  },
  {
    id: 'settings',
    name: 'Restaurant Settings & Hardware',
    icon: '⚙️',
    description: 'Tax configurations, thermal printer settings, general preferences',
    keyPermission: 'settings:view',
    permissions: ['settings:view', 'settings:edit'],
  },
];

const ROLE_PRESETS = [
  {
    id: 'WAITER',
    name: '🍽️ Waiter / Dining Captain',
    modules: ['pos', 'tables', 'history'],
  },
  {
    id: 'CHEF',
    name: '👨‍🍳 Kitchen Chef / Line Cook',
    modules: ['kitchen', 'inventory'],
  },
  {
    id: 'CASHIER',
    name: '💳 Cashier / Front Counter',
    modules: ['pos', 'history', 'expenses'],
  },
  {
    id: 'MANAGER',
    name: '📋 Floor Manager',
    modules: ['pos', 'tables', 'history', 'reservations', 'menu', 'customers', 'expenses', 'reports'],
  },
  {
    id: 'ADMIN',
    name: '⚡ Full-Access General Manager',
    modules: FEATURE_MODULES.map((m) => m.id),
  },
];

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'attendance'>('directory');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<Employee | null>(null);

  // Add Form State
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('Kitchen');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSalary, setNewSalary] = useState('');

  // User Account & Role Feature State (Add)
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRolePreset, setSelectedRolePreset] = useState<string>('WAITER');
  const [selectedModules, setSelectedModules] = useState<string[]>(['pos', 'tables', 'history']);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('Kitchen');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editCreateUserAccount, setEditCreateUserAccount] = useState(false);
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editSelectedRolePreset, setEditSelectedRolePreset] = useState<string>('CUSTOM');
  const [editSelectedModules, setEditSelectedModules] = useState<string[]>([]);

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
      resetAddForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to add staff member';
      toast.error('Registration Failed', msg);
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPut(`/staff/employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-employees'] });
      toast.success('Staff Member Updated', 'Employee details, user account and permissions saved.');
      setEditingEmployee(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to update staff member';
      toast.error('Update Failed', msg);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) => apiDelete(`/staff/employees/${employeeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-employees'] });
      toast.success('Staff Member Deleted', 'Employee record and user account access removed.');
      setDeleteConfirmEmp(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.message || 'Failed to delete staff member';
      toast.error('Deletion Failed', msg);
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

  const resetAddForm = () => {
    setNewName('');
    setNewDept('Kitchen');
    setNewDesignation('');
    setNewPhone('');
    setNewEmail('');
    setNewSalary('');
    setCreateUserAccount(false);
    setUserPassword('');
    setSelectedRolePreset('WAITER');
    setSelectedModules(['pos', 'tables', 'history']);
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedRolePreset(presetId);
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedModules(preset.modules);
    }
  };

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
    setSelectedRolePreset('CUSTOM');
  };

  const handleSelectAllModules = () => {
    if (selectedModules.length === FEATURE_MODULES.length) {
      setSelectedModules([]);
      setSelectedRolePreset('CUSTOM');
    } else {
      setSelectedModules(FEATURE_MODULES.map((m) => m.id));
      setSelectedRolePreset('ADMIN');
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditDept(emp.department || 'Kitchen');
    setEditDesignation(emp.designation || 'Staff');
    setEditPhone(emp.phone || '');
    setEditEmail(emp.email || emp.user?.email || '');
    setEditSalary(emp.salary ? String(emp.salary) : '');
    setEditCreateUserAccount(Boolean(emp.userId || emp.user));
    setEditUserPassword('');
    setEditShowPassword(false);

    // Compute which feature modules are active for this employee using exact keyPermission
    const userPerms = new Set(emp.user?.permissions || []);
    let matched: string[] = [];
    if (userPerms.size > 0) {
      matched = FEATURE_MODULES.filter((m) => userPerms.has(m.keyPermission)).map((m) => m.id);
    } else {
      matched = [];
    }
    setEditSelectedModules(matched);

    const roleName = emp.user?.roles?.[0] || 'CUSTOM';
    const foundPreset = ROLE_PRESETS.find(
      (p) =>
        (p.id === roleName || p.name.includes(roleName)) &&
        p.modules.length === matched.length &&
        p.modules.every((mId) => matched.includes(mId))
    );
    setEditSelectedRolePreset(foundPreset ? foundPreset.id : 'CUSTOM');
  };

  const handleApplyEditPreset = (presetId: string) => {
    setEditSelectedRolePreset(presetId);
    const preset = ROLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setEditSelectedModules(preset.modules);
    }
  };

  const toggleEditModule = (moduleId: string) => {
    setEditSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
    setEditSelectedRolePreset('CUSTOM');
  };

  const handleSelectAllEditModules = () => {
    if (editSelectedModules.length === FEATURE_MODULES.length) {
      setEditSelectedModules([]);
      setEditSelectedRolePreset('CUSTOM');
    } else {
      setEditSelectedModules(FEATURE_MODULES.map((m) => m.id));
      setEditSelectedRolePreset('ADMIN');
    }
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    if (!editName.trim() || !editDesignation.trim()) {
      toast.error('Required Fields Missing', 'Please provide full name and designation.');
      return;
    }

    if (editCreateUserAccount && !editEmail.trim()) {
      toast.error('Email Required', 'Please provide an email address for user login access.');
      return;
    }

    if (editCreateUserAccount && !editingEmployee.userId && (!editUserPassword || editUserPassword.length < 6)) {
      toast.error('Password Required', 'Please set an initial password with at least 6 characters for the new user account.');
      return;
    }

    const selectedPerms = Array.from(
      new Set(
        FEATURE_MODULES.filter((m) => editSelectedModules.includes(m.id)).flatMap((m) => m.permissions)
      )
    );

    const payload: any = {
      name: editName.trim(),
      department: editDept,
      designation: editDesignation.trim(),
      phone: editPhone.trim() || null,
      email: editEmail.trim() || null,
      salary: parseFloat(editSalary) || 0,
      createUserAccount: editCreateUserAccount,
      roleName: editSelectedRolePreset !== 'CUSTOM' ? editSelectedRolePreset : editDesignation.trim(),
      permissions: editCreateUserAccount ? selectedPerms : undefined,
    };

    if (editUserPassword.trim()) {
      payload.password = editUserPassword.trim();
    }

    updateEmployeeMutation.mutate({ id: editingEmployee.id, data: payload });
  };

  const departments = ['ALL', 'Kitchen', 'Service', 'Bar', 'Management', 'Cashier', 'Cleaning'];

  const filteredStaff = employees.filter((e) => {
    const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const activeCount = employees.filter((e) => e.attendance?.[0]?.status === 'PRESENT').length;
  const totalPayroll = employees.reduce((s, e) => s + (parseFloat(String(e.salary ?? 0)) || 0), 0);
  const salariedCount = employees.filter((e) => (parseFloat(String(e.salary ?? 0)) || 0) > 0).length;
  const accountsCount = employees.filter((e) => Boolean(e.userId || e.user)).length;

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesignation.trim()) {
      toast.error('Required Fields Missing', 'Please provide full name and designation.');
      return;
    }

    if (createUserAccount) {
      if (!newEmail.trim()) {
        toast.error('Email Required', 'Please provide an email address for the user account login.');
        return;
      }
      if (!userPassword || userPassword.length < 6) {
        toast.error('Invalid Password', 'Password must be at least 6 characters long.');
        return;
      }
    }

    // Collect all permissions for selected feature modules
    const selectedPerms = Array.from(
      new Set(
        FEATURE_MODULES.filter((m) => selectedModules.includes(m.id)).flatMap((m) => m.permissions)
      )
    );

    createEmployeeMutation.mutate({
      name: newName.trim(),
      department: newDept,
      designation: newDesignation.trim(),
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      salary: parseFloat(newSalary) || 0,
      createUserAccount,
      password: createUserAccount ? userPassword : undefined,
      roleName: createUserAccount ? selectedRolePreset : undefined,
      permissions: createUserAccount ? selectedPerms : undefined,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-card via-card/80 to-muted/40 border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
              👥
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
                Staff &amp; User Accounts Management
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Enroll staff members, create restaurant user login accounts, configure feature access permissions, and manage rosters.
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            resetAddForm();
            setIsAddModalOpen(true);
          }}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md rounded-2xl h-11 px-5"
        >
          <Plus className="w-4 h-4" /> Add Team Member
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Total Staff Roster</span>
          <p className="text-2xl font-black text-foreground mt-2">{employees.length} members</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{accountsCount} login accounts enabled</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Currently Clocked In</span>
          <p className="text-2xl font-black text-emerald-500 mt-2">{activeCount} Active</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">On duty shift</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Monthly Payroll</span>
          <p className="text-2xl font-black text-foreground mt-2">{formatCurrency(totalPayroll)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{salariedCount} salaried staff</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border rounded-2xl shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground">Active User Logins</span>
          <p className="text-2xl font-black text-indigo-400 mt-2">{accountsCount} Users</p>
          <p className="text-[11px] text-indigo-400 mt-0.5 font-medium">RBAC role access</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'directory', label: 'Staff Directory & Accounts' },
          { id: 'attendance', label: 'Live Attendance & Roster' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer',
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
                placeholder="Search staff by name, designation or login email..."
                className="pl-10 h-11 bg-card border-border rounded-xl"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDept(d)}
                  className={cn(
                    'px-3.5 py-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap cursor-pointer',
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
              <p className="text-sm">Loading staff members and accounts...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30 rounded-3xl">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-bold text-foreground">No staff members found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Add your kitchen chefs, managers, waitstaff, and cashiers to manage accounts, rosters, and feature permissions.
              </p>
              <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" /> Add First Team Member
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((emp) => {
                const isClockedIn = emp.attendance?.[0]?.status === 'PRESENT';
                const hasLoginAccount = Boolean(emp.userId || emp.user);

                return (
                  <Card key={emp.id} className="border-border/70 bg-card/60 backdrop-blur-sm p-5 space-y-4 rounded-3xl shadow-sm flex flex-col justify-between min-w-0 overflow-hidden">
                    <div className="space-y-3 min-w-0">
                      {/* Top Row: Name, Designation & Status */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-base text-foreground flex items-center gap-1.5 truncate">
                            {emp.name}
                          </h3>
                          <p className="text-xs text-primary font-bold truncate">{emp.designation}</p>
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full mt-1.5 inline-block truncate max-w-full">
                            {emp.department}
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {isClockedIn ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                              ● On Duty
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border shrink-0">
                              Off Duty
                            </span>
                          )}

                          {hasLoginAccount ? (
                            <Badge className="bg-indigo-600/15 text-indigo-400 border-indigo-500/30 font-bold text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0">
                              <Key className="w-3 h-3" /> Account Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground font-medium text-[10px] px-2 py-0.5 rounded-lg shrink-0">
                              No Login Account
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-1 text-xs text-muted-foreground pt-1 min-w-0">
                        {emp.phone && (
                          <p className="flex items-center gap-2 truncate min-w-0">
                            <Phone className="w-3.5 h-3.5 text-primary shrink-0" /> <span className="truncate">{emp.phone}</span>
                          </p>
                        )}
                        {emp.email && (
                          <p className="flex items-center gap-2 truncate min-w-0">
                            <Mail className="w-3.5 h-3.5 text-primary shrink-0" /> <span className="truncate">{emp.email}</span>
                          </p>
                        )}
                      </div>

                      {/* User Account Role Details */}
                      {hasLoginAccount && emp.user && (
                        <div className="p-2.5 rounded-2xl bg-muted/40 border border-border text-[11px] space-y-1 min-w-0">
                          <div className="flex items-center justify-between text-muted-foreground font-medium gap-1">
                            <span className="shrink-0">Role:</span>
                            <span className="font-bold text-foreground truncate">{emp.user.roles?.[0] || 'STAFF'}</span>
                          </div>
                          {emp.user.permissions?.length > 0 && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              <span>Accessible Features: </span>
                              <strong className="text-foreground">{emp.user.permissions.length} modules granted</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50 gap-2">
                      <span className="text-xs font-black text-foreground">
                        {formatCurrency(emp.salary || 0)} / mo
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant={isClockedIn ? 'outline' : 'default'}
                          onClick={() =>
                            punchAttendanceMutation.mutate({
                              employeeId: emp.id,
                              status: isClockedIn ? 'ABSENT' : 'PRESENT',
                            })
                          }
                          className="text-xs h-8 rounded-xl font-bold"
                        >
                          {isClockedIn ? 'Punch Out' : 'Punch In'}
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          title="Modify Staff Profile & Permissions"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmEmp(emp)}
                          title="Delete Staff Member & Account"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-4 rounded-3xl shadow-sm">
          <CardTitle className="text-base font-bold">Duty Attendance Roster</CardTitle>
          {employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff members enrolled in roster.</p>
          ) : (
            <div className="space-y-3">
              {employees.map((emp) => {
                const isClockedIn = emp.attendance?.[0]?.status === 'PRESENT';
                return (
                  <div key={emp.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-border bg-accent/30">
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.designation} · Dept: {emp.department}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isClockedIn ? (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
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
                        className="text-xs h-8 rounded-xl font-bold"
                      >
                        Toggle Status
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          ADD STAFF MEMBER & USER ACCOUNT MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl border-border bg-card shadow-2xl animate-fade-in my-8 max-h-[90vh] flex flex-col rounded-3xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" /> Add Staff Member &amp; User Account
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Register employee profile, set salary, and optionally provision a login account with granular feature permissions.
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <form id="add-staff-form" onSubmit={handleCreateEmployee} className="space-y-5">
                {/* Section 1: Staff Details */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> Employee Profile
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Full Name *</label>
                      <Input
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Harish Kumar"
                        className="h-10 rounded-xl"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Department *</label>
                      <select
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                      >
                        <option>Kitchen</option>
                        <option>Service</option>
                        <option>Bar</option>
                        <option>Management</option>
                        <option>Cashier</option>
                        <option>Cleaning</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Designation *</label>
                      <Input
                        required
                        value={newDesignation}
                        onChange={(e) => setNewDesignation(e.target.value)}
                        placeholder="e.g. Captain / Waiter"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Phone Number</label>
                      <Input
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Monthly Salary (₹)</label>
                      <Input
                        type="number"
                        value={newSalary}
                        onChange={(e) => setNewSalary(e.target.value)}
                        placeholder="25000"
                        className="h-10 font-bold rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Email Address {createUserAccount && <span className="text-rose-500">* (used for login)</span>}
                    </label>
                    <Input
                      type="email"
                      required={createUserAccount}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="staff@restaurant.in"
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                {/* Section 2: User Account & Feature Permissions */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">Provision User Login Account</h4>
                        <p className="text-[11px] text-muted-foreground">Allow this staff member to log in to ROS from browser or mobile.</p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createUserAccount}
                        onChange={(e) => setCreateUserAccount(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {createUserAccount && (
                    <div className="space-y-4 pt-2 border-t border-border/70 animate-fade-in">
                      {/* Password Field */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">Set Account Password *</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            required={createUserAccount}
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            placeholder="Min. 6 characters (e.g. Staff@123)"
                            className="h-10 rounded-xl pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Role Presets */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground block">
                          Role Presets <span className="text-muted-foreground font-normal">(Click to quickly preselect features)</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ROLE_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleApplyPreset(preset.id)}
                              className={cn(
                                'p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
                                selectedRolePreset === preset.id
                                  ? 'bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/40'
                                  : 'bg-card border-border text-foreground hover:bg-muted'
                              )}
                            >
                              <span>{preset.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {preset.modules.length} features
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Feature Permissions Matrix */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-primary" /> Feature Access Permissions
                          </span>
                          <button
                            type="button"
                            onClick={handleSelectAllModules}
                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            {selectedModules.length === FEATURE_MODULES.length ? 'Deselect All' : 'Select All Features'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 no-scrollbar">
                          {FEATURE_MODULES.map((mod) => {
                            const isSelected = selectedModules.includes(mod.id);
                            return (
                              <div
                                key={mod.id}
                                onClick={() => toggleModule(mod.id)}
                                className={cn(
                                  'p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all',
                                  isSelected
                                    ? 'bg-primary/10 border-primary/50 text-foreground'
                                    : 'bg-card border-border/60 text-muted-foreground hover:border-border'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-4 h-4 rounded-md mt-0.5 flex items-center justify-center text-[10px] font-black shrink-0 border',
                                    isSelected
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'border-muted-foreground/40 bg-background'
                                  )}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-foreground leading-tight flex items-center gap-1">
                                    <span>{mod.icon}</span> <span>{mod.name}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                    {mod.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-staff-form"
                disabled={createEmployeeMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6"
              >
                {createEmployeeMutation.isPending ? 'Enrolling...' : 'Save & Enroll Staff'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          EDIT STAFF MEMBER & USER ACCOUNT MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <Card className="w-full max-w-2xl border-border bg-card shadow-2xl my-8 max-h-[90vh] flex flex-col rounded-3xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border shrink-0 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-primary" /> Modify Staff &amp; Permissions
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Update profile, credentials, active status, or customize feature access permissions.
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <form id="edit-staff-form" onSubmit={handleUpdateEmployee} className="space-y-5">
                {/* Section 1: Staff Details */}
                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" /> Employee Profile
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Full Name *</label>
                      <Input
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Harish Kumar"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Department *</label>
                      <select
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                      >
                        <option>Kitchen</option>
                        <option>Service</option>
                        <option>Bar</option>
                        <option>Management</option>
                        <option>Cashier</option>
                        <option>Cleaning</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Designation *</label>
                      <Input
                        required
                        value={editDesignation}
                        onChange={(e) => setEditDesignation(e.target.value)}
                        placeholder="e.g. Captain / Waiter"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Phone Number</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">Monthly Salary (₹)</label>
                      <Input
                        type="number"
                        value={editSalary}
                        onChange={(e) => setEditSalary(e.target.value)}
                        placeholder="25000"
                        className="h-10 font-bold rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">
                      Email Address {editCreateUserAccount && <span className="text-rose-500">* (used for login)</span>}
                    </label>
                    <Input
                      type="email"
                      required={editCreateUserAccount}
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="staff@restaurant.in"
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                {/* Section 2: User Account & Feature Permissions */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          {editingEmployee.userId ? 'Manage User Login Account & Permissions' : 'Provision User Login Account'}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {editingEmployee.userId
                            ? 'Configure which modules and panels this account is allowed to access.'
                            : 'Create login credentials for this staff member.'}
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editCreateUserAccount}
                        onChange={(e) => setEditCreateUserAccount(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {editCreateUserAccount && (
                    <div className="space-y-4 pt-2 border-t border-border/70 animate-fade-in">
                      {/* Password Field */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-foreground">
                          {editingEmployee.userId ? 'Change Password (Leave blank to keep unchanged)' : 'Set Account Password *'}
                        </label>
                        <div className="relative">
                          <Input
                            type={editShowPassword ? 'text' : 'password'}
                            required={!editingEmployee.userId && editCreateUserAccount}
                            value={editUserPassword}
                            onChange={(e) => setEditUserPassword(e.target.value)}
                            placeholder={editingEmployee.userId ? '•••••••• (Enter new password to change)' : 'Min. 6 characters (e.g. Staff@123)'}
                            className="h-10 rounded-xl pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setEditShowPassword(!editShowPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Role Presets */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground block">
                          Role Presets <span className="text-muted-foreground font-normal">(Click to quickly preselect features)</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {ROLE_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleApplyEditPreset(preset.id)}
                              className={cn(
                                'p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex flex-col justify-between gap-1',
                                editSelectedRolePreset === preset.id
                                  ? 'bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/40'
                                  : 'bg-card border-border text-foreground hover:bg-muted'
                              )}
                            >
                              <span>{preset.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {preset.modules.length} features
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Feature Permissions Matrix */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-primary" /> Feature Access Permissions
                          </span>
                          <button
                            type="button"
                            onClick={handleSelectAllEditModules}
                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            {editSelectedModules.length === FEATURE_MODULES.length ? 'Deselect All' : 'Select All Features'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 no-scrollbar">
                          {FEATURE_MODULES.map((mod) => {
                            const isSelected = editSelectedModules.includes(mod.id);
                            return (
                              <div
                                key={mod.id}
                                onClick={() => toggleEditModule(mod.id)}
                                className={cn(
                                  'p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all',
                                  isSelected
                                    ? 'bg-primary/10 border-primary/50 text-foreground'
                                    : 'bg-card border-border/60 text-muted-foreground hover:border-border'
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-4 h-4 rounded-md mt-0.5 flex items-center justify-center text-[10px] font-black shrink-0 border',
                                    isSelected
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'border-muted-foreground/40 bg-background'
                                  )}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-foreground leading-tight flex items-center gap-1">
                                    <span>{mod.icon}</span> <span>{mod.name}</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                    {mod.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingEmployee(null)}
                className="rounded-xl px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="edit-staff-form"
                disabled={updateEmployeeMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6"
              >
                {updateEmployeeMutation.isPending ? 'Saving...' : 'Update Staff Member'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {deleteConfirmEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl rounded-3xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Remove Staff Member</h3>
                <p className="text-xs text-muted-foreground">Permanent deletion of employee &amp; account</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5 text-foreground">
              <p>
                Are you sure you want to remove <strong className="text-rose-400 font-bold">{deleteConfirmEmp.name}</strong> ({deleteConfirmEmp.designation})?
              </p>
              {deleteConfirmEmp.userId && (
                <p className="text-rose-300 text-[11px]">
                  ⚠️ This employee has an active user account (<strong>{deleteConfirmEmp.email}</strong>). Their login access to this restaurant will be permanently revoked.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmEmp(null)}
                disabled={deleteEmployeeMutation.isPending}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteEmployeeMutation.mutate(deleteConfirmEmp.id)}
                disabled={deleteEmployeeMutation.isPending}
                className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700"
              >
                {deleteEmployeeMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

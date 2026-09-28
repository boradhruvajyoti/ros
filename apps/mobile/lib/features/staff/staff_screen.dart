// =============================================================================
// Staff Screen — Restaurant & Cafe Staff Directory & Management
// Full designation dropdowns, departments, role presets & user provisioning
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/app_theme.dart';

// ── Designation Categories & Options for Cafe / Restaurant ───────────────────
class DesignationGroup {
  final String category;
  final List<String> items;

  const DesignationGroup({required this.category, required this.items});
}

const List<DesignationGroup> kDesignationCategories = [
  DesignationGroup(
    category: '👨‍💼 Management & Leadership',
    items: [
      'General Manager',
      'Assistant General Manager',
      'Restaurant Manager',
      'Cafe Manager',
      'Operations Manager',
      'Floor Manager',
      'Shift Supervisor',
      'Duty Manager',
    ],
  ),
  DesignationGroup(
    category: '🍽️ Front of House & Guest Service',
    items: [
      'F&B Captain',
      'Head Waiter',
      'Waiter / Server',
      'Waitress / Server',
      'Host / Hostess',
      'Food Runner',
      'Busser',
      'Head Cashier',
      'Cashier / Billing Staff',
      'POS Operator',
      'Order Taker',
      'Delivery Rider',
    ],
  ),
  DesignationGroup(
    category: '☕ Beverage, Bar & Cafe',
    items: [
      'Head Barista',
      'Barista',
      'Junior Barista',
      'Head Bartender',
      'Bartender / Mixologist',
      'Barback',
      'Sommelier / Wine Steward',
      'Juice & Beverage Maker',
    ],
  ),
  DesignationGroup(
    category: '👨‍🍳 Kitchen & Culinary (Back of House)',
    items: [
      'Executive Chef',
      'Head Chef',
      'Executive Sous Chef',
      'Sous Chef',
      'Chef de Partie (CDP)',
      'Demi Chef de Partie',
      'Commis I (Senior Cook)',
      'Commis II (Cook)',
      'Commis III (Junior Cook)',
      'Line Cook / Short Order Cook',
      'Pastry Chef / Baker',
      'Pizza Chef / Pizzaiolo',
      'Tandoor / Grill Master',
      'Chinese / Wok Chef',
      'South Indian Chef',
      'Prep Cook / Kitchen Helper',
    ],
  ),
  DesignationGroup(
    category: '📦 Inventory, Stewarding & Support',
    items: [
      'Storekeeper / Inventory Manager',
      'Procurement Executive',
      'Chief Steward',
      'Kitchen Steward / Dishwasher',
      'Housekeeping / Cleaner',
      'Security Officer',
    ],
  ),
];

const List<String> kDepartments = [
  'Kitchen',
  'Service',
  'Bar',
  'Management',
  'Cashier',
  'Cleaning',
];

class StaffScreen extends ConsumerStatefulWidget {
  const StaffScreen({super.key});

  @override
  ConsumerState<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends ConsumerState<StaffScreen> {
  String _searchQuery = '';
  String _selectedDept = 'ALL';

  @override
  Widget build(BuildContext context) {
    final staffAsync = ref.watch(staffProvider);

    return Scaffold(
      backgroundColor: RosTheme.bg,
      appBar: AppBar(
        title: const Text('Staff & HR'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => ref.invalidate(staffProvider),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddStaffSheet(context),
        backgroundColor: RosTheme.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_rounded),
        label: const Text('Add Staff', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Search staff by name, designation or email...',
                hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 13),
                prefixIcon: const Icon(Icons.search_rounded, color: RosTheme.textMuted, size: 20),
                filled: true,
                fillColor: RosTheme.bgElevated,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: RosTheme.bgBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: RosTheme.bgBorder),
                ),
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
            ),
          ),

          // Department Filter Chips
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildDeptChip('ALL', 'All Depts'),
                ...kDepartments.map((d) => _buildDeptChip(d, d)),
              ],
            ),
          ),
          const SizedBox(height: 6),

          // Staff List
          Expanded(
            child: staffAsync.when(
              data: (members) {
                final filtered = members.where((m) {
                  final matchesSearch = _searchQuery.isEmpty ||
                      m.name.toLowerCase().contains(_searchQuery) ||
                      (m.designation?.toLowerCase().contains(_searchQuery) ?? false) ||
                      m.email.toLowerCase().contains(_searchQuery);

                  final matchesDept = _selectedDept == 'ALL' ||
                      (m.department?.toLowerCase() == _selectedDept.toLowerCase());

                  return matchesSearch && matchesDept;
                }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.people_outline_rounded,
                              size: 48, color: RosTheme.textMuted.withValues(alpha: 0.5)),
                          const SizedBox(height: 12),
                          const Text(
                            'No staff members found',
                            style: TextStyle(
                              color: RosTheme.textSecondary,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 90),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final m = filtered[i];
                    return _buildStaffCard(m);
                  },
                );
              },
              loading: () =>
                  const Center(child: CircularProgressIndicator(color: RosTheme.primary)),
              error: (e, _) => Center(
                child: Text('$e', style: const TextStyle(color: RosTheme.textSecondary)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeptChip(String id, String label) {
    final isSelected = _selectedDept.toUpperCase() == id.toUpperCase();
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : RosTheme.textSecondary,
          ),
        ),
        selected: isSelected,
        selectedColor: RosTheme.primary,
        backgroundColor: RosTheme.bgElevated,
        showCheckmark: false,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(
            color: isSelected ? RosTheme.primary : RosTheme.bgBorder,
          ),
        ),
        onSelected: (_) {
          HapticFeedback.selectionClick();
          setState(() => _selectedDept = id);
        },
      ),
    );
  }

  Widget _buildStaffCard(StaffMember m) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: RosTheme.bgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: RosTheme.bgBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: RosTheme.primary.withValues(alpha: 0.15),
            child: Text(
              m.name.isNotEmpty ? m.name.substring(0, 1).toUpperCase() : 'S',
              style: const TextStyle(
                color: RosTheme.primary,
                fontWeight: FontWeight.w800,
                fontSize: 16,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        m.name,
                        style: const TextStyle(
                          color: RosTheme.textPrimary,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: m.isActive
                            ? RosTheme.secondary.withValues(alpha: 0.15)
                            : RosTheme.danger.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        m.isActive ? 'Active' : 'Inactive',
                        style: TextStyle(
                          color: m.isActive ? RosTheme.secondary : RosTheme.danger,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                // Prominent Designation Badge
                Text(
                  m.designation?.isNotEmpty == true ? m.designation! : 'Staff Member',
                  style: const TextStyle(
                    color: RosTheme.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
                if (m.department?.isNotEmpty == true)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      'Dept: ${m.department}',
                      style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                    ),
                  ),
                if (m.email.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      m.email,
                      style: const TextStyle(color: RosTheme.textMuted, fontSize: 11),
                    ),
                  ),
                if (m.phone?.isNotEmpty == true)
                  Padding(
                    padding: const EdgeInsets.only(top: 1),
                    child: Text(
                      '📞 ${m.phone}',
                      style: const TextStyle(color: RosTheme.textSecondary, fontSize: 11),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Add Staff Member Bottom Sheet ───────────────────────────────────────────
  void _showAddStaffSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: RosTheme.bgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const _AddStaffFormSheet(),
    ).then((_) {
      ref.invalidate(staffProvider);
    });
  }
}

// ── Add Staff Form Widget ───────────────────────────────────────────────────
class _AddStaffFormSheet extends ConsumerStatefulWidget {
  const _AddStaffFormSheet();

  @override
  ConsumerState<_AddStaffFormSheet> createState() => _AddStaffFormSheetState();
}

class _AddStaffFormSheetState extends ConsumerState<_AddStaffFormSheet> {
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _customDesignationController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _salaryController = TextEditingController();
  final _passwordController = TextEditingController();

  String _selectedDept = 'Kitchen';
  String _selectedDesignation = 'Waiter / Server';
  bool _isCustomDesignation = false;
  bool _createAccount = false;
  String _selectedRole = 'WAITER';
  bool _submitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _customDesignationController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _salaryController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final designation = _isCustomDesignation
        ? _customDesignationController.text.trim()
        : _selectedDesignation;

    if (designation.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select or specify a designation'),
          backgroundColor: RosTheme.danger,
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final api = ref.read(apiClientProvider);

      final payload = {
        'name': _nameController.text.trim(),
        'department': _selectedDept,
        'designation': designation,
        if (_phoneController.text.trim().isNotEmpty) 'phone': _phoneController.text.trim(),
        if (_emailController.text.trim().isNotEmpty) 'email': _emailController.text.trim(),
        if (_salaryController.text.trim().isNotEmpty)
          'salary': double.tryParse(_salaryController.text.trim()) ?? 0,
        if (_createAccount) ...{
          'createUserAccount': true,
          'password': _passwordController.text.trim().isNotEmpty
              ? _passwordController.text.trim()
              : 'Pass@123',
          'roleName': _selectedRole,
        },
      };

      await api.post('/staff/employees', data: payload);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Staff "${_nameController.text.trim()}" added successfully!'),
            backgroundColor: RosTheme.secondary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to add staff: $e'),
            backgroundColor: RosTheme.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 20,
        right: 20,
        top: 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: RosTheme.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.person_add_rounded, color: RosTheme.primary, size: 22),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Add New Staff Member',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: RosTheme.textPrimary,
                          ),
                        ),
                        Text(
                          'Assign designation, department & access',
                          style: TextStyle(fontSize: 11, color: RosTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Full Name *
              TextFormField(
                controller: _nameController,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                decoration: _inputDecoration('Full Name *', 'e.g. John Smith'),
                validator: (val) =>
                    val == null || val.trim().isEmpty ? 'Please enter staff name' : null,
              ),
              const SizedBox(height: 12),

              // Department Dropdown
              DropdownButtonFormField<String>(
                value: _selectedDept,
                dropdownColor: RosTheme.bgElevated,
                style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                decoration: _inputDecoration('Department *', null),
                items: kDepartments
                    .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedDept = val);
                },
              ),
              const SizedBox(height: 12),

              // ── Comprehensive Designation * Dropdown ─────────────────────────
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Designation *',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: RosTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: RosTheme.bgElevated,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: RosTheme.bgBorder),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _isCustomDesignation ? 'CUSTOM' : _selectedDesignation,
                        isExpanded: true,
                        dropdownColor: RosTheme.bgElevated,
                        style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                        items: [
                          ...kDesignationCategories.expand((group) => [
                                DropdownMenuItem<String>(
                                  enabled: false,
                                  value: 'HEADER_${group.category}',
                                  child: Text(
                                    group.category,
                                    style: const TextStyle(
                                      color: RosTheme.primary,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                ...group.items.map((item) => DropdownMenuItem<String>(
                                      value: item,
                                      child: Padding(
                                        padding: const EdgeInsets.only(left: 10),
                                        child: Text(item),
                                      ),
                                    )),
                              ]),
                          const DropdownMenuItem<String>(
                            value: 'CUSTOM',
                            child: Text(
                              '✨ + Custom / Other Designation',
                              style: TextStyle(
                                color: RosTheme.secondary,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                        onChanged: (val) {
                          if (val == null || val.startsWith('HEADER_')) return;
                          setState(() {
                            if (val == 'CUSTOM') {
                              _isCustomDesignation = true;
                            } else {
                              _isCustomDesignation = false;
                              _selectedDesignation = val;
                            }
                          });
                        },
                      ),
                    ),
                  ),
                  if (_isCustomDesignation) ...[
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _customDesignationController,
                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                      decoration: _inputDecoration(
                        'Type Custom Designation *',
                        'e.g. Master Roaster / Mixologist',
                      ),
                      validator: (val) => _isCustomDesignation && (val == null || val.trim().isEmpty)
                          ? 'Please enter designation'
                          : null,
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),

              // Phone & Monthly Salary
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                      decoration: _inputDecoration('Phone Number', '+91 9876543210'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _salaryController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                      decoration: _inputDecoration('Salary (₹/mo)', '25000'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Account Creation Toggle
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: RosTheme.bgElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: RosTheme.bgBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.key_rounded, size: 18, color: RosTheme.primary),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Create POS/App Login Account',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: RosTheme.textPrimary,
                        ),
                      ),
                    ),
                    Switch(
                      value: _createAccount,
                      activeColor: RosTheme.primary,
                      onChanged: (val) => setState(() => _createAccount = val),
                    ),
                  ],
                ),
              ),

              if (_createAccount) ...[
                const SizedBox(height: 10),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: _inputDecoration('Login Email *', 'staff@cafe.com'),
                  validator: (val) => _createAccount && (val == null || val.trim().isEmpty)
                      ? 'Email required for account'
                      : null,
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: _inputDecoration('Password', 'Default: Pass@123'),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: _selectedRole,
                  dropdownColor: RosTheme.bgElevated,
                  style: const TextStyle(color: RosTheme.textPrimary, fontSize: 13),
                  decoration: _inputDecoration('Role Preset', null),
                  items: const [
                    DropdownMenuItem(value: 'WAITER', child: Text('🍽️ Waiter / Server')),
                    DropdownMenuItem(value: 'CHEF', child: Text('👨‍🍳 Chef / Cook')),
                    DropdownMenuItem(value: 'BARISTA', child: Text('☕ Barista / Bartender')),
                    DropdownMenuItem(value: 'CASHIER', child: Text('💳 Cashier / Billing')),
                    DropdownMenuItem(value: 'MANAGER', child: Text('👔 Restaurant Manager')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedRole = val);
                  },
                ),
              ],
              const SizedBox(height: 20),

              // Submit Button
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: RosTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Register Staff Member',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                      ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String label, String? hint) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      labelStyle: const TextStyle(color: RosTheme.textSecondary, fontSize: 12),
      hintStyle: const TextStyle(color: RosTheme.textMuted, fontSize: 12),
      filled: true,
      fillColor: RosTheme.bgElevated,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: RosTheme.bgBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: RosTheme.bgBorder),
      ),
    );
  }
}

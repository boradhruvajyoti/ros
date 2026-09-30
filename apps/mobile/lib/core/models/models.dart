// =============================================================================
// Core Data Models — matching backend Prisma schema exactly
// =============================================================================

import 'dart:convert';

double parseDouble(dynamic value, [double defaultValue = 0.0]) {
  if (value == null) return defaultValue;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? defaultValue;
  return defaultValue;
}

double? parseNullableDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

int parseInt(dynamic value, [int defaultValue = 0]) {
  if (value == null) return defaultValue;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? double.tryParse(value)?.toInt() ?? defaultValue;
  return defaultValue;
}

int? parseNullableInt(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? double.tryParse(value)?.toInt();
  return null;
}

bool parseBool(dynamic value, [bool defaultValue = true]) {
  if (value == null) return defaultValue;
  if (value is bool) return value;
  if (value is num) return value != 0;
  final str = value.toString().toLowerCase().trim();
  if (str == 'true' || str == '1' || str == 'yes') return true;
  if (str == 'false' || str == '0' || str == 'no') return false;
  return defaultValue;
}

// ── Auth / User ──────────────────────────────────────────────────────────────

class AuthUser {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String tenantId;
  final String? tenantName;
  final String branchId;
  final String? designation;
  final String? department;
  final List<String> roles;
  final List<String> permissions;
  final List<String> telegramNotifications;
  final String? telegramChatId;
  final String? telegramUsername;

  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.tenantId,
    this.tenantName,
    required this.branchId,
    this.designation,
    this.department,
    this.roles = const [],
    this.permissions = const [],
    this.telegramNotifications = const [],
    this.telegramChatId,
    this.telegramUsername,
  });

  String get role => roles.isNotEmpty ? roles.first : '';

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    // Derive branchId
    String branchId = json['activeBranchId'] as String? ?? json['branchId'] as String? ?? 'default-branch';
    if (json['branchRoles'] != null && (json['branchRoles'] as List).isNotEmpty) {
      branchId = (json['branchRoles'] as List).first['branchId'] as String? ?? branchId;
    }

    final roles = <String>[];
    if (json['roles'] != null) {
      for (final r in json['roles'] as List) {
        if (r is String && !roles.contains(r)) roles.add(r);
      }
    }
    if (json['branchRoles'] != null) {
      for (final br in json['branchRoles'] as List) {
        final roleName = br['role']?['name'] as String?;
        if (roleName != null && !roles.contains(roleName)) roles.add(roleName);
      }
    }

    final perms = <String>[];
    if (json['permissions'] != null) {
      for (final p in json['permissions'] as List) {
        if (p is String && !perms.contains(p)) perms.add(p);
      }
    }

    final telegramNotifs = <String>[];
    if (json['telegramNotifications'] != null) {
      if (json['telegramNotifications'] is List) {
        for (final tn in json['telegramNotifications'] as List) {
          if (tn is String && !telegramNotifs.contains(tn)) telegramNotifs.add(tn);
        }
      }
    }

    return AuthUser(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'User',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      tenantId: json['tenantId'] as String? ?? 'tenant-default',
      tenantName: json['tenantName'] as String?,
      branchId: branchId,
      designation: json['designation'] as String?,
      department: json['department'] as String?,
      roles: roles,
      permissions: perms,
      telegramNotifications: telegramNotifs,
      telegramChatId: json['telegramChatId'] as String?,
      telegramUsername: json['telegramUsername'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'phone': phone,
    'tenantId': tenantId,
    'tenantName': tenantName,
    'branchId': branchId,
    'roles': roles,
    'permissions': permissions,
    'telegramNotifications': telegramNotifications,
    'telegramChatId': telegramChatId,
    'telegramUsername': telegramUsername,
  };

  bool get isPlatformAdmin =>
      email.toLowerCase() == 'superadmin@ros.com' ||
      tenantId == 'tenant-platform' ||
      roles.contains('SUPER_ADMIN');

  bool get isTenantAdmin =>
      isPlatformAdmin || roles.contains('OWNER') || roles.contains('ADMIN');

  bool get hasTelegramAccess =>
      isTenantAdmin || telegramNotifications.isNotEmpty;

  bool hasPermission(String permission) {
    if (isPlatformAdmin || isTenantAdmin) return true;
    return permissions.contains(permission);
  }

  bool hasAnyPermission(List<String> perms) {
    if (isPlatformAdmin || isTenantAdmin) return true;
    return perms.any(permissions.contains);
  }
}

// ── Platform Super Admin Models ──────────────────────────────────────────────

class TenantSummary {
  final String id;
  final String name;
  final String slug;
  final String plan;
  final String status;
  final String? logoUrl;
  final int branchesCount;
  final int usersCount;
  final int ordersCount;
  final int tablesCount;
  final DateTime createdAt;

  const TenantSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.plan,
    required this.status,
    this.logoUrl,
    required this.branchesCount,
    required this.usersCount,
    required this.ordersCount,
    this.tablesCount = 0,
    required this.createdAt,
  });

  factory TenantSummary.fromJson(Map<String, dynamic> json) {
    return TenantSummary(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Restaurant',
      slug: json['slug'] as String? ?? '',
      plan: json['plan'] as String? ?? 'starter',
      status: json['status'] as String? ?? 'ACTIVE',
      logoUrl: json['logoUrl'] as String?,
      branchesCount: parseInt(json['branchesCount'], 1),
      usersCount: parseInt(json['usersCount'], 0),
      ordersCount: parseInt(json['ordersCount'], 0),
      tablesCount: parseInt(json['tablesCount'], 0),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class SuperAdminOverview {
  final int totalTenants;
  final int activeTenants;
  final double monthlyRecurringRevenue;
  final int totalOrdersProcessed;
  final String systemUptime;
  final int databaseLatencyMs;
  final List<TenantSummary> tenants;

  const SuperAdminOverview({
    required this.totalTenants,
    required this.activeTenants,
    required this.monthlyRecurringRevenue,
    required this.totalOrdersProcessed,
    required this.systemUptime,
    required this.databaseLatencyMs,
    required this.tenants,
  });

  factory SuperAdminOverview.fromJson(Map<String, dynamic> json) {
    return SuperAdminOverview(
      totalTenants: parseInt(json['totalTenants'], 0),
      activeTenants: parseInt(json['activeTenants'], 0),
      monthlyRecurringRevenue: parseDouble(json['monthlyRecurringRevenue'], 0.0),
      totalOrdersProcessed: parseInt(json['totalOrdersProcessed'], 0),
      systemUptime: json['systemUptime'] as String? ?? '99.9%',
      databaseLatencyMs: parseInt(json['databaseLatencyMs'], 15),
      tenants: (json['tenants'] as List<dynamic>?)
          ?.map((e) => TenantSummary.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}

class SaasPlanItem {
  final String id;
  final String name;
  final String code;
  final double price;
  final String currency;
  final String interval;
  final String description;
  final List<String> features;
  final int maxBranches;
  final int maxUsers;
  final int maxOrdersPerMonth;
  final String? badge;
  final bool isPopular;
  final bool isActive;

  const SaasPlanItem({
    required this.id,
    required this.name,
    required this.code,
    required this.price,
    required this.currency,
    required this.interval,
    required this.description,
    required this.features,
    required this.maxBranches,
    required this.maxUsers,
    required this.maxOrdersPerMonth,
    this.badge,
    this.isPopular = false,
    this.isActive = true,
  });

  factory SaasPlanItem.fromJson(Map<String, dynamic> json) {
    return SaasPlanItem(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      code: json['code'] as String? ?? '',
      price: parseDouble(json['price'], 0.0),
      currency: json['currency'] as String? ?? 'INR',
      interval: json['interval'] as String? ?? 'month',
      description: json['description'] as String? ?? '',
      features: (json['features'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      maxBranches: parseInt(json['maxBranches'], 1),
      maxUsers: parseInt(json['maxUsers'], 5),
      maxOrdersPerMonth: parseInt(json['maxOrdersPerMonth'], 1000),
      badge: json['badge'] as String?,
      isPopular: parseBool(json['isPopular'], false),
      isActive: parseBool(json['isActive'], true),
    );
  }
}

// ── Tenant / Branch ──────────────────────────────────────────────────────────

class Tenant {
  final String id;
  final String name;
  final String slug;
  final String? logoUrl;
  final String plan;
  final String status;
  final Map<String, dynamic>? settings;

  const Tenant({
    required this.id,
    required this.name,
    required this.slug,
    this.logoUrl,
    required this.plan,
    required this.status,
    this.settings,
  });

  factory Tenant.fromJson(Map<String, dynamic> json) => Tenant(
    id: json['id'] as String,
    name: json['name'] as String,
    slug: json['slug'] as String,
    logoUrl: json['logoUrl'] as String?,
    plan: json['plan'] as String? ?? 'starter',
    status: json['status'] as String? ?? 'ACTIVE',
    settings: json['settings'] != null
        ? (json['settings'] is String
            ? {} // parse later if needed
            : json['settings'] as Map<String, dynamic>)
        : null,
  );
}

class Branch {
  final String id;
  final String tenantId;
  final String name;
  final String? address;
  final String? phone;
  final String? email;
  final bool isActive;

  const Branch({
    required this.id,
    required this.tenantId,
    required this.name,
    this.address,
    this.phone,
    this.email,
    required this.isActive,
  });

  factory Branch.fromJson(Map<String, dynamic> json) => Branch(
    id: json['id'] as String,
    tenantId: json['tenantId'] as String,
    name: json['name'] as String,
    address: json['address'] as String?,
    phone: json['phone'] as String?,
    email: json['email'] as String?,
    isActive: json['isActive'] as bool? ?? true,
  );
}

// ── Menu ─────────────────────────────────────────────────────────────────────

String generateFoodLetterCode(String name) {
  if (name.trim().isEmpty) return 'ITM';
  final words = name.trim().split(RegExp(r'\s+'));
  final initials = words
      .map((w) => w.replaceAll(RegExp(r'[^a-zA-Z0-9]'), ''))
      .where((w) => w.isNotEmpty)
      .map((w) => w[0].toUpperCase())
      .join('');
  return initials.isNotEmpty ? initials : 'ITM';
}

class SpecialMenu {
  final String id;
  final String tenantId;
  final String name;
  final String occasion;
  final String description;
  final String? startDate;
  final String? endDate;
  final List<String> categoryIds;
  final bool isActive;
  final String createdAt;
  final String updatedAt;

  const SpecialMenu({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.occasion,
    required this.description,
    this.startDate,
    this.endDate,
    this.categoryIds = const [],
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SpecialMenu.fromJson(Map<String, dynamic> json) => SpecialMenu(
    id: json['id']?.toString() ?? '',
    tenantId: json['tenantId']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    occasion: json['occasion']?.toString() ?? 'Festival Special',
    description: json['description']?.toString() ?? '',
    startDate: json['startDate']?.toString(),
    endDate: json['endDate']?.toString(),
    categoryIds: (json['categoryIds'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    isActive: parseBool(json['isActive'], true),
    createdAt: json['createdAt']?.toString() ?? '',
    updatedAt: json['updatedAt']?.toString() ?? '',
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'tenantId': tenantId,
    'name': name,
    'occasion': occasion,
    'description': description,
    'startDate': startDate,
    'endDate': endDate,
    'categoryIds': categoryIds,
    'isActive': isActive,
  };
}

class MenuCategory {
  final String id;
  final String name;
  final String? imageUrl;
  final int sortOrder;
  final bool isActive;
  final List<MenuItem> items;

  const MenuCategory({
    required this.id,
    required this.name,
    this.imageUrl,
    required this.sortOrder,
    required this.isActive,
    this.items = const [],
  });

  factory MenuCategory.fromJson(Map<String, dynamic> json) => MenuCategory(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    imageUrl: json['imageUrl']?.toString(),
    sortOrder: parseInt(json['sortOrder'], 0),
    isActive: parseBool(json['isActive'], true),
    items: (json['items'] as List<dynamic>?)
        ?.where((e) => e != null && e is Map<String, dynamic>)
        .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
  );
}

class MenuItem {
  final String id;
  final String categoryId;
  final String name;
  final String? description;
  final String? imageUrl;
  final String foodType; // VEG|NON_VEG|EGG|VEGAN
  final String spiceLevel;
  final bool isAvailable;
  final bool isActive;
  final int sortOrder;
  final List<MenuItemVariant> variants;
  final List<ModifierGroupLink> modifierGroups;
  final String? kitchenStationId;
  final String letterCode;
  final String? itemNumber;
  final String? itemCode;
  final String? specialMenuId;

  const MenuItem({
    required this.id,
    required this.categoryId,
    required this.name,
    this.description,
    this.imageUrl,
    required this.foodType,
    required this.spiceLevel,
    required this.isAvailable,
    required this.isActive,
    required this.sortOrder,
    this.variants = const [],
    this.modifierGroups = const [],
    this.kitchenStationId,
    required this.letterCode,
    this.itemNumber,
    this.itemCode,
    this.specialMenuId,
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    final rawVariants = json['variants'] as List<dynamic>?;
    List<MenuItemVariant> variants = [];
    if (rawVariants != null && rawVariants.isNotEmpty) {
      variants = rawVariants
          .where((e) => e != null && e is Map<String, dynamic>)
          .map((e) => MenuItemVariant.fromJson(e as Map<String, dynamic>))
          .toList();
    } else {
      final p = parseDouble(json['price'] ?? json['basePrice'], 0.0);
      variants = [
        MenuItemVariant(
          id: json['id']?.toString() ?? 'v-default',
          name: 'Regular',
          price: p,
          cost: parseDouble(json['cost'], 0.0),
          isActive: true,
          sortOrder: 0,
        ),
      ];
    }

    final name = json['name']?.toString() ?? 'Item';
    final letterCode = json['letterCode']?.toString() ?? generateFoodLetterCode(name);
    final itemNumber = json['itemNumber']?.toString();
    final itemCode = json['itemCode']?.toString() ?? (itemNumber != null ? '$letterCode • #$itemNumber' : null);

    return MenuItem(
      id: json['id']?.toString() ?? '',
      categoryId: json['categoryId']?.toString() ?? json['category']?['id']?.toString() ?? 'general',
      name: name,
      description: json['description']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      foodType: json['foodType']?.toString() ?? 'VEG',
      spiceLevel: json['spiceLevel']?.toString() ?? 'NONE',
      isAvailable: parseBool(json['isAvailable'], true),
      isActive: parseBool(json['isActive'], true),
      sortOrder: parseInt(json['sortOrder'], 0),
      variants: variants,
      modifierGroups: (json['modifierGroups'] as List<dynamic>?)
          ?.where((e) => e != null && e is Map<String, dynamic>)
          .map((e) => ModifierGroupLink.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
      kitchenStationId: json['kitchenStationId']?.toString(),
      letterCode: letterCode,
      itemNumber: itemNumber,
      itemCode: itemCode,
      specialMenuId: json['specialMenuId']?.toString(),
    );
  }

  double get basePrice => variants.isNotEmpty ? variants.first.price : 0.0;
}

class MenuItemVariant {
  final String id;
  final String name;
  final double price;
  final double cost;
  final bool isActive;
  final int sortOrder;

  const MenuItemVariant({
    required this.id,
    required this.name,
    required this.price,
    required this.cost,
    required this.isActive,
    required this.sortOrder,
  });

  factory MenuItemVariant.fromJson(Map<String, dynamic> json) => MenuItemVariant(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? 'Regular',
    price: parseDouble(json['price'], 0.0),
    cost: parseDouble(json['cost'], 0.0),
    isActive: parseBool(json['isActive'], true),
    sortOrder: parseInt(json['sortOrder'], 0),
  );
}

class ModifierGroupLink {
  final ModifierGroup modifierGroup;

  const ModifierGroupLink({required this.modifierGroup});

  factory ModifierGroupLink.fromJson(Map<String, dynamic> json) {
    final mgJson = json['modifierGroup'] is Map<String, dynamic>
        ? json['modifierGroup'] as Map<String, dynamic>
        : json;
    return ModifierGroupLink(
      modifierGroup: ModifierGroup.fromJson(mgJson),
    );
  }
}

class ModifierGroup {
  final String id;
  final String name;
  final int minSelections;
  final int maxSelections;
  final bool isRequired;
  final List<Modifier> modifiers;

  const ModifierGroup({
    required this.id,
    required this.name,
    required this.minSelections,
    required this.maxSelections,
    required this.isRequired,
    this.modifiers = const [],
  });

  factory ModifierGroup.fromJson(Map<String, dynamic> json) => ModifierGroup(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    minSelections: parseInt(json['minSelections'], 0),
    maxSelections: parseInt(json['maxSelections'], 1),
    isRequired: parseBool(json['isRequired'], false),
    modifiers: (json['modifiers'] as List<dynamic>?)
        ?.where((e) => e != null && e is Map<String, dynamic>)
        .map((e) => Modifier.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
  );
}

class Modifier {
  final String id;
  final String name;
  final double price;
  final int sortOrder;

  const Modifier({
    required this.id,
    required this.name,
    required this.price,
    required this.sortOrder,
  });

  factory Modifier.fromJson(Map<String, dynamic> json) => Modifier(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    price: parseDouble(json['price'], 0.0),
    sortOrder: parseInt(json['sortOrder'], 0),
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────

class RestaurantTable {
  final String id;
  final String name;
  final int capacity;
  final String shape;
  final String status; // AVAILABLE|RESERVED|OCCUPIED|CLEANING|BLOCKED
  final String? floorId;
  final String? sectionId;
  final double posX;
  final double posY;
  final Order? activeOrder;

  const RestaurantTable({
    required this.id,
    required this.name,
    required this.capacity,
    required this.shape,
    required this.status,
    this.floorId,
    this.sectionId,
    required this.posX,
    required this.posY,
    this.activeOrder,
  });

  factory RestaurantTable.fromJson(Map<String, dynamic> json) => RestaurantTable(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? 'Table',
    capacity: parseInt(json['capacity'], 4),
    shape: json['shape'] as String? ?? 'RECTANGLE',
    status: json['status'] as String? ?? 'AVAILABLE',
    floorId: json['floorId'] as String?,
    sectionId: json['sectionId'] as String?,
    posX: parseDouble(json['posX'], 0.0),
    posY: parseDouble(json['posY'], 0.0),
    activeOrder: json['activeOrder'] != null
        ? Order.fromJson(json['activeOrder'] as Map<String, dynamic>)
        : (json['orders'] is List && (json['orders'] as List).isNotEmpty
            ? Order.fromJson((json['orders'] as List).first as Map<String, dynamic>)
            : null),
  );
}

class Floor {
  final String id;
  final String name;
  final int sortOrder;
  final List<RestaurantTable> tables;

  const Floor({
    required this.id,
    required this.name,
    required this.sortOrder,
    this.tables = const [],
  });

  factory Floor.fromJson(Map<String, dynamic> json) => Floor(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? 'Floor',
    sortOrder: parseInt(json['sortOrder'], 0),
    tables: (json['tables'] as List<dynamic>?)
        ?.map((e) => RestaurantTable.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
  );
}

// ── Orders ───────────────────────────────────────────────────────────────────

class Order {
  final String id;
  final String orderNumber;
  final String type; // DINE_IN|TAKEAWAY|PICKUP|DELIVERY|etc
  final String status;
  final String? tableId;
  final RestaurantTable? table;
  final String? customerId;
  final double subtotal;
  final double discountAmount;
  final double taxAmount;
  final double total;
  final double paidAmount;
  final String? notes;
  final int? guestCount;
  final List<OrderItem> items;
  final List<Payment> payments;
  final List<OrderKot> kots;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Order({
    required this.id,
    required this.orderNumber,
    required this.type,
    required this.status,
    this.tableId,
    this.table,
    this.customerId,
    required this.subtotal,
    required this.discountAmount,
    required this.taxAmount,
    required this.total,
    required this.paidAmount,
    this.notes,
    this.guestCount,
    this.items = const [],
    this.payments = const [],
    this.kots = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
    id: json['id'] as String? ?? '',
    orderNumber: json['orderNumber'] as String? ?? 'ORD',
    type: json['type'] as String? ?? 'DINE_IN',
    status: json['status'] as String? ?? 'DRAFT',
    tableId: json['tableId'] as String?,
    table: json['table'] != null
        ? RestaurantTable.fromJson(json['table'] as Map<String, dynamic>)
        : null,
    customerId: json['customerId'] as String?,
    subtotal: parseDouble(json['subtotal'], 0.0),
    discountAmount: parseDouble(json['discountAmount'], 0.0),
    taxAmount: parseDouble(json['taxAmount'], 0.0),
    total: parseDouble(json['total'], 0.0),
    paidAmount: parseDouble(json['paidAmount'], 0.0),
    notes: json['notes'] as String?,
    guestCount: parseInt(json['guestCount'] ?? json['covers'], 0) > 0
        ? parseInt(json['guestCount'] ?? json['covers'], 0)
        : null,
    items: (json['items'] as List<dynamic>?)
        ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
    payments: (json['payments'] as List<dynamic>?)
        ?.map((e) => Payment.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
    kots: (json['kots'] as List<dynamic>?)
        ?.map((e) => OrderKot.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
    createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
  );

  int get effectiveGuestCount {
    if (guestCount != null && guestCount! > 0) return guestCount!;
    if (notes != null) {
      final match = RegExp(r'(?:\[(?:Pax|Guests|Guest Count):\s*(\d+)\])|(?:(?:Pax|Guests|Guest Count):\s*(\d+))', caseSensitive: false).firstMatch(notes!);
      if (match != null) {
        final val = int.tryParse(match.group(1) ?? match.group(2) ?? '');
        if (val != null && val > 0) return val;
      }
    }
    return table?.capacity ?? 1;
  }

  bool get isPreOrder => type == 'PRE_ORDER';

  Map<String, dynamic>? get preOrderMetadata {
    if (notes == null || notes!.isEmpty) return null;
    try {
      final decoded = jsonDecode(notes!);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}
    return null;
  }

  double get balanceDue => total - paidAmount;
  bool get isFullyPaid => paidAmount >= total;
}

class OrderItem {
  final String id;
  final String menuItemId;
  final String? variantId;
  final String? menuItemName;
  final String? variantName;
  final int quantity;
  final double unitPrice;
  final double lineTotal;
  final String status;
  final String? notes;
  final List<OrderItemModifier> modifiers;

  const OrderItem({
    required this.id,
    required this.menuItemId,
    this.variantId,
    this.menuItemName,
    this.variantName,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
    required this.status,
    this.notes,
    this.modifiers = const [],
  });

  String get name => menuItemName ?? 'Dish';

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final qty = parseInt(json['quantity'], 1);
    final price = parseDouble(json['unitPrice'] ?? json['price'], 0.0);
    final rawLineTotal = parseDouble(json['lineTotal'] ?? json['totalPrice'], 0.0);
    final lineTotal = rawLineTotal > 0 ? rawLineTotal : (qty * price);

    return OrderItem(
      id: json['id'] as String? ?? '',
      menuItemId: json['menuItemId'] as String? ?? '',
      variantId: json['variantId'] as String?,
      menuItemName: json['menuItem']?['name'] as String? ?? json['name'] as String?,
      variantName: json['variant']?['name'] as String?,
      quantity: qty,
      unitPrice: price,
      lineTotal: lineTotal,
      status: json['status'] as String? ?? 'PENDING',
      notes: json['notes'] as String?,
      modifiers: (json['modifiers'] as List<dynamic>?)
          ?.map((e) => OrderItemModifier.fromJson(e as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}

class OrderItemModifier {
  final String id;
  final String name;
  final double price;

  const OrderItemModifier({
    required this.id,
    required this.name,
    required this.price,
  });

  factory OrderItemModifier.fromJson(Map<String, dynamic> json) =>
      OrderItemModifier(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        price: parseDouble(json['price'], 0.0),
      );
}

class OrderKot {
  final String id;
  final String kotNumber;
  final String orderId;
  final String status; // NEW|ACCEPTED|PREPARING|READY|SERVED|CANCELLED
  final String? kitchenStationId;
  final String? stationName;
  final String? stationColor;
  final String orderNumber;
  final String orderType;
  final String? tableName;
  final String? orderNotes;
  final int ageMinutes;
  final List<OrderKotItem> items;

  const OrderKot({
    required this.id,
    required this.kotNumber,
    this.orderId = '',
    required this.status,
    this.kitchenStationId,
    this.stationName,
    this.stationColor,
    this.orderNumber = '',
    this.orderType = 'DINE_IN',
    this.tableName,
    this.orderNotes,
    this.ageMinutes = 0,
    this.items = const [],
  });

  factory OrderKot.fromJson(Map<String, dynamic> json) {
    final order = json['order'] as Map<String, dynamic>?;
    final table = order?['table'] as Map<String, dynamic>?;
    final station = json['kitchenStation'] as Map<String, dynamic>?;

    return OrderKot(
      id: json['id'] as String? ?? '',
      kotNumber: json['kotNumber']?.toString() ?? 'KOT',
      orderId: json['orderId'] as String? ?? order?['id'] as String? ?? '',
      status: json['status'] as String? ?? 'NEW',
      kitchenStationId: json['kitchenStationId'] as String? ?? station?['id'] as String?,
      stationName: station?['name'] as String?,
      stationColor: station?['displayColor'] as String?,
      orderNumber: order?['orderNumber'] as String? ?? '',
      orderType: order?['type'] as String? ?? 'DINE_IN',
      tableName: table?['name'] as String?,
      orderNotes: order?['notes'] as String?,
      ageMinutes: parseInt(json['ageMinutes'], 0),
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => OrderKotItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class OrderKotItem {
  final String id;
  final String status;
  final String? menuItemName;
  final String? variantName;
  final int quantity;
  final String? notes;
  final List<String> modifiers;

  const OrderKotItem({
    required this.id,
    required this.status,
    this.menuItemName,
    this.variantName,
    required this.quantity,
    this.notes,
    this.modifiers = const [],
  });

  factory OrderKotItem.fromJson(Map<String, dynamic> json) {
    final orderItem = json['orderItem'] as Map<String, dynamic>?;
    final menuItem = orderItem?['menuItem'] as Map<String, dynamic>? ?? json['menuItem'] as Map<String, dynamic>?;
    final variant = orderItem?['variant'] as Map<String, dynamic>? ?? json['variant'] as Map<String, dynamic>?;
    final rawModifiers = orderItem?['modifiers'] as List<dynamic>?;
    final modList = rawModifiers
            ?.map((m) => m is Map ? (m['name']?.toString() ?? '') : m.toString())
            .where((s) => s.isNotEmpty)
            .toList() ??
        [];

    return OrderKotItem(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'PENDING',
      menuItemName: menuItem?['name'] as String?,
      variantName: variant?['name'] as String?,
      quantity: parseInt(orderItem?['quantity'] ?? json['quantity'], 1),
      notes: orderItem?['notes'] as String? ?? json['notes'] as String?,
      modifiers: modList,
    );
  }
}

// ── Payments ─────────────────────────────────────────────────────────────────

class Payment {
  final String id;
  final String orderId;
  final String method; // CASH|UPI|CARD|etc
  final double amount;
  final String? referenceNumber;
  final String status;
  final DateTime createdAt;

  const Payment({
    required this.id,
    required this.orderId,
    required this.method,
    required this.amount,
    this.referenceNumber,
    required this.status,
    required this.createdAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
    id: json['id'] as String? ?? '',
    orderId: json['orderId'] as String? ?? '',
    method: json['method'] as String? ?? 'CASH',
    amount: parseDouble(json['amount'], 0.0),
    referenceNumber: json['referenceNumber'] as String?,
    status: json['status'] as String? ?? 'COMPLETED',
    createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
  );
}

// ── Customers ────────────────────────────────────────────────────────────────

class Customer {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final int loyaltyPoints;
  final double totalSpent;
  final int visitCount;
  final bool isActive;
  final DateTime createdAt;

  const Customer({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.loyaltyPoints,
    required this.totalSpent,
    required this.visitCount,
    required this.isActive,
    required this.createdAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? 'Guest',
    phone: json['phone'] as String? ?? '',
    email: json['email'] as String?,
    loyaltyPoints: parseInt(json['loyaltyPoints'], 0),
    totalSpent: parseDouble(json['totalSpent'], 0.0),
    visitCount: parseInt(json['visitCount'], 0),
    isActive: parseBool(json['isActive'], true),
    createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
  );
}

// ── Staff ────────────────────────────────────────────────────────────────────

class StaffMember {
  final String id;
  final String? employeeCode;
  final String name;
  final String email;
  final String? phone;
  final String? designation;
  final String? department;
  final double? salary;
  final String? userId;
  final String? telegramChatId;
  final String? telegramUsername;
  final List<String> telegramNotifications;
  final List<String> permissions;
  final List<String> roles;
  final bool isActive;
  final DateTime? lastLoginAt;

  const StaffMember({
    required this.id,
    this.employeeCode,
    required this.name,
    required this.email,
    this.phone,
    this.designation,
    this.department,
    this.salary,
    this.userId,
    this.telegramChatId,
    this.telegramUsername,
    this.telegramNotifications = const [],
    this.permissions = const [],
    required this.roles,
    required this.isActive,
    this.lastLoginAt,
  });

  factory StaffMember.fromJson(Map<String, dynamic> json) {
    final user = json['user'] is Map<String, dynamic> ? json['user'] as Map<String, dynamic> : null;
    final userRoles = <String>[];
    if (user != null && user['roles'] is List) {
      userRoles.addAll((user['roles'] as List).map((e) => e.toString()));
    } else if (json['branchRoles'] is List) {
      userRoles.addAll(
        (json['branchRoles'] as List)
            .map((e) => e['role']?['name'] as String? ?? '')
            .where((r) => r.isNotEmpty),
      );
    } else if (json['roles'] is List) {
      userRoles.addAll((json['roles'] as List).map((e) => e.toString()));
    }

    final userPerms = <String>[];
    if (user != null && user['permissions'] is List) {
      userPerms.addAll((user['permissions'] as List).map((e) => e.toString()));
    } else if (json['permissions'] is List) {
      userPerms.addAll((json['permissions'] as List).map((e) => e.toString()));
    }

    final notifs = <String>[];
    if (user != null && user['telegramNotifications'] is List) {
      notifs.addAll((user['telegramNotifications'] as List).map((e) => e.toString()));
    } else if (json['telegramNotifications'] is List) {
      notifs.addAll((json['telegramNotifications'] as List).map((e) => e.toString()));
    }

    return StaffMember(
      id: json['id'] as String? ?? '',
      employeeCode: json['employeeCode'] as String?,
      name: json['name'] as String? ?? 'Staff',
      email: json['email'] as String? ?? (user?['email'] as String? ?? ''),
      phone: json['phone'] as String?,
      designation: json['designation'] as String?,
      department: json['department'] as String?,
      salary: json['salary'] != null ? parseDouble(json['salary'], 0.0) : null,
      userId: json['userId'] as String? ?? (user?['id'] as String?),
      telegramChatId: user?['telegramChatId'] as String? ?? json['telegramChatId'] as String?,
      telegramUsername: user?['telegramUsername'] as String? ?? json['telegramUsername'] as String?,
      telegramNotifications: notifs,
      permissions: userPerms,
      roles: userRoles,
      isActive: json['isActive'] as bool? ?? true,
      lastLoginAt: json['lastLoginAt'] != null
          ? DateTime.tryParse(json['lastLoginAt'].toString())
          : null,
    );
  }
}

// ── Inventory ────────────────────────────────────────────────────────────────

class InventoryItem {
  final String id;
  final String name;
  final String unit;
  final double currentStock;
  final double minStock;
  final double? maxStock;
  final String? category;
  final double? costPerUnit;

  const InventoryItem({
    required this.id,
    required this.name,
    required this.unit,
    required this.currentStock,
    required this.minStock,
    this.maxStock,
    this.category,
    this.costPerUnit,
  });

  factory InventoryItem.fromJson(Map<String, dynamic> json) => InventoryItem(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    unit: json['unit'] as String? ?? 'kg',
    currentStock: parseDouble(json['currentStock'], 0.0),
    minStock: parseDouble(json['minStock'], 0.0),
    maxStock: parseNullableDouble(json['maxStock']),
    category: json['category'] as String?,
    costPerUnit: parseNullableDouble(json['costPerUnit']),
  );

  bool get isLowStock => currentStock <= minStock;
}

// ── Reservations ─────────────────────────────────────────────────────────────

class Reservation {
  final String id;
  final String customerName;
  final String customerPhone;
  final int partySize;
  final DateTime date;
  final String timeSlot;
  final String? occasion;
  final String status;
  final String? tableId;
  final String? specialRequests;
  final DateTime createdAt;

  const Reservation({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.partySize,
    required this.date,
    required this.timeSlot,
    this.occasion,
    required this.status,
    this.tableId,
    this.specialRequests,
    required this.createdAt,
  });

  factory Reservation.fromJson(Map<String, dynamic> json) => Reservation(
    id: json['id'] as String? ?? '',
    customerName: json['customerName'] as String? ?? json['guestName'] as String? ?? 'Guest',
    customerPhone: json['customerPhone'] as String? ?? json['guestPhone'] as String? ?? '',
    partySize: parseInt(json['partySize'], 2),
    date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
    timeSlot: json['timeSlot'] as String? ?? '19:00',
    occasion: json['occasion'] as String?,
    status: json['status'] as String? ?? 'PENDING',
    tableId: json['tableId'] as String?,
    specialRequests: json['specialRequests'] as String?,
    createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
  );
}

// ── Dashboard Summary ────────────────────────────────────────────────────────

class DashboardSummary {
  final double todayRevenue;
  final int todayOrders;
  final int activeOrders;
  final int availableTables;
  final int occupiedTables;
  final double avgOrderValue;
  final List<RevenuePoint> revenueChart;

  const DashboardSummary({
    required this.todayRevenue,
    required this.todayOrders,
    required this.activeOrders,
    required this.availableTables,
    required this.occupiedTables,
    required this.avgOrderValue,
    this.revenueChart = const [],
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) =>
      DashboardSummary(
        todayRevenue: parseDouble(json['todayRevenue'], 0.0),
        todayOrders: parseInt(json['todayOrders'], 0),
        activeOrders: parseInt(json['activeOrders'], 0),
        availableTables: parseInt(json['availableTables'], 0),
        occupiedTables: parseInt(json['occupiedTables'], 0),
        avgOrderValue: parseDouble(json['avgOrderValue'], 0.0),
        revenueChart: (json['revenueChart'] as List<dynamic>?)
            ?.map((e) => RevenuePoint.fromJson(e as Map<String, dynamic>))
            .toList() ?? [],
      );
}

class RevenuePoint {
  final String label;
  final double amount;

  const RevenuePoint({required this.label, required this.amount});

  factory RevenuePoint.fromJson(Map<String, dynamic> json) => RevenuePoint(
    label: json['label'] as String? ?? '',
    amount: parseDouble(json['amount'], 0.0),
  );
}

// ── POS Cart ─────────────────────────────────────────────────────────────────

class CartItem {
  final String menuItemId;
  final String menuItemName;
  final String? variantId;
  final String variantName;
  final double unitPrice;
  final int quantity;
  final String? notes;
  final List<Modifier> selectedModifiers;

  const CartItem({
    required this.menuItemId,
    required this.menuItemName,
    this.variantId,
    required this.variantName,
    required this.unitPrice,
    required this.quantity,
    this.notes,
    this.selectedModifiers = const [],
  });

  double get modifierTotal =>
      selectedModifiers.fold(0.0, (sum, m) => sum + m.price);

  double get lineTotal => (unitPrice + modifierTotal) * quantity;

  CartItem copyWith({
    int? quantity,
    String? notes,
    List<Modifier>? selectedModifiers,
  }) =>
      CartItem(
        menuItemId: menuItemId,
        menuItemName: menuItemName,
        variantId: variantId,
        variantName: variantName,
        unitPrice: unitPrice,
        quantity: quantity ?? this.quantity,
        notes: notes ?? this.notes,
        selectedModifiers: selectedModifiers ?? this.selectedModifiers,
      );
}

// ── Kitchen KOT ──────────────────────────────────────────────────────────────

class KitchenStation {
  final String id;
  final String name;
  final String displayColor;
  final bool isActive;

  const KitchenStation({
    required this.id,
    required this.name,
    required this.displayColor,
    required this.isActive,
  });

  factory KitchenStation.fromJson(Map<String, dynamic> json) => KitchenStation(
    id: json['id'] as String,
    name: json['name'] as String,
    displayColor: json['displayColor'] as String? ?? '#3B82F6',
    isActive: json['isActive'] as bool? ?? true,
  );
}

// ── Promotions / Marketing ───────────────────────────────────────────────────

class PromotionTriggerItem {
  final String menuItemId;
  final String name;
  final int quantity;

  const PromotionTriggerItem({
    required this.menuItemId,
    required this.name,
    this.quantity = 1,
  });

  factory PromotionTriggerItem.fromJson(Map<String, dynamic> json) => PromotionTriggerItem(
    menuItemId: json['menuItemId']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    quantity: parseInt(json['quantity'], 1),
  );

  Map<String, dynamic> toJson() => {
    'menuItemId': menuItemId,
    'name': name,
    'quantity': quantity,
  };
}

class PromotionCustomPresets {
  final List<double> percentages;
  final List<double> flatAmounts;
  final List<String> reasons;

  const PromotionCustomPresets({
    this.percentages = const [5, 10, 15, 20],
    this.flatAmounts = const [50, 100, 150, 200],
    this.reasons = const ['Owner Courtesy', 'VIP Guest', 'Customer Delight', 'Staff Family'],
  });

  factory PromotionCustomPresets.fromJson(Map<String, dynamic> json) => PromotionCustomPresets(
    percentages: (json['percentages'] as List<dynamic>?)?.map((e) => parseDouble(e, 0.0)).toList() ?? const [5, 10, 15, 20],
    flatAmounts: (json['flatAmounts'] as List<dynamic>?)?.map((e) => parseDouble(e, 0.0)).toList() ?? const [50, 100, 150, 200],
    reasons: (json['reasons'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const ['Owner Courtesy', 'VIP Guest', 'Customer Delight', 'Staff Family'],
  );

  Map<String, dynamic> toJson() => {
    'percentages': percentages,
    'flatAmounts': flatAmounts,
    'reasons': reasons,
  };
}

class PromotionCampaign {
  final String id;
  final String tenantId;
  final String name;
  final String code;
  final String type; // LIMITED_TIME_COUPON | BILL_THRESHOLD | ITEM_COMBO_COMPLIMENTARY | CUSTOM_DISCOUNT
  final String? discountType; // PERCENTAGE | FLAT
  final double discountValue;
  final double minOrderValue;
  final double? maxDiscount;
  final String validFrom;
  final String validTo;
  final String? rewardType; // DISCOUNT | COMPLIMENTARY_ITEM
  final String? complementaryItemId;
  final String? complementaryItemName;
  final int complementaryItemQuantity;
  final List<PromotionTriggerItem> triggerItems;
  final PromotionCustomPresets? customPresets;
  final bool autoApply;
  final bool highlightOnQrMenu;
  final String status; // ACTIVE | PAUSED
  final int redemptions;
  final double totalSavings;
  final String createdAt;

  const PromotionCampaign({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.code,
    required this.type,
    this.discountType = 'PERCENTAGE',
    this.discountValue = 0.0,
    this.minOrderValue = 0.0,
    this.maxDiscount,
    required this.validFrom,
    required this.validTo,
    this.rewardType = 'DISCOUNT',
    this.complementaryItemId,
    this.complementaryItemName,
    this.complementaryItemQuantity = 1,
    this.triggerItems = const [],
    this.customPresets,
    this.autoApply = false,
    this.highlightOnQrMenu = true,
    this.status = 'ACTIVE',
    this.redemptions = 0,
    this.totalSavings = 0.0,
    required this.createdAt,
  });

  factory PromotionCampaign.fromJson(Map<String, dynamic> json) => PromotionCampaign(
    id: json['id']?.toString() ?? '',
    tenantId: json['tenantId']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    code: json['code']?.toString() ?? '',
    type: json['type']?.toString() ?? 'LIMITED_TIME_COUPON',
    discountType: json['discountType']?.toString() ?? 'PERCENTAGE',
    discountValue: parseDouble(json['discountValue'], 0.0),
    minOrderValue: parseDouble(json['minOrderValue'], 0.0),
    maxDiscount: parseNullableDouble(json['maxDiscount']),
    validFrom: json['validFrom']?.toString() ?? '',
    validTo: json['validTo']?.toString() ?? '',
    rewardType: json['rewardType']?.toString() ?? 'DISCOUNT',
    complementaryItemId: json['complementaryItemId']?.toString(),
    complementaryItemName: json['complementaryItemName']?.toString(),
    complementaryItemQuantity: parseInt(json['complementaryItemQuantity'], 1),
    triggerItems: (json['triggerItems'] as List<dynamic>?)
        ?.where((e) => e != null && e is Map<String, dynamic>)
        .map((e) => PromotionTriggerItem.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
    customPresets: json['customPresets'] != null && json['customPresets'] is Map<String, dynamic>
        ? PromotionCustomPresets.fromJson(json['customPresets'] as Map<String, dynamic>)
        : null,
    autoApply: parseBool(json['autoApply'], false),
    highlightOnQrMenu: parseBool(json['highlightOnQrMenu'], true),
    status: json['status']?.toString() ?? 'ACTIVE',
    redemptions: parseInt(json['redemptions'], 0),
    totalSavings: parseDouble(json['totalSavings'], 0.0),
    createdAt: json['createdAt']?.toString() ?? '',
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'tenantId': tenantId,
    'name': name,
    'code': code,
    'type': type,
    'discountType': discountType,
    'discountValue': discountValue,
    'minOrderValue': minOrderValue,
    'maxDiscount': maxDiscount,
    'validFrom': validFrom,
    'validTo': validTo,
    'rewardType': rewardType,
    'complementaryItemId': complementaryItemId,
    'complementaryItemName': complementaryItemName,
    'complementaryItemQuantity': complementaryItemQuantity,
    'triggerItems': triggerItems.map((e) => e.toJson()).toList(),
    'customPresets': customPresets?.toJson(),
    'autoApply': autoApply,
    'highlightOnQrMenu': highlightOnQrMenu,
    'status': status,
  };
}

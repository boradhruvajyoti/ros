// =============================================================================
// Riverpod Providers — Global state & API providers
// =============================================================================

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../api/api_client.dart';
import '../models/models.dart';
import '../storage/secure_storage.dart';

// ── Infrastructure Providers ──────────────────────────────────────────────────

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return ApiClient(storage);
});

// ── Auth State ────────────────────────────────────────────────────────────────

class AuthState {
  final AuthUser? user;
  final String? accessToken;
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.accessToken,
    this.isAuthenticated = false,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    AuthUser? user,
    String? accessToken,
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
  }) =>
      AuthState(
        user: user ?? this.user,
        accessToken: accessToken ?? this.accessToken,
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;
  final SecureStorageService _storage;
  final Ref _ref;

  AuthNotifier(this._api, this._storage, this._ref) : super(const AuthState()) {
    _initialize();
  }

  Future<void> _initialize() async {
    state = state.copyWith(isLoading: true);
    final token = await _storage.getAccessToken();
    final userData = await _storage.getUser();
    if (token != null && userData != null) {
      state = AuthState(
        user: AuthUser.fromJson(userData),
        accessToken: token,
        isAuthenticated: true,
      );
    } else {
      state = const AuthState();
    }
  }

  void _clearSessionCache() {
    try {
      _ref.read(cartProvider.notifier).clearCart();
    } catch (_) {}
    _ref.invalidate(posMenuProvider);
    _ref.invalidate(menuCategoriesProvider);
    _ref.invalidate(tablesProvider);
    _ref.invalidate(floorsProvider);
    _ref.invalidate(activeOrdersProvider);
    _ref.invalidate(kitchenKotsProvider);
    _ref.invalidate(kitchenStationsProvider);
    _ref.invalidate(staffProvider);
    _ref.invalidate(inventoryProvider);
    _ref.invalidate(dashboardProvider);
    _ref.invalidate(superAdminOverviewProvider);
    _ref.invalidate(superAdminTenantsProvider);
    _ref.invalidate(saasPlansProvider);
  }

  Future<void> login(String email, String password, {String? branchId}) async {
    state = state.copyWith(isLoading: true, error: null);
    // Purge any stale cache and session storage before writing new credentials
    await _storage.clearAll();
    _clearSessionCache();

    try {
      final res = await _api.post<Map<String, dynamic>>('/auth/login', data: {
        'email': email,
        'password': password,
        if (branchId != null) 'branchId': branchId,
      });

      final token = res['accessToken'] as String;
      final userJson = res['user'] as Map<String, dynamic>;

      // Derive branchId from branchRoles if not present
      if (userJson['branchId'] == null && userJson['branchRoles'] != null) {
        final branchRoles = userJson['branchRoles'] as List;
        if (branchRoles.isNotEmpty) {
          userJson['branchId'] = branchRoles.first['branchId'];
        }
      }

      final user = AuthUser.fromJson(userJson);

      await _storage.saveAccessToken(token);
      await _storage.saveUser(userJson);

      state = AuthState(
        user: user,
        accessToken: token,
        isAuthenticated: true,
      );

      // Invalidate all feature providers so newly authenticated user fetches fresh data
      _clearSessionCache();
    } on DioException catch (e) {
      String msg = 'Login failed. Please check your credentials.';
      final resData = e.response?.data;
      if (resData is Map) {
        if (resData['error'] is Map && resData['error']['message'] != null) {
          msg = resData['error']['message'].toString();
        } else if (resData['message'] != null) {
          msg = resData['message'].toString();
        }
      } else if (e.response?.statusCode == 401) {
        msg = 'Invalid email or password.';
      } else if (e.type == DioExceptionType.connectionTimeout ||
                 e.type == DioExceptionType.receiveTimeout ||
                 e.type == DioExceptionType.connectionError) {
        msg = 'Cannot connect to server. Please check your internet connection.';
      }
      state = state.copyWith(isLoading: false, error: msg);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (_) {}
    await _storage.clearAll();
    _clearSessionCache();
    state = const AuthState();
  }

  Future<void> switchBranch(String branchId) async {
    try {
      final res = await _api.post<Map<String, dynamic>>(
        '/auth/switch-branch',
        data: {'branchId': branchId},
      );
      final token = res['accessToken'] as String?;
      if (token != null) {
        await _storage.saveAccessToken(token);
        state = state.copyWith(accessToken: token);
      }
      // Update user branchId
      final userData = await _storage.getUser();
      if (userData != null) {
        userData['branchId'] = branchId;
        await _storage.saveUser(userData);
        state = state.copyWith(user: AuthUser.fromJson(userData));
      }
      _clearSessionCache();
    } catch (_) {}
  }

  void clearError() => state = state.copyWith(error: null);
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.watch(apiClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthNotifier(api, storage, ref);
});

// ── Socket.IO ─────────────────────────────────────────────────────────────────

final socketProvider = Provider<io.Socket?>((ref) {
  final auth = ref.watch(authProvider);
  if (!auth.isAuthenticated || auth.accessToken == null) return null;

  final socket = io.io(
    ApiClient.baseUrl.replaceAll('/api/v1', ''),
    io.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': auth.accessToken})
        .enableAutoConnect()
        .build(),
  );

  socket.connect();

  socket.on('ros:event', (data) {
    if (data is Map) {
      final type = data['type']?.toString();
      if (type == 'MENU_UPDATED' ||
          type == 'MENU_MODIFIED' ||
          type == 'MENU_ITEM_CREATED' ||
          type == 'MENU_ITEM_UPDATED' ||
          type == 'MENU_ITEM_DELETED' ||
          type == 'MENU_AVAILABILITY_CHANGED' ||
          type == 'MENU_CATEGORY_CREATED' ||
          type == 'MENU_CATEGORY_UPDATED' ||
          type == 'MENU_CATEGORY_DELETED') {
        ref.invalidate(posMenuProvider);
        ref.invalidate(menuCategoriesProvider);
      } else if (type == 'TABLE_UPDATED' || type == 'TABLE_STATUS_CHANGED') {
        ref.invalidate(tablesProvider);
      } else if (type == 'ORDER_CREATED' ||
          type == 'ORDER_STATUS_CHANGED' ||
          type == 'ORDER_UPDATED' ||
          type == 'QR_ORDER_PENDING' ||
          type == 'PAYMENT_COMPLETED') {
        ref.invalidate(activeOrdersProvider);
        ref.invalidate(tablesProvider);
        ref.invalidate(dashboardProvider);
      } else if (type == 'KOT_CREATED' || type == 'KOT_STATUS_CHANGED' || type == 'KOT_ITEM_STATUS_CHANGED') {
        ref.invalidate(kitchenKotsProvider);
        ref.invalidate(activeOrdersProvider);
      }
    }
  });

  ref.onDispose(() => socket.disconnect());

  return socket;
});

// ── Menu Providers ────────────────────────────────────────────────────────────

final posMenuProvider = FutureProvider<List<MenuCategory>>((ref) async {
  // Re-fetch when user or active branch changes
  ref.watch(authProvider);
  final api = ref.watch(apiClientProvider);

  try {
    // 1. Try optimized pos-menu endpoint
    try {
      final posData = await api.get<dynamic>('/menu/pos-menu');
      if (posData is List && posData.isNotEmpty) {
        final categories = posData
            .where((e) => e != null && e is Map<String, dynamic>)
            .map((e) => MenuCategory.fromJson(e as Map<String, dynamic>))
            .toList();

        final allItems = categories.expand((c) => c.items).toList();
        if (allItems.isNotEmpty) {
          return [
            MenuCategory(
              id: 'all',
              name: 'All Items',
              sortOrder: -1,
              isActive: true,
              items: allItems,
            ),
            ...categories,
          ];
        }
      }
    } catch (e) {
      debugPrint('[posMenuProvider] /menu/pos-menu fallback to /menu/categories & /menu/items: $e');
    }

    // 2. Fetch categories and items
    final categoriesData = await api.get<dynamic>('/menu/categories');
    final itemsData = await api.get<dynamic>('/menu/items');
    final catList = categoriesData is List ? categoriesData : [];
    final itemList = itemsData is List ? itemsData : [];
    final allItems = itemList
        .where((e) => e != null && e is Map<String, dynamic>)
        .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
        .toList();

    final result = <MenuCategory>[];

    // Always provide an "All Items" category as first tab
    if (allItems.isNotEmpty) {
      result.add(
        MenuCategory(
          id: 'all',
          name: 'All Items',
          sortOrder: -1,
          isActive: true,
          items: allItems,
        ),
      );
    }

    // Map existing categories
    final mappedCategoryIds = <String>{};
    for (final c in catList) {
      if (c is! Map<String, dynamic>) continue;
      final catId = c['id']?.toString() ?? '';
      if (catId.isNotEmpty) mappedCategoryIds.add(catId);
      final catItems = allItems.where((item) => item.categoryId == catId).toList();
      result.add(
        MenuCategory(
          id: catId,
          name: c['name']?.toString() ?? '',
          imageUrl: c['imageUrl']?.toString(),
          sortOrder: parseInt(c['sortOrder'], 0),
          isActive: parseBool(c['isActive'], true),
          items: catItems,
        ),
      );
    }

    // Capture any items that belong to categories not in catList or unmapped
    final unmappedItems = allItems
        .where((item) => !mappedCategoryIds.contains(item.categoryId))
        .toList();
    if (unmappedItems.isNotEmpty) {
      result.add(
        MenuCategory(
          id: 'other',
          name: 'Other',
          sortOrder: 999,
          isActive: true,
          items: unmappedItems,
        ),
      );
    }

    return result;
  } catch (e, st) {
    debugPrint('[posMenuProvider Error]: $e\n$st');
    rethrow;
  }
});

final menuCategoriesProvider = FutureProvider<List<MenuCategory>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>('/menu/categories');
  final list = data is List ? data : [];
  return list.map((e) => MenuCategory.fromJson(e as Map<String, dynamic>)).toList();
});

final menuItemsProvider = FutureProvider.family<List<MenuItem>, String?>(
  (ref, categoryId) async {
    final api = ref.watch(apiClientProvider);
    final params = categoryId != null ? {'categoryId': categoryId} : null;
    final data = await api.get<dynamic>('/menu/items', queryParameters: params);
    final list = data is List ? data : [];
    return list.map((e) => MenuItem.fromJson(e as Map<String, dynamic>)).toList();
  },
);

// ── Tables Providers ──────────────────────────────────────────────────────────

final tablesProvider = FutureProvider<List<RestaurantTable>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>('/tables');
  final list = data is List
      ? data
      : (data is Map && data['tables'] is List ? data['tables'] as List : []);
  return list.map((e) => RestaurantTable.fromJson(e as Map<String, dynamic>)).toList();
});

final floorsProvider = FutureProvider<List<Floor>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>('/tables/floors');
  final list = data is List ? data : [];
  return list.map((e) => Floor.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Orders Providers ──────────────────────────────────────────────────────────

final activeOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>('/orders/active');
  final list = data is List ? data : [];
  return list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
});

final orderHistoryProvider = FutureProvider.family<Map<String, dynamic>, Map<String, dynamic>>(
  (ref, params) async {
    final api = ref.watch(apiClientProvider);
    final data = await api.get<dynamic>('/orders', queryParameters: params);
    if (data is Map<String, dynamic>) return data;
    if (data is List) return {'orders': data, 'total': data.length};
    return {'orders': [], 'total': 0};
  },
);

// ── Kitchen Providers ─────────────────────────────────────────────────────────

final kitchenKotsProvider = FutureProvider<List<OrderKot>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>('/kitchen/kots');
  final list = data is List ? data : (data is Map && data['kots'] is List ? data['kots'] as List : []);
  return list.map((e) => OrderKot.fromJson(e as Map<String, dynamic>)).toList();
});

final kitchenStationsProvider = FutureProvider<List<KitchenStation>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>('/kitchen/stations');
  final list = data is List ? data : [];
  return list.map((e) => KitchenStation.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Customers Provider ────────────────────────────────────────────────────────

final customersProvider = FutureProvider.family<List<Customer>, Map<String, dynamic>>(
  (ref, params) async {
    final api = ref.watch(apiClientProvider);
    final data = await api.get<dynamic>('/customers', queryParameters: params);
    final list = data is List
        ? data
        : (data is Map && data['customers'] is List ? data['customers'] as List : []);
    return list.map((e) => Customer.fromJson(e as Map<String, dynamic>)).toList();
  },
);

// ── Staff Provider ────────────────────────────────────────────────────────────

final staffProvider = FutureProvider<List<StaffMember>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>('/staff/employees');
  final list = data is List
      ? data
      : (data is Map && (data['users'] is List || data['members'] is List)
          ? (data['users'] ?? data['members']) as List
          : []);
  return list.map((e) => StaffMember.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Inventory Provider ────────────────────────────────────────────────────────

final inventoryProvider = FutureProvider<List<InventoryItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<dynamic>('/inventory/ingredients');
  final list = data is List
      ? data
      : (data is Map && (data['items'] is List || data['ingredients'] is List)
          ? (data['items'] ?? data['ingredients']) as List
          : []);
  return list.map((e) => InventoryItem.fromJson(e as Map<String, dynamic>)).toList();
});

// ── Reservations Provider ─────────────────────────────────────────────────────

final reservationsProvider = FutureProvider.family<List<Reservation>, Map<String, dynamic>>(
  (ref, params) async {
    final api = ref.watch(apiClientProvider);
    final data = await api.get<dynamic>('/reservations', queryParameters: params);
    final list = data is List
        ? data
        : (data is Map && data['reservations'] is List ? data['reservations'] as List : []);
    return list.map((e) => Reservation.fromJson(e as Map<String, dynamic>)).toList();
  },
);

// ── Dashboard Provider ────────────────────────────────────────────────────────

final dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final summary = await api.get<dynamic>('/reports/summary');
    if (summary is Map<String, dynamic>) {
      final totalRevenue = parseDouble(summary['totalRevenue'], 0.0);
      final totalOrders = parseInt(summary['totalOrders'], 0);
      final activeTables = parseInt(summary['activeTables'], 0);
      return {
        'todayRevenue': totalRevenue,
        'todayOrders': totalOrders,
        'activeOrders': activeTables,
        'avgOrderValue': totalOrders > 0 ? (totalRevenue / totalOrders) : 0.0,
        ...summary,
      };
    }
  } catch (_) {}
  return {
    'todayRevenue': 0.0,
    'todayOrders': 0,
    'activeOrders': 0,
    'avgOrderValue': 0.0,
  };
});

// ── POS Cart State ────────────────────────────────────────────────────────────

class CartState {
  final List<CartItem> items;
  final String orderType;
  final String? tableId;
  final String? customerId;
  final String? notes;
  final double discountAmount;
  final String? discountType; // FLAT | PERCENTAGE
  final double discountValue;

  const CartState({
    this.items = const [],
    this.orderType = 'DINE_IN',
    this.tableId,
    this.customerId,
    this.notes,
    this.discountAmount = 0.0,
    this.discountType,
    this.discountValue = 0.0,
  });

  double get subtotal =>
      items.fold(0.0, (sum, item) => sum + item.lineTotal);

  double get total => subtotal - discountAmount;

  CartState copyWith({
    List<CartItem>? items,
    String? orderType,
    String? tableId,
    String? customerId,
    String? notes,
    double? discountAmount,
    String? discountType,
    double? discountValue,
  }) =>
      CartState(
        items: items ?? this.items,
        orderType: orderType ?? this.orderType,
        tableId: tableId ?? this.tableId,
        customerId: customerId ?? this.customerId,
        notes: notes ?? this.notes,
        discountAmount: discountAmount ?? this.discountAmount,
        discountType: discountType ?? this.discountType,
        discountValue: discountValue ?? this.discountValue,
      );
}

class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(const CartState());

  void addItem(CartItem item) {
    final existing = state.items.indexWhere(
      (e) => e.menuItemId == item.menuItemId && e.variantId == item.variantId,
    );

    if (existing >= 0) {
      final updated = List<CartItem>.from(state.items);
      updated[existing] = updated[existing].copyWith(
        quantity: updated[existing].quantity + item.quantity,
      );
      state = state.copyWith(items: updated);
    } else {
      state = state.copyWith(items: [...state.items, item]);
    }
  }

  void updateQuantity(int index, int qty) {
    if (qty <= 0) {
      removeItem(index);
      return;
    }
    final updated = List<CartItem>.from(state.items);
    updated[index] = updated[index].copyWith(quantity: qty);
    state = state.copyWith(items: updated);
  }

  void removeItem(int index) {
    final updated = List<CartItem>.from(state.items);
    updated.removeAt(index);
    state = state.copyWith(items: updated);
  }

  void setOrderType(String type) => state = state.copyWith(orderType: type);

  void setTable(String? tableId) => state = state.copyWith(tableId: tableId);

  void setCustomer(String? customerId) =>
      state = state.copyWith(customerId: customerId);

  void setNotes(String? notes) => state = state.copyWith(notes: notes);

  void applyDiscount(String type, double value) {
    final amount = type == 'PERCENTAGE'
        ? (state.subtotal * value) / 100
        : value;
    state = state.copyWith(
      discountType: type,
      discountValue: value,
      discountAmount: amount,
    );
  }

  void clearDiscount() => state = state.copyWith(
    discountType: null,
    discountValue: 0,
    discountAmount: 0,
  );

  void clearCart() => state = const CartState();
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier();
});

// ── Super Admin Providers ───────────────────────────────────────────────────

final superAdminOverviewProvider = FutureProvider<SuperAdminOverview>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<Map<String, dynamic>>('/super-admin/overview');
  return SuperAdminOverview.fromJson(data);
});

final superAdminTenantsProvider = FutureProvider<List<TenantSummary>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<List<dynamic>>('/super-admin/tenants');
  return data.map((e) => TenantSummary.fromJson(e as Map<String, dynamic>)).toList();
});

final saasPlansProvider = FutureProvider<List<SaasPlanItem>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final data = await api.get<List<dynamic>>('/super-admin/plans');
  return data.map((e) => SaasPlanItem.fromJson(e as Map<String, dynamic>)).toList();
});

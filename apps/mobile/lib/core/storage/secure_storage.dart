// =============================================================================
// Secure Storage Service — JWT tokens & user session
// =============================================================================

import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static const _kAccessToken = 'ros_access_token';
  static const _kUser = 'ros_user';
  static const _kTenantId = 'ros_tenant_id';
  static const _kBranchId = 'ros_branch_id';

  final FlutterSecureStorage _storage;

  SecureStorageService()
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
          iOptions: IOSOptions(
            accessibility: KeychainAccessibility.first_unlock,
          ),
        );

  Future<void> saveAccessToken(String token) async {
    await _storage.write(key: _kAccessToken, value: token);
  }

  Future<String?> getAccessToken() async {
    return _storage.read(key: _kAccessToken);
  }

  Future<void> saveUser(Map<String, dynamic> user) async {
    await _storage.write(key: _kUser, value: jsonEncode(user));
    if (user['tenantId'] != null) {
      await _storage.write(key: _kTenantId, value: user['tenantId'] as String);
    }
    if (user['branchId'] != null) {
      await _storage.write(key: _kBranchId, value: user['branchId'] as String);
    }
  }

  Future<Map<String, dynamic>?> getUser() async {
    final raw = await _storage.read(key: _kUser);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<String?> getTenantId() async {
    return _storage.read(key: _kTenantId);
  }

  Future<String?> getBranchId() async {
    return _storage.read(key: _kBranchId);
  }

  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}

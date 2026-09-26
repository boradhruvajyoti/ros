// =============================================================================
// ROS API Client — Dio with JWT injection & token refresh
// =============================================================================

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../storage/secure_storage.dart';

const String _kBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'https://ros.oxomsoft.com/api/v1',
);

class ApiClient {
  static ApiClient? _instance;
  late final Dio _dio;
  final SecureStorageService _storage;
  bool _isRefreshing = false;

  ApiClient._internal(this._storage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: _kBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: _onRequest,
        onResponse: _onResponse,
        onError: _onError,
      ),
    );
  }

  factory ApiClient(SecureStorageService storage) {
    _instance ??= ApiClient._internal(storage);
    return _instance!;
  }

  Dio get dio => _dio;

  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.getAccessToken();
    final user = await _storage.getUser();

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    if (user != null) {
      options.headers['X-Tenant-ID'] = user['tenantId'] ?? '';
      options.headers['X-Branch-ID'] = user['branchId'] ?? '';
    }
    return handler.next(options);
  }

  Future<void> _onResponse(
    Response response,
    ResponseInterceptorHandler handler,
  ) async {
    return handler.next(response);
  }

  Future<void> _onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final original = err.requestOptions;
    final url = original.path;

    final isAuthEndpoint =
        url.contains('/auth/login') ||
        url.contains('/auth/refresh') ||
        url.contains('/auth/onboard');

    if (err.response?.statusCode == 401 &&
        !isAuthEndpoint &&
        !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshed = await _refreshToken();
        if (refreshed) {
          final token = await _storage.getAccessToken();
          original.headers['Authorization'] = 'Bearer $token';
          final retry = await _dio.fetch(original);
          _isRefreshing = false;
          return handler.resolve(retry);
        }
      } catch (_) {}
      _isRefreshing = false;
      await _storage.clearAll();
    }

    return handler.next(err);
  }

  Future<bool> _refreshToken() async {
    try {
      final res = await Dio(BaseOptions(baseUrl: _kBaseUrl))
          .post('/auth/refresh');
      final newToken = res.data['data']['accessToken'] as String?;
      if (newToken != null) {
        await _storage.saveAccessToken(newToken);
        return true;
      }
    } catch (_) {}
    return false;
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.get(path, queryParameters: queryParameters);
    final data = res.data['data'];
    return fromJson != null ? fromJson(data) : data as T;
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.post(path, data: data);
    final resData = res.data['data'];
    return fromJson != null ? fromJson(resData) : resData as T;
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.patch(path, data: data);
    final resData = res.data['data'];
    return fromJson != null ? fromJson(resData) : resData as T;
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    final res = await _dio.put(path, data: data);
    final resData = res.data['data'];
    return fromJson != null ? fromJson(resData) : resData as T;
  }

  Future<void> delete(String path) async {
    await _dio.delete(path);
  }

  static String get baseUrl => _kBaseUrl;
}

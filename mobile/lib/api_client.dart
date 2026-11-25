import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

typedef Json = Map<String, dynamic>;

class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  ApiException(this.status, this.code, this.message);
  @override
  String toString() => message;
}

class ApiClient extends ChangeNotifier {
  static const defaultBase = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );
  final String base;
  final http.Client _http;
  final FlutterSecureStorage _storage;
  Json? _session;
  Future<void>? _refreshing;
  int _generation = 0;
  Json? get user => _session?['user'] as Json?;
  bool get signedIn => _session != null;

  ApiClient({
    this.base = defaultBase,
    http.Client? client,
    FlutterSecureStorage? storage,
  }) : _http = client ?? http.Client(),
       _storage = storage ?? const FlutterSecureStorage() {
    if (!kDebugMode && Uri.parse(base).scheme != 'https') {
      throw ArgumentError('Release builds require HTTPS.');
    }
  }

  Future<void> restore() async {
    final saved = await _storage.read(key: 'plantravel_session');
    if (saved == null) return;
    try {
      _session = jsonDecode(saved) as Json;
    } catch (_) {
      await _storage.delete(key: 'plantravel_session');
    }
    notifyListeners();
  }

  Future<void> acceptSession(Json data) async {
    _generation++;
    _session = data;
    await _storage.write(key: 'plantravel_session', value: jsonEncode(data));
    notifyListeners();
  }

  Future<void> clearSession() async {
    _generation++;
    _session = null;
    await _storage.delete(key: 'plantravel_session');
    notifyListeners();
  }

  Future<void> logout() async {
    final refresh = _session?['refreshToken'];
    try {
      if (refresh != null) {
        await request(
          'POST',
          '/auth/logout',
          body: {'refreshToken': refresh},
          authenticated: false,
        );
      }
    } finally {
      await clearSession();
    }
  }

  Future<dynamic> _send(
    String method,
    String path,
    Json? body,
    String? token,
  ) async {
    final uri = Uri.parse('$base$path');
    final req = http.Request(method, uri)
      ..headers['Content-Type'] = 'application/json';
    if (token != null) req.headers['Authorization'] = 'Bearer $token';
    if (body != null) req.body = jsonEncode(body);
    http.Response response;
    try {
      response = await http.Response.fromStream(
        await _http.send(req).timeout(const Duration(seconds: 70)),
      ).timeout(const Duration(seconds: 70));
    } on TimeoutException {
      throw ApiException(0, 'TIMEOUT', 'Kết nối quá lâu. Hãy thử lại.');
    } on http.ClientException {
      throw ApiException(
        0,
        'NETWORK',
        'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
      );
    }
    dynamic data;
    try {
      data = response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      throw ApiException(
        response.statusCode,
        'INVALID_RESPONSE',
        'Máy chủ trả dữ liệu không hợp lệ.',
      );
    }
    if (response.statusCode >= 400) {
      throw ApiException(
        response.statusCode,
        data?['code'] as String? ?? 'API_ERROR',
        data?['message'] as String? ?? 'Thao tác chưa thành công.',
      );
    }
    return data;
  }

  Future<void> _refresh() async {
    final session = _session;
    if (session == null) {
      throw ApiException(401, 'LOGIN_REQUIRED', 'Vui lòng đăng nhập lại.');
    }
    final generation = _generation;
    try {
      final data = await _send('POST', '/auth/refresh', {
        'refreshToken': session['refreshToken'],
      }, null) as Json;
      if (generation != _generation) {
        throw ApiException(
          401,
          'SESSION_CHANGED',
          'Phiên đăng nhập đã thay đổi.',
        );
      }
      _session = data;
      await _storage.write(key: 'plantravel_session', value: jsonEncode(data));
    } on ApiException catch (error) {
      if (generation == _generation && [400, 401, 403].contains(error.status)) {
        await clearSession();
      }
      rethrow;
    }
  }

  Future<dynamic> request(
    String method,
    String path, {
    Json? body,
    bool authenticated = true,
  }) async {
    final generation = _generation;
    final token = authenticated ? (_session?['token'] as String?) : null;
    try {
      return await _send(method, path, body, token);
    } on ApiException catch (error) {
      if (!authenticated ||
          token == null ||
          error.status != 401 ||
          RegExp(r'^/auth/(login|register|google|refresh|logout)(/|$|\?)')
              .hasMatch(path)) {
        rethrow;
      }
      if (generation != _generation) rethrow;
      if (_session?['token'] == token) {
        final refresh = _refreshing ??= _refresh();
        try {
          await refresh;
        } finally {
          if (identical(_refreshing, refresh)) _refreshing = null;
        }
      }
      if (generation != _generation) {
        throw ApiException(
          401,
          'SESSION_CHANGED',
          'Phiên đăng nhập đã thay đổi.',
        );
      }
      return _send(method, path, body, _session?['token'] as String?);
    }
  }

  @override
  void dispose() {
    _http.close();
    super.dispose();
  }
}

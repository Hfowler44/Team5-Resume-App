import 'dart:convert';
import '../../utils/api_service.dart';
import 'user.dart';

class AuthService {
  static const String authUrl = 'http://resume.wannadoservers.com/api/auth';

  static Future<User?> login(String email, String password) async {
    final data = await ApiService.post(
      '$authUrl/login',
      {
        "email": email.trim(),
        "password": password.trim(),
      },
    );

    if (data == null) {
      print("Login Failed: no response");
      return null;
    }

    if (data["error"] != null) {
      print("Login error: ${data["error"]}");
      return null;
    }

    try {
      final user = User.fromJson(data);
      return user;
    } catch (e) {
      print("Login error: $e");
      return null;
    }
  }
}

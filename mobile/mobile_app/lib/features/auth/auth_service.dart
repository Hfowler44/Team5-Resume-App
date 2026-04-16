import 'dart:convert';
import '../../utils/api_service.dart';
import 'user.dart';

class AuthService {
  static const String authUrl = 'http://wannadoservers.com/api/auth';

  static Future<Map<String, dynamic>?> login(
      String email, String password) async {

    final data = await ApiService.post(
      '$authUrl/login',
      {
        "email": email.trim(),
        "password": password.trim(),
      },
    );

    print("LOGIN RESPONSE: $data");

    return data;
  }

  static Future<User?> register(
      String name, String email, String password) async {
        final data = await ApiService.post(
          '$authUrl/register',
          {
            "fullName": name.trim(),
            "email": email.trim(),
            "password": password.trim(),
          },
        );

        print("REGISTER RESPONSE: $data");

        if (data == null) {
          print("Register error: ${data["error"]}");
          return null;
        }

          if (data["error"] != null) return null;

          try {
            return User.fromJson(data);
          } catch (e) {
            print("Parse error: $e");
            return null;
          }
      }
}

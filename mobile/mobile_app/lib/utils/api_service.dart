import 'dart:convert';
import 'dart:io';
import 'global_data.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class ApiService {
  static Map<String,String> _headers({bool isJson = true}) {
    return{
      "Accept": "application/json",
      if (isJson) "Content-Type": "application/json",
      if (GlobalData.token.isNotEmpty)
        "Authorization": "Bearer ${GlobalData.token}",
    };
  }

  static Future<dynamic> get(String url) async {
    try {
      final response = await http.get(
        Uri.parse(url),
        headers: _headers(isJson: false),
      );
      return _handleResponse(response);
    } catch (e) {
      return null;
    }
  }

  static Future<dynamic> post(String url, Map<String, dynamic> body) async {
    try {
      final response = await http.post(
        Uri.parse(url),
        headers: _headers(),
        body: json.encode(body),
      );

      return _handleResponse(response);
    } catch (e) {
      return null;
    }
  }

  static Future<dynamic> uploadFile(String url, File file) async {
    try {
      var request = http.MultipartRequest('POST', Uri.parse(url));

      if (GlobalData.token.isNotEmpty) {
        request.headers["Authorization"] = "Bearer ${GlobalData.token}";
      }

      request.files.add(
        await http.MultipartFile.fromPath('resume', file.path, contentType: MediaType('application', 'pdf')),
      );

      var streamed = await request.send();
      var response = await http.Response.fromStream(streamed);

      print("UPLOAD STATUS: ${response.statusCode}");
      print("UPLOAD BODY: ${response.body}");

      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body);
      }

      return null;
    } catch (e) {
      print("UPLOAD ERROR: $e");
      return null;
    }
  }

  static Future<dynamic> delete(String url) async {
    try{
      final response = await http.delete(
        Uri.parse(url),
        headers: _headers(isJson: false),
      );
      return _handleResponse(response);
    } catch (e) {
      return null;
    }
  }

  static dynamic _handleResponse(http.Response response) {
    if (response.body.isEmpty) return null;

    try {
      return json.decode(response.body);
    } catch (_) {
      return null;
    }
  }
}
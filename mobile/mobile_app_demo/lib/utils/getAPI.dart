import 'package:http/http.dart' as http;

class ApiService {
  static Future<String> getJson(String url, String outgoing) async {
    String ret = "";
    try {
      http.Response response = await http.post(
        Uri.parse(url),
        body: outgoing,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      );
      ret = response.body;
    } catch (e) {
        print(e.toString());
    }
    return ret;
  }
}
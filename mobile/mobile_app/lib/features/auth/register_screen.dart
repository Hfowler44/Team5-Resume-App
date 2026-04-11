import 'dart:convert';
import 'package:flutter/material.dart';
import '../../utils/api_service.dart';
import '../../utils/global_data.dart';

class RegisterScreen extends StatefulWidget {
  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {

  String name = '';
  String email = '';
  String password = '';
  String message = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Register"),
      ),

      body: Center(
        child: Container(
          width: 300,
          padding: EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [

              TextField(
                onChanged: (val) => name = val,
                decoration: InputDecoration(
                  labelText: "Full Name",
                  border: OutlineInputBorder(),
                ),
              ),

              SizedBox(height: 12),

              TextField(
                onChanged: (val) => email = val,
                decoration: InputDecoration(
                  labelText: "Email",
                  border: OutlineInputBorder(),
                ),
              ),

              SizedBox(height: 12),

              TextField(
                obscureText: true,
                onChanged: (val) => password = val,
                decoration: InputDecoration(
                  labelText: "Password",
                  border: OutlineInputBorder(),
                ),
              ),

              SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: registerUser,
                  child: Text("Register"),
                ),
              ),

              SizedBox(height: 10),

              if (message.isNotEmpty)
                Text(
                  message,
                  style: TextStyle(color: Colors.red),
                ),

              SizedBox(height: 10),

              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                },
                child: Text("Back to Login"),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void registerUser() async {

    String payload = json.encode({
      "fullName": name.trim(),
      "email": email.trim(),
      "password": password.trim()
    });

    String url = 'http://resume.wannadoservers.com/api/auth/register';

    String ret = await ApiService.getJson(url, payload);

    if (ret.isEmpty) {
      setState(() => message = "Server not responding");
      return;
    }

    var jsonObject;

    try {
      jsonObject = json.decode(ret);
    } catch (e) {
      setState(() => message = "Invalid server response");
      return;
    }

    if (jsonObject["error"] != null) {
      setState(() => message = jsonObject["error"]);
      return;
    }

    var user = jsonObject["user"];

    if (user == null) {
      setState(() => message = "Invalid server response");
      return;
    }

    GlobalData.userId = user["id"];
    GlobalData.fullName = user["fullName"];
    GlobalData.email = user["email"];
    GlobalData.token = jsonObject["token"];

    Navigator.pushNamed(context, '/dashboard');
  }
}
import 'dart:convert';
import 'package:flutter/material.dart';
import '../../utils/global_data.dart';
import '../../utils/api_service.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}
class _LoginScreenState extends State<LoginScreen> {
  @override
  void initState() {
    super.initState();
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: MainPage(),
    );
  }
}
class MainPage extends StatefulWidget {
  @override
  _MainPageState createState() => _MainPageState();
}
class _MainPageState extends State<MainPage> {
  String message = "", newMessageText = '';
  String email = '', password = '';
  changeText() {
    setState(() {
      message = newMessageText;
    });
  }
  @override
  void initState() {
    super.initState();
  }
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 200,
        child:
        Column(
          mainAxisAlignment: MainAxisAlignment.center, //Center Column contents vertically,
          crossAxisAlignment: CrossAxisAlignment.center, //Center Column contents horizontal
          children: <Widget>[
            Text(
              "Knight My Resume",
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onBackground,
              ),
            ),
            SizedBox(height: 20),

            Row(
              children: <Widget>[
                Expanded(
                  child: Text('$message',style: TextStyle(fontSize: 14 ,color:Colors.black)),
                ),
              ],
            ),
            Row(
                children: <Widget>[
                  Container(
                    width: 200,
                    child:
                    TextField (
                      onChanged: (text) {
                        email = text;
                      },
                      decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(),
                          labelText: 'Email',
                          hintText: 'Enter your email'
                      ),
                    ),
                  ),
                ]
            ),
            Row(
                children: <Widget>[
                  Container(
                    width: 200,
                    child:
                    TextField (
                      obscureText: true,
                      onChanged: (text) {
                        password = text;
                      },
                      decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(),
                          labelText: 'Password',
                          hintText: 'Enter your password'
                      ),
                    ),
                  ),
                ]
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.brown[50],
                    foregroundColor: Colors.black,
                    padding: EdgeInsets.all(8.0),
                  ),
                  onPressed: () async{
                    newMessageText = "";
                    changeText();

                    String payload = json.encode({"email": email.trim(), "password": password.trim()});
                    var jsonObject;
                    String ret = "";
                    try
                    {
                      String url = 'http://resume.wannadoservers.com/api/auth/login';
                      ret = await ApiService.getJson(url, payload);

                      if (ret.isEmpty) {
                        newMessageText = "Server not responding";
                        changeText();
                        return;
                      }

                      jsonObject = json.decode(ret);
                    }
                    catch(e)
                    {
                      newMessageText = "Network error";
                      changeText();
                      return;
                    }

                    if (jsonObject["error"] != null) {
                      newMessageText = jsonObject["error"];
                      changeText();
                      return;
                    }

                    var user = jsonObject["user"];

                    if (user == null) {
                      newMessageText = "Invalid server response";
                      changeText();
                      return;
                    }

                    GlobalData.userId = user["id"];
                    GlobalData.fullName = user["fullName"];
                    GlobalData.email = user["email"];
                    GlobalData.token = jsonObject["token"];

                    Navigator.pushNamed(context, '/dashboard');
                  },
                  child: Text(
                    'Do Login',
                    style: TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                TextButton(
                  onPressed: () {
                    Navigator.pushNamed(context, '/register');
                  },
                  child: Text("Create account"),
                ),
              ],
            ),
          ],
        )
    ));
  }
}
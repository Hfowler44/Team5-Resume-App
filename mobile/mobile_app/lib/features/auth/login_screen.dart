import 'package:flutter/material.dart';
import '../../utils/global_data.dart';
import "../../features/auth/auth_service.dart";
import "../../features/auth/user.dart";
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
                    //
                    final response = await AuthService.login(email, password);

                    if (response == null) {
                      newMessageText = "Server error";
                      changeText();
                      return;
                    }

                    if (response["error"] != null) {
                      final error = response["error"].toString().toLowerCase();

                      if (error.contains("verify")) {
                        newMessageText = "Please verify your email";
                      } else {
                        newMessageText = response["error"];
                      }

                      changeText();
                      return;
                    }

                    final user = User.fromJson(response);
                    GlobalData.userId = user.id;
                    GlobalData.fullName = user.fullName;
                    GlobalData.email = user.email;
                    GlobalData.token = user.token;

                    Navigator.pushNamed(context, '/dashboard');
                  },
                  child: Text(
                    'Login',
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
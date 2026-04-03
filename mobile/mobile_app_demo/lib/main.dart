import 'package:flutter/material.dart';
import 'package:mobile_app_demo/routes/routes.dart';

void main() {
  runApp(MyApp());
}
class MyApp extends StatelessWidget {
// This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AI-Assisted Resume Review',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(),
      routes: Routes.getroutes,
      initialRoute: '/',
    );
  }
}

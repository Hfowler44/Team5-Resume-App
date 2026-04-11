import 'package:flutter/material.dart';
import 'package:mobile_app/routes/routes.dart';

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
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: Color(0xFFF4EAD5),
        colorScheme: ColorScheme.fromSeed(seedColor: Color(0xFFFFD54F),
        ),
      ),
      routes: Routes.getroutes,
      initialRoute: '/',
    );
  }
}

import 'package:flutter/material.dart';
import 'package:mobile_app_demo/screens/LoginScreen.dart';
import 'package:mobile_app_demo/screens/DashboardScreen.dart';

class Routes {
  static const String LOGIN = '/login';
  static const String DASHBOARD = '/dashboard';
// Define routes for pages in the app
  static Map<String, Widget Function(BuildContext)> get getroutes => {
    '/': (context) => LoginScreen(),
    LOGIN: (context) => LoginScreen(),
    DASHBOARD: (context) => DashboardScreen(),
  };
}
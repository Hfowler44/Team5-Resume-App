import 'package:flutter/material.dart';
import 'package:mobile_app/features/auth/login_screen.dart';
import 'package:mobile_app/features/auth/register_screen.dart';
import 'package:mobile_app/features/dashboard/dashboard_screen.dart';

class Routes {
  static const String LOGIN = '/login';
  static const String REGISTER = '/register';
  static const String DASHBOARD = '/dashboard';
// Define routes for pages in the app
  static Map<String, Widget Function(BuildContext)> get getroutes => {
    '/': (context) => LoginScreen(),
    LOGIN: (context) => LoginScreen(),
    REGISTER: (context) => RegisterScreen(),
    DASHBOARD: (context) => DashboardScreen(),
  };
}
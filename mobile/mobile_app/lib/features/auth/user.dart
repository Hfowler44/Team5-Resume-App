class User {
  final String id;
  final String fullName;
  final String email;
  final String token;

  User({
    required this.id,
    required this.fullName,
    required this.email,
    required this.token,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json["user"]["id"],
      fullName: json["user"]["fullName"],
      email: json["user"]["email"],
      token: json["token"],
    );
  }
}
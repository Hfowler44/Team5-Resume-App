class Resume {
  final String id;
  final String fileName;
  final String fileUrl;
  final String status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final Map<String, dynamic>? parsed;

  Resume({
    required this.id,
    required this.fileName,
    required this.fileUrl,
    required this.status,
    this.createdAt,
    this.updatedAt,
    this.parsed,
  });

  factory Resume.fromJson(Map<String, dynamic> json) {
    return Resume(
      id: json["_id"]?.toString() ?? "",
      fileName: json["fileName"] ?? "",
      fileUrl: json["fileUrl"] ?? "",
      status: json["status"] ?? "",
      createdAt: json["createdAt"]
          != null ? DateTime.parse(json["createdAt"]) : null,
      updatedAt: json["updatedAt"]
          != null ? DateTime.parse(json["updatedAt"]) : null,
      parsed: json["parsed"] is Map<String, dynamic> ? json["parsed"] : null,
    );
  }
}
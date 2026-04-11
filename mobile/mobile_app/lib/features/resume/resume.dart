class Resume {
  final String id;
  final String fileName;
  final String fileUrl;
  final String status;

  Resume({
    required this.id,
    required this.fileName,
    required this.fileUrl,
    required this.status,
  });

  factory Resume.fromJson(Map<String, dynamic> json) {
    return Resume(
      id: json["_id"],
      fileName: json["fileName"],
      fileUrl: json["fileUrl"],
      status: json["status"],
    );
  }
}
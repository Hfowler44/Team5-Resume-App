class ResumeVersion {
  final String id;
  final String resumeId;
  final int versionNumber;
  final String changeSummary;
  final int improvementScore;
  final DateTime? createdAt;

  ResumeVersion({
    required this.id,
    required this.resumeId,
    required this.versionNumber,
    required this.changeSummary,
    required this.improvementScore,
    this.createdAt,
  });

  factory ResumeVersion.fromJson(Map<String, dynamic> json) {
    return ResumeVersion(
      id: json["_id"]?.toString() ?? "",
      resumeId: json["resumeId"]?.toString() ?? "",
      versionNumber: json["versionNumber"] ?? 0,
      changeSummary: json["changeSummary"] ?? "",
      improvementScore: json["improvementScore"] ?? 0,
      createdAt: json["createdAt"] != null ? DateTime.parse(json["createdAt"]) : null,
    );
  }
}
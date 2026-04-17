class JobInfo {
  final String id;
  final String title;
  final String company;
  final String location;
  final String jobUrl;

  JobInfo({
    required this.id,
    required this.title,
    required this.company,
    required this.location,
    required this.jobUrl,
  });

  factory JobInfo.fromJson(Map<String, dynamic> json) {
    return JobInfo(
      id: json["_id"]?.toString() ?? "",
      title: json["title"] ?? "",
      company: json["company"] ?? "",
      location: json["location"] ?? "",
      jobUrl: json["jobUrl"] ?? "",
    );
  }
}

class JobMatchResult {
  final JobInfo job;
  final int matchScore;

  JobMatchResult({
    required this.job,
    required this.matchScore,
  });

  factory JobMatchResult.fromJson(Map<String, dynamic> json) {
    return JobMatchResult(
      job: JobInfo.fromJson(Map<String, dynamic>.from(json["job"] ?? {})),
      matchScore: json["matchScore"] is int
          ? json["matchScore"]
          : int.tryParse('${json["matchScore"]}') ?? 0,
    );
  }
}
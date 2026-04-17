class JobSkill {
  final String name;

  JobSkill({required this.name});

  factory JobSkill.fromJson(Map<String, dynamic> json) {
    return JobSkill(name: json["name"]?.toString() ?? "");
  }
}

class MatchedJob {
  final String id;
  final String title;
  final String company;
  final String location;
  final String description;
  final String jobUrl;
  final String source;
  final List<JobSkill> requiredSkills;

  MatchedJob({
    required this.id,
    required this.title,
    required this.company,
    required this.location,
    required this.description,
    required this.jobUrl,
    required this.source,
    required this.requiredSkills,
  });

  factory MatchedJob.fromJson(Map<String, dynamic> json) {
    final skills = json["requiredSkills"] as List? ?? const [];

    return MatchedJob(
      id: json["_id"]?.toString() ?? json["externalJobId"]?.toString() ?? "",
      title: json["title"]?.toString() ?? "",
      company: json["company"]?.toString() ?? "",
      location: json["location"]?.toString() ?? "",
      description: json["description"]?.toString() ?? "",
      jobUrl: json["jobUrl"]?.toString() ?? "",
      source: json["source"]?.toString() ?? "",
      requiredSkills: skills
          .whereType<Map>()
          .map((skill) => JobSkill.fromJson(Map<String, dynamic>.from(skill)))
          .toList(),
    );
  }
}

class JobMatchResult {
  final MatchedJob job;
  final int matchScore;
  final String reasoning;
  final List<String> missingSkills;
  final String recommendationStatus;

  JobMatchResult({
    required this.job,
    required this.matchScore,
    required this.reasoning,
    required this.missingSkills,
    required this.recommendationStatus,
  });

  factory JobMatchResult.fromJson(Map<String, dynamic> json) {
    final missingSkills = json["missingSkills"] as List? ?? const [];

    return JobMatchResult(
      job: MatchedJob.fromJson(
        Map<String, dynamic>.from(json["job"] as Map? ?? const {}),
      ),
      matchScore: (json["matchScore"] as num?)?.round() ?? 0,
      reasoning: json["reasoning"]?.toString() ?? "",
      missingSkills: missingSkills.map((skill) => skill.toString()).toList(),
      recommendationStatus: json["recommendationStatus"]?.toString() ?? "",
    );
  }
}

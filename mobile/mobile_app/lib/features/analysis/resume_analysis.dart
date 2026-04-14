class Suggestion {
  final String suggestionId;
  final String category;
  final String message;
  final int score;

  Suggestion({
    required this.suggestionId,
    required this.category,
    required this.message,
    required this.score,
  });

  factory Suggestion.fromJson(Map<String, dynamic> json) {
    return Suggestion(
      suggestionId: json["suggestionId"],
      category: json["category"],
      message: json["message"],
      score: json["score"],
    );
  }
}

class ResumeAnalysis {
  final int overallScore;
  final String detectedField;
  final List<String> roleMatches;
  final List<Suggestion> suggestions;

  ResumeAnalysis({
    required this.overallScore,
    required this.detectedField,
    required this.roleMatches,
    required this.suggestions,
  });

  factory ResumeAnalysis.fromJson(Map<String, dynamic> json) {
    return ResumeAnalysis(
      overallScore: json["overallScore"],
      detectedField: json["detectedField"],
      roleMatches: List<String>.from(json["roleMatches"] ?? []),
      suggestions: (json["suggestions"] as List)
          .map((s) => Suggestion.fromJson(s))
          .toList(),
    );
  }
}
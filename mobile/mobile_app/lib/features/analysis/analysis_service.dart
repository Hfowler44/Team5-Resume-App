import 'dart:convert';
import '../../utils/api_service.dart';
import 'resume_analysis.dart';

class AnalysisService {
  static Future<ResumeAnalysis?> getSuggestions(String resumeId) async {
    String url =
        'http://wannadoservers.com/api/resumes/$resumeId/suggestions';
    final data = await ApiService.get(url);
    if(data == null|| data.isEmpty) return null;
    return ResumeAnalysis.fromJson(data[0]);
  }
}
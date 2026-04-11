import 'dart:convert';
import '../../utils/api_service.dart';
import 'resume_analysis.dart';

class AnalysisService {
  static Future<AnalysisResult?> getSuggestions(String resumeId) async {
    String url =
        'http://resume.wannadoservers.com/api/resumes/$resumeId/suggestions';

    String ret = await ApiService.get(url);

    if (ret.isEmpty) return null;

    List data = json.decode(ret);

    if (data.isEmpty) return null;

    return ResumeAnalysis.fromJson(data[0]);
  }
}
import '../../utils/api_service.dart';
import 'job_match.dart';

class JobMatchService {
  static const String _baseUrl = 'http://resume.wannadoservers.com/api/jobs';

  static Uri _matchUri(String resumeId, {String search = ''}) {
    final trimmed = search.trim();

    return Uri.parse('$_baseUrl/match/$resumeId').replace(
      queryParameters: trimmed.isEmpty ? null : {'search': trimmed},
    );
  }

  static Future<List<JobMatchResult>> getJobMatches(
    String resumeId, {
    String search = '',
  }) async {
    final data = await ApiService.get(_matchUri(resumeId, search: search).toString());
    if (data is! List) return [];

    return data
        .whereType<Map>()
        .map((entry) => JobMatchResult.fromJson(Map<String, dynamic>.from(entry)))
        .toList();
  }

  static Future<List<JobMatchResult>> refreshJobMatches(
    String resumeId, {
    String search = '',
  }) async {
    final data = await ApiService.post(
      _matchUri(resumeId, search: search).toString(),
      {},
    );
    if (data is! List) return [];

    return data
        .whereType<Map>()
        .map((entry) => JobMatchResult.fromJson(Map<String, dynamic>.from(entry)))
        .toList();
  }
}

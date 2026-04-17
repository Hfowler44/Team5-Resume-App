import '../../utils/api_service.dart';
import 'job_match.dart';

class JobMatchService {
  static Uri _buildUri(String resumeId, {String search = ''}) {
    final normalizedSearch = search.trim();
    return Uri.parse('http://wannadoservers.com/api/jobs/match/$resumeId')
        .replace(
      queryParameters: normalizedSearch.isEmpty
          ? null
          : {'search': normalizedSearch},
    );
  }

  static List<JobMatchResult> _parseMatches(dynamic data) {
    if (data == null || data is! List) return [];

    return data.map((e) {
      return JobMatchResult.fromJson(
        Map<String, dynamic>.from(e),
      );
    }).toList();
  }

  static Future<List<JobMatchResult>> getJobMatches(
    String resumeId, {
    String search = '',
  }) async {
    final data = await ApiService.get(
      _buildUri(resumeId, search: search).toString(),
    );

    print("JOB MATCH RAW: $data");

    return _parseMatches(data);
  }

  static Future<List<JobMatchResult>> matchJobs(
    String resumeId, {
    String search = '',
  }) async {
    final data = await ApiService.post(
      _buildUri(resumeId, search: search).toString(),
      {},
    );

    print("JOB MATCH RAW: $data");

    return _parseMatches(data);
  }
}

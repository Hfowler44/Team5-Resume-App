import '../../utils/api_service.dart';
import 'job_match.dart';

class JobMatchService {
  static Future<List<JobMatchResult>> getJobMatches(String resumeId) async {
    final url = 'http://wannadoservers.com/api/jobs/match/$resumeId';
    final data = await ApiService.post(url, {});

    print("JOB MATCH RAW: $data");

    if (data == null || data is! List) return [];

    return data.map((e) {
      return JobMatchResult.fromJson(
        Map<String, dynamic>.from(e),
      );
    }).toList();
  }
}
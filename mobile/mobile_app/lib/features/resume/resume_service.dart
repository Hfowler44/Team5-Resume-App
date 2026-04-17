import 'dart:io';
import '../../utils/api_service.dart';
import 'resume.dart';
import 'resume_version.dart';

class ResumeService {

  static Future<List<Resume>> getResumes() async {
    String url = 'http://wannadoservers.com/api/resumes';
    final data = await ApiService.get(url);

    print("GET RESUMES RESPONSE: $data");

    if (data == null || data is! List) return [];

    return data
        .map((e) => Resume.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }



  static Future<Resume?> getResumeById(String id) async {
    final url = 'http://wannadoservers.com/api/resumes/$id';
    final data = await ApiService.get(url);

    print("GET RESUME BY ID RAW: $data");

    if (data == null) return null;

    if (data is List && data.isNotEmpty) {
      return Resume.fromJson(Map<String, dynamic>.from(data[0]));
    }

    if (data is Map) {
      return Resume.fromJson(Map<String, dynamic>.from(data));
    }

    return null;
  }

  static Future<bool> uploadResume(File file) async {
    String url = 'http://wannadoservers.com/api/resumes';
    final response = await ApiService.uploadFile(url, file);

    print("UPLOAD RESPONSE: $response");

    return response != null;
  }

  static Future<bool> analyzeResume(String id) async {
    String url = 'http://wannadoservers.com/api/resumes/$id/analyze';
    final response = await ApiService.post(url, {});

    print("ANALYZE RESPONSE: $response");

    return response != null;
  }

  static Future<bool> deleteResume(String id) async {
    String url = 'http://wannadoservers.com/api/resumes/$id';
    final response = await ApiService.delete(url);

    print("DELETE RESPONSE: $response");

    return response != null;
  }

  static Future<List<ResumeVersion>> getVersions(String resumeId) async {
    final url = 'http://wannadoservers.com/api/resumes/$resumeId/versions';
    final data = await ApiService.get(url);

    print("VERSIONS RESPONSE: $data");

    if (data == null || data is! List) return [];

    return data
        .map((e) => ResumeVersion.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
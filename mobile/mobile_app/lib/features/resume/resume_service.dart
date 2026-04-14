import 'dart:io';
import '../../utils/api_service.dart';
import 'resume.dart';

class ResumeService {
  static Future<List<Resume>> getResumes() async {
    String url = 'http://resume.wannadoservers.com/api/resumes';
    final data = await ApiService.get(url);

    print("GET RESUMES RESPONSE: $data");

    if(data == null) return[];
    return (data as List).map((e) => Resume.fromJson(e)).toList();
  }

  static Future<bool> uploadResume(File file) async {
    String url = 'http://resume.wannadoservers.com/api/resumes';
    final response = await ApiService.uploadFile(url, file);

    print("UPLOAD RESPONSE: $response");

    return response != null;
  }

  static Future<bool> analyzeResume(String id) async {
    String url = 'http://resume.wannadoservers.com/api/resumes/$id/analyze';
    final response = await ApiService.post(url, {});
    return response != null;
  }

  static Future<bool> deleteResume(String id) async {
    String url = 'http://resume.wannadoservers.com/api/resumes/$id';
    final response = await ApiService.delete(url);
    return response != null;
  }
}
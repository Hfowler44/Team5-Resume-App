import 'dart:convert';
import '../../utils/api_service.dart';
import 'resume.dart';

class ResumeService {
  static Future<List<Resume>> getResumes() async {
    String url = 'http://resume.wannadoservers.com/api/resumes';

    String ret = await ApiService.get(url);

    if (ret.isEmpty) return [];

    List data = json.decode(ret);

    return data.map((e) => Resume.fromJson(e)).toList();
  }
}
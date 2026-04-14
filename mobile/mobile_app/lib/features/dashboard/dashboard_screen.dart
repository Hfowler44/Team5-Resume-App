import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../resume/resume_service.dart';
import '../resume/resume.dart';
import '../resume/resume_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}
class _DashboardScreenState extends State<DashboardScreen> {
  List<Resume> resumes = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadResumes();
  }

  Future<void> loadResumes() async {
    final data = await ResumeService.getResumes();
    setState(() {resumes = data; isLoading = false;});
  }

  Future<void> pickAndUploadResume() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],);

    if (result == null) return;

    File file = File(result.files.single.path!);
    if (!file.path.toLowerCase().endsWith('pdf')) {
      print("File is not a PDF");
      return;
    }
    final success = await ResumeService.uploadResume(file);

    if(success) await loadResumes();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Your Dashboard')),
      floatingActionButton: FloatingActionButton(
        onPressed: pickAndUploadResume,
        child: Icon(Icons.upload_file),
      ),

      body: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Column(
                children: [
                  Icon(Icons.description, size: 40),
                  SizedBox(height: 10),
                  Text('Your Resumes'),
                ],
              ),
            ),
            SizedBox(height: 16),

            Expanded(
              child: resumes.isEmpty
                ? Center(child: Text("No resumes"))
                : ListView.builder(
                    itemCount: resumes.length,
                    itemBuilder: (context, index) {
                      final resume = resumes[index];
                      return Card(
                        margin: EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          title: Text(resume.fileName),
                          subtitle: Text("Status: ${resume.status}"),

                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ResumeDetailScreen(resume: resume),
                              ),
                            );
                          },

                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [

                              IconButton(
                                icon: Icon(Icons.analytics),
                                onPressed: () async {
                                  await ResumeService.analyzeResume(resume.id);
                                  await loadResumes();
                                },
                              ),

                              IconButton(
                                icon: Icon(Icons.delete, color: Colors.red),
                                onPressed: () async {
                                  await ResumeService.deleteResume(resume.id);
                                  await loadResumes();
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
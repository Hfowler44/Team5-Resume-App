import 'package:flutter/material.dart';
import '../analysis/analysis_service.dart';
import '../analysis/resume_analysis.dart';
import 'resume.dart';
import 'resume_service.dart';

class ResumeDetailScreen extends StatefulWidget {
  final Resume resume;
  const ResumeDetailScreen({required this.resume});

  @override
  _ResumeDetailScreenState createState() => _ResumeDetailScreenState();
}

class _ResumeDetailScreenState extends State<ResumeDetailScreen> {
  ResumeAnalysis? analysis;
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    loadAnalysis();
  }

  Future<void> loadAnalysis() async {
    final result = await AnalysisService.getSuggestions(widget.resume.id);
    setState((){analysis = result; isLoading = false;});
  }

  @override
  Widget build(BuildContext context) {
    final resume = widget.resume;

    return Scaffold(
      appBar: AppBar(title: Text(resume.fileName)),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: isLoading
          ? Center(child: CircularProgressIndicator())
          : ListView(padding: EdgeInsets.all(16),
              children: [

                Text("Status: ${resume.status}"),
                SizedBox(height: 16),

                if (analysis == null)
                  ElevatedButton(
                    onPressed: () async {
                      await ResumeService.analyzeResume(resume.id);
                      await loadAnalysis();
                    },
                    child: Text("Run Analysis"),
                  ),

                if (analysis != null) ...[
                  Text( "Score: ${analysis!.overallScore}",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 16),

                  Text("Suggestions:"),

                  ...analysis!.suggestions.map((s) => ListTile(
                    title: Text(s.message),
                    subtitle: Text(s.category),
                  )),
                ],
              ],
          ),

      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../analysis/analysis_service.dart';
import '../analysis/resume_analysis.dart';
import 'resume.dart';
import 'resume_service.dart';
import 'job_match.dart';
import 'job_match_service.dart';
import 'resume_version.dart';

class ResumeDetailScreen extends StatefulWidget {
  final Resume resume;
  const ResumeDetailScreen({required this.resume});

  @override
  State<ResumeDetailScreen> createState() => _ResumeDetailScreenState();
}

class _ResumeDetailScreenState extends State<ResumeDetailScreen> {
  ResumeAnalysis? analysis;
  bool isLoading = true;
  bool isAnalyzing = false;
  List<ResumeVersion> versions = [];
  List<JobMatchResult> jobMatches = [];
  String? errorMessage;
  late Resume currentResume;

  @override
  void initState() {
    super.initState();
    currentResume = widget.resume;
    loadAnalysis();
  }

  Future<void> loadAnalysis() async {
    setState(() {
      isLoading = true;
      errorMessage = null;
    });

    ResumeAnalysis? analysisResult;
    List<ResumeVersion> versionResult = [];
    List<JobMatchResult> jobMatchResult = [];
    Resume? updatedResume;

    try {
      analysisResult =
      await AnalysisService.getSuggestions(currentResume.id);
    } catch (e) {
      print("ANALYSIS ERROR: $e");
    }

    try {
      versionResult =
      await ResumeService.getVersions(currentResume.id);
    } catch (e) {
      print("VERSIONS ERROR: $e");
    }

    try {
      jobMatchResult =
      await JobMatchService.getJobMatches(currentResume.id);
    } catch (e) {
      print("JOB MATCH ERROR: $e");
    }

    try {
      updatedResume =
      await ResumeService.getResumeById(currentResume.id);
    } catch (e) {
      print("RESUME ERROR: $e");
    }

    if (!mounted) return;

    setState(() {
      analysis = analysisResult;
      versions = versionResult;
      jobMatches = jobMatchResult;
      currentResume = updatedResume ?? currentResume;
      isLoading = false;
    });
  }

  Future<void> runAnalysis() async {
    if (isAnalyzing) return;

    setState(() => isAnalyzing = true);

    try {
      await ResumeService.analyzeResume(currentResume.id);
      await loadAnalysis();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Analysis refreshed.")),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Could not run analysis.")),
      );
    } finally {
      if (mounted) {
        setState(() => isAnalyzing = false);
      }
    }
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) return "—";
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ];
    return "${months[dt.month - 1]} ${dt.day}";
  }

  String _prettyStatus(String status) {
    if (status.isEmpty) return "Unknown";
    return "${status[0].toUpperCase()}${status.substring(1)}";
  }

  Color _scoreColor(int score) {
    if (score >= 80) return Colors.green;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }

  List<String> _skillLabels() {
    final parsed = currentResume.parsed;
    final skills = parsed?["skills"];
    if (skills is! List) return const [];

    return skills
        .map((skill) {
      if (skill is Map) {
        final value = skill["name"] ?? skill["label"] ?? skill["skill"];
        return value?.toString() ?? "";
      }
      return skill?.toString() ?? "";
    })
        .where((label) => label.trim().isNotEmpty)
        .toList();
  }

  String _absolutePdfUrl(String fileUrl) {
    if (fileUrl.isEmpty) return "";
    if (fileUrl.startsWith("http:") || fileUrl.startsWith("https://")) {
      return fileUrl;
    }
    return "http://wannadoservers.com$fileUrl";
  }

  Future<void> _copyToClipboard(String text, String successMessage) async {
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Nothing to copy.")),
      );
      return;
    }

    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(successMessage)),
    );
  }

  void _showSuggestionDetails(Suggestion suggestion) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                suggestion.category.toUpperCase(),
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade600,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                suggestion.message,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  _pill(
                    label: "Score ${suggestion.score}",
                    background: Colors.black12,
                    foreground: Colors.black87,
                  ),
                  const SizedBox(width: 10),
                  _pill(
                    label: suggestion.category,
                    background: Colors.black12,
                    foreground: Colors.black87,
                  ),
                ],
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("Done"),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _pill({
    required String label,
    required Color background,
    required Color foreground,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _sectionCard({
    required String title,
    required IconData icon,
    required Widget child,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 18, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _buildAnalysisSection() {
    if (analysis == null) {
      return _sectionCard(
        title: "Analysis",
        icon: Icons.auto_awesome,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Text(
            "Run analysis to generate a score, role matches, and suggestions.",
            style: TextStyle(
              color: Colors.grey.shade700,
              height: 1.4,
            ),
          ),
        ),
      );
    }

    final score = analysis!.overallScore;
    final roles = analysis!.roleMatches;
    final suggestions = analysis!.suggestions;

    return _sectionCard(
      title: "Analysis",
      icon: Icons.auto_awesome,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                height: 74,
                width: 74,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _scoreColor(score).withOpacity(0.12),
                ),
                alignment: Alignment.center,
                child: Text(
                  "$score",
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: _scoreColor(score),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      analysis!.detectedField,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      "Resume analysis score and primary field detected by the backend.",
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        height: 1.35,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            "Recommended Roles",
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Colors.grey.shade800,
            ),
          ),
          const SizedBox(height: 10),
          if (roles.isEmpty)
            Text(
              "No role matches returned.",
              style: TextStyle(color: Colors.grey.shade600),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: roles
                  .map(
                    (role) => Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Text(
                    role,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              )
                  .toList(),
            ),
          const SizedBox(height: 18),
          Text(
            "Suggestions",
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Colors.grey.shade800,
            ),
          ),
          const SizedBox(height: 10),
          if (suggestions.isEmpty)
            Text(
              "No suggestions returned.",
              style: TextStyle(color: Colors.grey.shade600),
            )
          else
            Column(
              children: suggestions.map((s) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: ListTile(
                    onTap: () => _showSuggestionDetails(s),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 4,
                    ),
                    leading: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: _scoreColor(s.score).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        "${s.score}",
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: _scoreColor(s.score),
                        ),
                      ),
                    ),
                    title: Text(
                      s.message,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        s.category.toUpperCase(),
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade600,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                  ),
                );
              }).toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildSkillsSection(List<String> skills) {
    return _sectionCard(
      title: "Parsed Skills",
      icon: Icons.check_circle_outline,
      child: skills.isEmpty
          ? Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Text(
          "No parsed skills available yet.",
          style: TextStyle(color: Colors.grey.shade700),
        ),
      )
          : Wrap(
        spacing: 8,
        runSpacing: 8,
        children: skills
            .map(
              (skill) => Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 8,
            ),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Text(
              skill,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        )
            .toList(),
      ),
    );
  }

  Widget _buildJobMatchesSection() {
    return _sectionCard(
      title: "Job Matches",
      icon: Icons.work_outline,
      child: jobMatches.isEmpty
          ? Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Text(
          "No job matches returned yet.",
          style: TextStyle(color: Colors.grey.shade700),
        ),
      )
          : Column(
        children: jobMatches.map((match) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: ListTile(
              onTap: () {
                final url = match.job.jobUrl;
                if (url.isNotEmpty) {
                  _copyToClipboard(
                    url,
                    "Job URL copied to clipboard.",
                  );
                }
              },
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 6,
              ),
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.badge_outlined,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              title: Text(
                match.job.title,
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              subtitle: Text(
                "${match.job.company} • ${match.job.location}",
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade700,
                ),
              ),
              trailing: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: _scoreColor(match.matchScore).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  "${match.matchScore}%",
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: _scoreColor(match.matchScore),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildVersionsSection() {
    return _sectionCard(
      title: "Version History",
      icon: Icons.history,
      child: versions.isEmpty
          ? Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Text(
          "No versions yet. Run analysis to create version history.",
          style: TextStyle(color: Colors.grey.shade700),
        ),
      )
          : Column(
        children: versions.map((v) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 6,
              ),
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.description_outlined,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              title: Text(
                "Version ${v.versionNumber}",
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              subtitle: Text(
                v.changeSummary,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade700,
                ),
              ),
              trailing: Text(
                "+${v.improvementScore}",
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildHeaderCard(Resume resume, String updatedLabel) {
    final status = _prettyStatus(resume.status);
    final analysisScore = analysis?.overallScore;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            resume.fileName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _pill(
                label: "Status: $status",
                background: Colors.white.withOpacity(0.12),
                foreground: Colors.white,
              ),
              _pill(
                label: "Updated: $updatedLabel",
                background: Colors.white.withOpacity(0.12),
                foreground: Colors.white,
              ),
              if (analysisScore != null)
                _pill(
                  label: "Score: $analysisScore",
                  background: _scoreColor(analysisScore).withOpacity(0.2),
                  foreground: Colors.white,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionRow(Resume resume) {
    final pdfUrl = _absolutePdfUrl(resume.fileUrl);

    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: isAnalyzing ? null : runAnalysis,
            icon: isAnalyzing
                ? const SizedBox(
              height: 18,
              width: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
                : const Icon(Icons.auto_awesome),
            label: Text(
              analysis == null ? "Run Analysis" : "Re-run Analysis",
            ),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        OutlinedButton.icon(
          onPressed: pdfUrl.isEmpty
              ? null
              : () => _copyToClipboard(
            pdfUrl,
            "PDF link copied to clipboard.",
          ),
          icon: const Icon(Icons.link),
          label: const Text("Copy PDF"),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 14,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final resume = currentResume;
    final updatedLabel = _formatDate(resume.updatedAt ?? resume.createdAt);
    final skills = _skillLabels();

    return Scaffold(
      appBar: AppBar(
        title: Text(resume.fileName),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
        onRefresh: loadAnalysis,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeaderCard(resume, updatedLabel),
              const SizedBox(height: 16),
              _buildActionRow(resume),
              if (errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.red.shade100),
                  ),
                  child: Text(
                    errorMessage!,
                    style: TextStyle(
                      color: Colors.red.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              _buildAnalysisSection(),
              const SizedBox(height: 16),
              _buildSkillsSection(skills),
              const SizedBox(height: 16),
              _buildJobMatchesSection(),
              const SizedBox(height: 16),
              _buildVersionsSection(),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
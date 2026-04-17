import 'dart:async';

import 'package:flutter/material.dart';

import '../analysis/analysis_service.dart';
import '../analysis/resume_analysis.dart';
import 'job_match.dart';
import 'job_match_service.dart';
import 'resume.dart';
import 'resume_service.dart';

class ResumeDetailScreen extends StatefulWidget {
  final Resume resume;

  const ResumeDetailScreen({super.key, required this.resume});

  @override
  State<ResumeDetailScreen> createState() => _ResumeDetailScreenState();
}

class _ResumeDetailScreenState extends State<ResumeDetailScreen> {
  ResumeAnalysis? analysis;
  bool isLoadingAnalysis = true;
  bool isRunningAnalysis = false;

  List<JobMatchResult> jobMatches = [];
  bool isLoadingJobMatches = true;
  bool isRefreshingJobMatches = false;
  String jobMatchSearch = '';
  String appliedJobMatchSearch = '';
  Timer? searchDebounce;

  @override
  void initState() {
    super.initState();
    loadAnalysis();
    loadJobMatches();
  }

  @override
  void dispose() {
    searchDebounce?.cancel();
    super.dispose();
  }

  Future<void> loadAnalysis() async {
    final result = await AnalysisService.getSuggestions(widget.resume.id);
    if (!mounted) return;

    setState(() {
      analysis = result;
      isLoadingAnalysis = false;
    });
  }

  Future<void> runAnalysis() async {
    if (isRunningAnalysis) return;

    setState(() => isRunningAnalysis = true);

    try {
      await ResumeService.analyzeResume(widget.resume.id);
      await loadAnalysis();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Analysis refreshed.")),
      );
    } finally {
      if (mounted) {
        setState(() => isRunningAnalysis = false);
      }
    }
  }

  Future<void> loadJobMatches({String? search}) async {
    final nextSearch = (search ?? jobMatchSearch).trim();

    setState(() {
      isLoadingJobMatches = true;
    });

    final results = await JobMatchService.getJobMatches(
      widget.resume.id,
      search: nextSearch,
    );

    if (!mounted) return;

    setState(() {
      jobMatches = results;
      appliedJobMatchSearch = nextSearch;
      isLoadingJobMatches = false;
    });
  }

  Future<void> refreshJobMatches() async {
    if (isRefreshingJobMatches) return;

    setState(() {
      isRefreshingJobMatches = true;
    });

    final results = await JobMatchService.refreshJobMatches(
      widget.resume.id,
      search: jobMatchSearch,
    );

    if (!mounted) return;

    setState(() {
      jobMatches = results;
      appliedJobMatchSearch = jobMatchSearch.trim();
      isRefreshingJobMatches = false;
      isLoadingJobMatches = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Job matches refreshed.")),
    );
  }

  void onJobSearchChanged(String value) {
    setState(() {
      jobMatchSearch = value;
    });

    searchDebounce?.cancel();
    searchDebounce = Timer(const Duration(milliseconds: 350), () {
      loadJobMatches(search: value);
    });
  }

  Color scoreColor(int score) {
    if (score >= 80) return Colors.green;
    if (score >= 60) return Colors.orange;
    return Colors.red;
  }

  Widget buildJobMatchesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                "Job Matches",
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            OutlinedButton(
              onPressed: isRefreshingJobMatches ? null : refreshJobMatches,
              child: Text(
                isRefreshingJobMatches ? "Refreshing..." : "Refresh",
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextField(
          onChanged: onJobSearchChanged,
          decoration: InputDecoration(
            hintText: "Search company, title, skills, or reasoning",
            prefixIcon: const Icon(Icons.search),
            suffixIcon: jobMatchSearch.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      onJobSearchChanged('');
                    },
                  ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (isLoadingJobMatches)
          const Center(child: CircularProgressIndicator())
        else if (jobMatches.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              appliedJobMatchSearch.isEmpty
                  ? "No job matches found yet. Tap Refresh to generate matches."
                  : 'No job matches found for "$appliedJobMatchSearch".',
              style: TextStyle(color: Colors.grey.shade700),
            ),
          )
        else
          ...jobMatches.map(
            (match) => Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                match.job.title.isEmpty
                                    ? "Untitled role"
                                    : match.job.title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              if (match.job.company.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  match.job.company,
                                  style: TextStyle(color: Colors.grey.shade700),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: scoreColor(match.matchScore).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            "${match.matchScore}% match",
                            style: TextStyle(
                              color: scoreColor(match.matchScore),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (match.job.location.isNotEmpty || match.job.source.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        [
                          if (match.job.location.isNotEmpty) match.job.location,
                          if (match.job.source.isNotEmpty) match.job.source,
                        ].join(" • "),
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ],
                    if (match.job.description.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(match.job.description),
                    ],
                    if (match.job.requiredSkills.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: match.job.requiredSkills
                            .take(6)
                            .map(
                              (skill) => Chip(
                                label: Text(skill.name),
                                visualDensity: VisualDensity.compact,
                              ),
                            )
                            .toList(),
                      ),
                    ],
                    if (match.reasoning.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        match.reasoning,
                        style: TextStyle(color: Colors.grey.shade800),
                      ),
                    ],
                    if (match.missingSkills.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        "Missing skills: ${match.missingSkills.join(", ")}",
                        style: TextStyle(color: Colors.grey.shade700),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final resume = widget.resume;

    return Scaffold(
      appBar: AppBar(title: Text(resume.fileName)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: isLoadingAnalysis
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                children: [
                  Text("Status: ${resume.status}"),
                  const SizedBox(height: 16),
                  if (analysis == null)
                    ElevatedButton(
                      onPressed: isRunningAnalysis ? null : runAnalysis,
                      child: Text(
                        isRunningAnalysis ? "Running..." : "Run Analysis",
                      ),
                    ),
                  if (analysis != null) ...[
                    Text(
                      "Score: ${analysis!.overallScore}",
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text("Suggestions:"),
                    const SizedBox(height: 8),
                    ...analysis!.suggestions.map(
                      (suggestion) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(suggestion.message),
                        subtitle: Text(suggestion.category),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                  buildJobMatchesSection(),
                ],
              ),
      ),
    );
  }
}

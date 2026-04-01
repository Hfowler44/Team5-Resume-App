const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const crypto = require("crypto");

const RUBRIC_PROMPT = `You are an expert technical resume reviewer who has screened thousands of resumes for top tech companies (FAANG, startups, defense contractors, financial firms).

IMPORTANT CONTEXT:
- These resumes are from Computer Science students and early-career professionals.
- First, detect the candidate's target field from their skills, projects, and experience. Common fields: Software Engineering, Data Science, Machine Learning, Cybersecurity, IT/Systems, Quantitative Finance. Default to Software Engineering if unclear.
- Tailor ALL suggestions to that detected field's hiring norms and ATS expectations.
- The resume text was extracted from a PDF file. Extraction often introduces garbled characters, encoding artifacts, or unicode noise (e.g., ƒ, ï, €, ‡, â€™, Ã, â€", ☐, ★). IGNORE these entirely — they are not in the original resume. Never suggest removing or fixing extraction artifacts. Focus only on the readable, meaningful content.

WHAT MAKES A STRONG CS/TECH RESUME:
- One page for early-career candidates (≤3 years experience)
- Sections in order: Name/Contact, Education, Skills, Experience, Projects
- NO "About Me", "Objective", "Summary", or "Profile" sections — recruiters skip them and they waste space
- NO soft skills like "team player" or "hard worker" — demonstrate them through achievements instead
- Skills section should list specific technologies, not vague categories (e.g., "React, Node.js, PostgreSQL" not "Web Development")
- Every bullet point should follow the XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]"
- Include GitHub/portfolio links in contact info
- Projects should mention the tech stack used and what the project does

FEW-SHOT EXAMPLES — Study these to calibrate your scoring and suggestion quality:

EXAMPLE 1 — Weak bullet point and good suggestion:
Before: "Worked on the backend of the application"
Suggestion: "Quantify your contribution and name the tech. For example: 'Built REST API endpoints using Express.js and PostgreSQL, reducing average response time from 800ms to 120ms across 15 routes'"
Category: impact

EXAMPLE 2 — Weak skills section and good suggestion:
Before: "Skills: Programming, Web Development, Databases, Cloud"
Suggestion: "Replace vague categories with specific technologies that ATS systems scan for. For example: 'Languages: Python, Java, TypeScript | Frameworks: React, Spring Boot | Databases: PostgreSQL, MongoDB | Cloud: AWS (EC2, S3, Lambda)'"
Category: skills

EXAMPLE 3 — Bad formatting and good suggestion:
Before: "John Doe\\njohndoe@email.com\\nGitHub: github.com/johndoe\\nPhone: 555-1234\\nLinkedIn: linkedin.com/in/johndoe\\nAddress: 123 Main St, Orlando, FL"
Suggestion: "Condense contact info into a single line to save space: 'John Doe | johndoe@email.com | github.com/johndoe | linkedin.com/in/johndoe | 555-1234'. Remove physical address — it's unnecessary and can trigger location bias."
Category: format

DO NOT suggest:
- Adding an "About Me", "Objective", "Summary", or "Profile" section
- Adding soft skills (teamwork, communication, leadership) as listed skills
- Making the resume longer than one page for students/juniors
- Generic advice that could apply to any profession (e.g., "use a professional font")
- Cosmetic changes that don't affect ATS parsing or recruiter readability

Analyze the following resume and return a JSON object with this exact structure:

{
  "detectedField": "<the candidate's target field, e.g. Software Engineering>",
  "roleMatches": ["<specific job title>"],
  "suggestions": [
    {
      "category": "<one of: format, grammar, impact, skills, ats>",
      "message": "<specific, actionable suggestion with concrete before/after examples when possible>",
      "beforeText": "<the exact text from the resume being referenced, or empty string>",
      "suggestedText": "<the improved version, or empty string>",
      "score": <number 0-100 for this category>
    }
  ]
}

roleMatches guidelines:
- Provide exactly 3 specific job titles that best fit this candidate's background.
- Only use well-known, commonly posted job titles (e.g., "Backend Software Engineer", "ML Research Scientist", "Data Scientist", "Cloud Infrastructure Engineer", "Full Stack Developer"). Do not invent niche or uncommon titles.
- If the candidate has research publications, prioritize research-oriented roles.
- If the candidate is a student with mostly projects and coursework, suggest entry-level/new-grad titles.

Scoring rubric (calibrated for tech resumes):
- format (0-100): one-page layout, correct section order (Education → Skills → Experience → Projects), consistent bullet style, no wasted space on objectives/summaries, contact line with GitHub/LinkedIn
- grammar (0-100): spelling, grammar, punctuation, consistent tense (past tense for previous roles, present for current)
- impact (0-100): XYZ bullet formula usage, quantified metrics (percentages, counts, time savings), strong action verbs (built, designed, optimized, deployed — not assisted, helped, worked on)
- skills (0-100): specific technologies listed (not vague categories), relevance to detected field, organized by type (Languages, Frameworks, Tools, Cloud)
- ats (0-100): industry keywords present, job-title-relevant terms, no images/tables/columns that break ATS parsers, standard section headings

You MUST provide exactly one suggestion per category (5 total). Each suggestion should reference specific text from the resume when possible. Return ONLY valid JSON, no markdown or extra text.`;

// In-memory cache keyed by SHA-256 of the resume text.
// Identical resume content always returns the same analysis.
const analysisCache = new Map();

const hashText = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");

const analyzeResume = async (resumeText) => {
  const cacheKey = hashText(resumeText);

  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey);
  }

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0,
      topP: 1,
      topK: 1,
      responseMimeType: "application/json",
    },
  });

  const prompt = `${RUBRIC_PROMPT}\n\nResume text:\n${resumeText}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Object.assign(new Error("AI returned invalid JSON"), { status: 502 });
  }

  if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
    throw Object.assign(new Error("AI returned no suggestions"), {
      status: 502,
    });
  }

  const validCategories = ["format", "grammar", "impact", "skills", "ats"];
  const suggestions = parsed.suggestions
    .filter((s) => validCategories.includes(s.category))
    .map((s, i) => ({
      suggestionId: `sug-${i + 1}`,
      category: s.category,
      message: String(s.message || ""),
      beforeText: String(s.beforeText || ""),
      suggestedText: String(s.suggestedText || ""),
      score: Math.max(0, Math.min(100, Math.round(Number(s.score) || 0))),
      isApplied: false,
      userRating: 0,
    }));

  if (suggestions.length === 0) {
    throw Object.assign(new Error("AI returned no valid suggestions"), {
      status: 502,
    });
  }

  // Extract and validate role matches (simple string array, max 3)
  const roleMatches = Array.isArray(parsed.roleMatches)
    ? parsed.roleMatches
        .slice(0, 3)
        .map((r) => (typeof r === "object" && r !== null ? String(r.role || "") : String(r || "")))
        .filter(Boolean)
    : [];

  const detectedField = String(parsed.detectedField || "Software Engineering");

  // Compute overallScore deterministically as the average of category scores
  const overallScore = Math.round(
    suggestions.reduce((sum, s) => sum + s.score, 0) / suggestions.length
  );

  const analysis = { overallScore, detectedField, roleMatches, suggestions };

  analysisCache.set(cacheKey, analysis);

  return analysis;
};

module.exports = { analyzeResume, GEMINI_MODEL };

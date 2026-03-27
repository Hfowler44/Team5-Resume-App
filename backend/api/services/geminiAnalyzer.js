const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const RUBRIC_PROMPT = `You are a professional resume reviewer. Analyze the following resume text and return a JSON object with this exact structure:

{
  "overallScore": <number 0-100>,
  "suggestions": [
    {
      "category": "<one of: format, grammar, impact, skills, ats>",
      "message": "<actionable improvement suggestion>",
      "beforeText": "<the original text being referenced, if applicable, or empty string>",
      "suggestedText": "<the improved version, if applicable, or empty string>",
      "score": <number 0-100 for this category>
    }
  ]
}

Scoring rubric:
- format (0-100): layout clarity, section organization, consistent formatting
- grammar (0-100): spelling, grammar, punctuation correctness
- impact (0-100): quantified achievements, action verbs, measurable outcomes
- skills (0-100): relevant technical and soft skills, specificity
- ats (0-100): keyword optimization for Applicant Tracking Systems

Provide 3-8 suggestions covering different categories. The overallScore should be the weighted average of category scores. Return ONLY valid JSON, no markdown or extra text.`;

const analyzeResume = async (resumeText) => {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.3,
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

  // Validate shape
  if (
    typeof parsed.overallScore !== "number" ||
    parsed.overallScore < 0 ||
    parsed.overallScore > 100
  ) {
    throw Object.assign(new Error("AI returned invalid overallScore"), {
      status: 502,
    });
  }

  if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
    throw Object.assign(new Error("AI returned no suggestions"), {
      status: 502,
    });
  }

  const validCategories = ["format", "grammar", "impact", "skills", "ats"];
  const suggestions = parsed.suggestions.map((s, i) => ({
    suggestionId: `sug-${i + 1}`,
    category: validCategories.includes(s.category) ? s.category : "format",
    message: String(s.message || ""),
    beforeText: String(s.beforeText || ""),
    suggestedText: String(s.suggestedText || ""),
    score: Math.max(0, Math.min(100, Math.round(Number(s.score) || 0))),
    isApplied: false,
    userRating: 0,
  }));

  return {
    overallScore: Math.max(
      0,
      Math.min(100, Math.round(parsed.overallScore))
    ),
    suggestions,
  };
};

module.exports = { analyzeResume, GEMINI_MODEL };

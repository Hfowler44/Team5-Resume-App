const { parseResume } = require("./resumeParser");

const normalize = (value) => String(value || "").toLowerCase().trim();

const CATEGORY_SIGNAL_MAP = [
  {
    pattern: /software engineering/i,
    signals: ["Software Engineering", "Backend", "Frontend", "Full Stack"],
  },
  {
    pattern: /data|machine learning|ai/i,
    signals: ["Machine Learning", "Data Science", "Artificial Intelligence", "Python"],
  },
  {
    pattern: /hardware|embedded/i,
    signals: ["Embedded Systems", "C++", "Python"],
  },
  {
    pattern: /cyber/i,
    signals: ["Cybersecurity", "Python", "Linux"],
  },
];

const uniqueNames = (names) => {
  const seen = new Set();
  const result = [];

  for (const name of names) {
    const key = normalize(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(String(name).trim());
  }

  return result;
};

const deriveJobText = (job) =>
  [
    job.title,
    job.category,
    job.description,
    ...(Array.isArray(job.tags) ? job.tags : []),
    ...(Array.isArray(job.terms) ? job.terms : []),
  ]
    .filter(Boolean)
    .join("\n");

const extractJobSkills = (job) => {
  const derivedText = deriveJobText(job);
  const parsedSkills = parseResume(derivedText).skills.map((skill) => skill.name);
  const categorySignals = CATEGORY_SIGNAL_MAP.filter(
    (entry) =>
      entry.pattern.test(job.category || "") || entry.pattern.test(job.title || "")
  ).flatMap((entry) => entry.signals);

  const names = uniqueNames([
    ...(Array.isArray(job.tags) ? job.tags : []),
    ...parsedSkills,
    ...categorySignals,
  ]).slice(0, 10);

  const weight = names.length > 0 ? 1 / names.length : 1;
  return names.map((name) => ({ name, weight }));
};

const buildResumeSignalSet = (resume) => {
  const parsedSkillNames = Array.isArray(resume?.parsed?.skills)
    ? resume.parsed.skills.map((skill) => skill.name)
    : [];
  const textSkillNames = parseResume(resume?.textExtracted || "").skills.map(
    (skill) => skill.name
  );

  return new Set(uniqueNames([...parsedSkillNames, ...textSkillNames]).map(normalize));
};

const calculateSkillScore = (resume, jobSkills) => {
  let score = 0;
  let totalWeight = 0;
  const missingSkills = [];
  const matchedSkills = [];

  const resumeSet = buildResumeSignalSet(resume);

  for (const skill of jobSkills) {
    const weight = skill.weight || 1;
    totalWeight += weight;

    if (resumeSet.has(normalize(skill.name))) {
      score += weight;
      matchedSkills.push(skill.name);
    } else {
      missingSkills.push(skill.name);
    }
  }

  const finalScore =
    totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;

  return { finalScore, missingSkills, matchedSkills };
};

module.exports = {
  extractJobSkills,
  calculateSkillScore,
  buildResumeSignalSet,
};

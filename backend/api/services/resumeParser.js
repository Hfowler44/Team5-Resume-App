const SKILL_PATTERNS = [
  ["JavaScript", /\bjavascript\b|\bjs\b/i],
  ["TypeScript", /\btypescript\b|\bts\b/i],
  ["Python", /\bpython\b/i],
  ["Java", /\bjava\b/i],
  ["C++", /\bc\+\+\b/i],
  ["C#", /\bc#\b|\bcsharp\b/i],
  ["Go", /\bgolang\b|\bgo\b/i],
  ["Rust", /\brust\b/i],
  ["Swift", /\bswift\b/i],
  ["Kotlin", /\bkotlin\b/i],
  ["SQL", /\bsql\b/i],
  ["HTML", /\bhtml\b/i],
  ["CSS", /\bcss\b/i],
  ["React", /\breact\b/i],
  ["Next.js", /\bnext\.?js\b/i],
  ["Vue", /\bvue\b/i],
  ["Angular", /\bangular\b/i],
  ["Frontend", /\bfront[\s-]?end\b/i],
  ["Backend", /\bback[\s-]?end\b/i],
  ["Full Stack", /\bfull[\s-]?stack\b/i],
  ["Node.js", /\bnode\.?js\b/i],
  ["Express", /\bexpress\b/i],
  ["Django", /\bdjango\b/i],
  ["Flask", /\bflask\b/i],
  ["FastAPI", /\bfastapi\b/i],
  ["Spring", /\bspring\b/i],
  ["MongoDB", /\bmongodb\b/i],
  ["PostgreSQL", /\bpostgres(?:ql)?\b/i],
  ["MySQL", /\bmysql\b/i],
  ["Redis", /\bredis\b/i],
  ["Docker", /\bdocker\b/i],
  ["Kubernetes", /\bkubernetes\b|\bk8s\b/i],
  ["AWS", /\baws\b|\bamazon web services\b/i],
  ["Azure", /\bazure\b/i],
  ["GCP", /\bgcp\b|\bgoogle cloud\b/i],
  ["Git", /\bgit\b/i],
  ["GitHub", /\bgithub\b/i],
  ["Linux", /\blinux\b/i],
  ["Cloud Computing", /\bcloud\b/i],
  ["Software Engineering", /\bsoftware (engineer|engineering)\b/i],
  ["Machine Learning", /\bmachine learning\b|\bml\b/i],
  ["Data Science", /\bdata science\b/i],
  ["Artificial Intelligence", /\bartificial intelligence\b|\bai\b/i],
  ["Embedded Systems", /\bembedded\b/i],
  ["Cybersecurity", /\bcyber ?security\b/i],
  ["TensorFlow", /\btensorflow\b/i],
  ["PyTorch", /\bpytorch\b/i],
  ["OpenCV", /\bopencv\b/i],
  ["Pandas", /\bpandas\b/i],
  ["NumPy", /\bnumpy\b/i],
  ["Scikit-learn", /\bscikit-learn\b|\bsklearn\b/i],
];

const SECTION_ALIASES = {
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
  ],
  education: ["education", "academic background", "academics"],
};

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const normalizeText = (text) =>
  String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const toLines = (text) =>
  normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const isHeadingLine = (line) => {
  if (!line) return false;
  const trimmed = line.trim().replace(/[:|]/g, "");
  if (trimmed.length > 40) return false;
  return /^[A-Z][A-Z /&-]+$/.test(trimmed) || /^[A-Z][a-z]+(?: [A-Z][a-z]+){0,3}$/.test(trimmed);
};

const findSectionRange = (lines, aliases) => {
  const start = lines.findIndex((line) =>
    aliases.some((alias) => line.toLowerCase() === alias || line.toLowerCase().includes(alias))
  );

  if (start === -1) return null;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (isHeadingLine(lines[i])) {
      end = i;
      break;
    }
  }

  return [start + 1, end];
};

const sectionText = (text, key) => {
  const lines = toLines(text);
  const range = findSectionRange(lines, SECTION_ALIASES[key] || []);
  if (!range) return "";
  return lines.slice(range[0], range[1]).join("\n");
};

const extractSkills = (text) =>
  SKILL_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => ({
    name,
  }));

const extractEducation = (text) => {
  const source = sectionText(text, "education") || text;
  const lines = toLines(source);
  const matches = lines.filter((line) =>
    /\b(university|college|institute|school|bachelor|master|phd|doctorate|associate|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)\b/i.test(
      line
    )
  );

  return [...new Set(matches)].slice(0, 5);
};

const extractLocation = (text) => {
  const topLines = toLines(text).slice(0, 8);
  for (const line of topLines) {
    const remoteMatch = line.match(/\b(remote|hybrid)\b/i);
    if (remoteMatch) return remoteMatch[0];

    const locationMatch = line.match(
      /\b([A-Z][a-zA-Z.'-]+(?: [A-Z][a-zA-Z.'-]+)*,\s*(?:[A-Z]{2}|[A-Z][a-z]+(?: [A-Z][a-z]+)*))\b/
    );
    if (locationMatch) return locationMatch[1];
  }

  return "";
};

const addMonthRange = (months, startYear, startMonth, endYear, endMonth) => {
  const cursor = new Date(startYear, startMonth, 1);
  const end = new Date(endYear, endMonth, 1);

  while (cursor <= end) {
    months.add(`${cursor.getFullYear()}-${cursor.getMonth()}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
};

const currentYearMonth = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

const extractExperienceYears = (text) => {
  const source = sectionText(text, "experience") || text;
  const months = new Set();
  const explicitYears = [];

  const monthYearRangeRegex =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\s*[-to]+\s*(Present|Current|Now|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})/gi;
  const yearRangeRegex = /\b(20\d{2})\s*[-to]+\s*(Present|Current|Now|20\d{2})\b/gi;
  const explicitYearsRegex = /(\d+(?:\.\d+)?)\+?\s+years?/gi;

  let match;
  while ((match = monthYearRangeRegex.exec(source)) !== null) {
    const startMonth = MONTHS[match[1].toLowerCase()];
    const startYear = Number(match[2]);
    let endYear;
    let endMonth;

    if (/present|current|now/i.test(match[3])) {
      ({ year: endYear, month: endMonth } = currentYearMonth());
    } else {
      const [endMonthName, endYearValue] = match[3].split(/\s+/);
      endMonth = MONTHS[endMonthName.toLowerCase()];
      endYear = Number(endYearValue);
    }

    addMonthRange(months, startYear, startMonth, endYear, endMonth);
  }

  while ((match = yearRangeRegex.exec(source)) !== null) {
    const startYear = Number(match[1]);
    let endYear;
    let endMonth = 11;

    if (/present|current|now/i.test(match[2])) {
      ({ year: endYear, month: endMonth } = currentYearMonth());
    } else {
      endYear = Number(match[2]);
    }

    addMonthRange(months, startYear, 0, endYear, endMonth);
  }

  while ((match = explicitYearsRegex.exec(source)) !== null) {
    explicitYears.push(Number(match[1]));
  }

  const derivedYears = months.size > 0 ? Math.round((months.size / 12) * 10) / 10 : 0;
  const explicitMax = explicitYears.length > 0 ? Math.max(...explicitYears) : 0;

  return Math.max(derivedYears, explicitMax);
};

const parseResume = (text) => {
  const normalized = normalizeText(text);

  return {
    skills: extractSkills(normalized),
    experienceYears: extractExperienceYears(normalized),
    location: extractLocation(normalized),
    education: extractEducation(normalized),
  };
};

const hasParsedData = (parsed) =>
  Boolean(
    parsed &&
      (parsed.skills?.length ||
        parsed.experienceYears > 0 ||
        parsed.location ||
        parsed.education?.length)
  );

module.exports = { parseResume, hasParsedData };

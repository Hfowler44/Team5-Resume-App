const {
  extractJobSkills,
  calculateSkillScore,
  buildResumeSignalSet,
} = require("../services/jobMatching");

describe("jobMatching", () => {
  it("extracts job skills from current SimplifyJobs fields", () => {
    const skills = extractJobSkills({
      title: "Software - Machine Learning Intern",
      category: "Data Science, AI & Machine Learning",
      company_name: "TetraMem",
      locations: ["Fremont, CA"],
      terms: ["Summer 2026"],
    }).map((skill) => skill.name);

    expect(skills).toEqual(
      expect.arrayContaining([
        "Machine Learning",
        "Artificial Intelligence",
        "Data Science",
        "Python",
      ])
    );
  });

  it("builds resume signals from parsed skills and resume text", () => {
    const signals = buildResumeSignalSet({
      parsed: {
        skills: [{ name: "React" }],
      },
      textExtracted:
        "Software Engineer with Python, Docker, and AWS experience in machine learning systems.",
    });

    expect(signals.has("react")).toBe(true);
    expect(signals.has("python")).toBe(true);
    expect(signals.has("docker")).toBe(true);
    expect(signals.has("aws")).toBe(true);
    expect(signals.has("machine learning")).toBe(true);
  });

  it("scores a resume against derived job skills", () => {
    const resume = {
      parsed: {
        skills: [{ name: "Python" }, { name: "Machine Learning" }],
      },
      textExtracted: "Built machine learning systems in Python and PyTorch.",
    };

    const jobSkills = extractJobSkills({
      title: "Machine Learning Intern",
      category: "Data Science, AI & Machine Learning",
      terms: ["Summer 2026"],
    });

    const result = calculateSkillScore(resume, jobSkills);

    expect(result.finalScore).toBeGreaterThan(0);
    expect(result.matchedSkills).toEqual(
      expect.arrayContaining(["Python", "Machine Learning"])
    );
  });
});

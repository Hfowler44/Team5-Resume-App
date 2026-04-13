const { parseResume, hasParsedData } = require("../services/resumeParser");

describe("resumeParser", () => {
  it("extracts parsed resume fields from plain text", () => {
    const parsed = parseResume(`
John Doe
Orlando, FL
john@example.com

SKILLS
Python, JavaScript, React, Node.js, Docker, AWS

EXPERIENCE
Software Engineer
Jan 2022 - Mar 2024
Built APIs with Node.js and React.

EDUCATION
University of Central Florida
Bachelor of Science in Computer Science
`);

    expect(parsed.skills.map((skill) => skill.name)).toEqual(
      expect.arrayContaining(["Python", "JavaScript", "React", "Node.js", "Docker", "AWS"])
    );
    expect(parsed.location).toBe("Orlando, FL");
    expect(parsed.experienceYears).toBeGreaterThanOrEqual(2);
    expect(parsed.education).toEqual(
      expect.arrayContaining([
        "University of Central Florida",
        "Bachelor of Science in Computer Science",
      ])
    );
  });

  it("detects whether parsed data has any meaningful content", () => {
    expect(
      hasParsedData({
        skills: [],
        experienceYears: 0,
        location: "",
        education: [],
      })
    ).toBe(false);

    expect(
      hasParsedData({
        skills: [{ name: "Python" }],
        experienceYears: 0,
        location: "",
        education: [],
      })
    ).toBe(true);
  });

  it("handles flattened PDF text with inline headings and unicode date ranges", () => {
    const parsed = parseResume(
      "Lincoln Spencer Education University of Central Florida Aug 2023 – May 2027 Bachelor of Science in Computer Science GPA: 3.7 Orlando, Florida Relevant Coursework: Applied Machine Learning Experience Institute of Artificial Intelligence March 2025 – Present Researcher Orlando, Florida Publications Technical Skills Languages: Python, Java, JavaScript Databases: SQL, MongoDB Systems and Research Tools: Docker, AWS, Linux, Git / GitHub"
    );

    expect(parsed.location).toBe("Orlando, Florida");
    expect(parsed.experienceYears).toBeGreaterThan(0);
    expect(parsed.education).toEqual(
      expect.arrayContaining([
        "University of Central Florida",
        "Bachelor of Science in Computer Science",
        "GPA: 3.7",
      ])
    );
    expect(parsed.education[0]).not.toMatch(/Publications|Technical Skills|Experience/);
  });
});

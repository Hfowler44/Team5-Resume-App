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
});

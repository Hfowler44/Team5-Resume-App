const { PDFParse } = require("pdf-parse");

const extractText = async (pdfBuffer) => {
  const parser = new PDFParse({ data: pdfBuffer });

  let data;
  try {
    data = await parser.getText();
  } finally {
    await parser.destroy();
  }

  const text = data.text.replace(/\s+/g, " ").trim();

  if (!text || text.length < 20) {
    throw Object.assign(
      new Error(
        "Could not extract meaningful text from PDF. Image-only resumes are not supported yet."
      ),
      { status: 422 }
    );
  }

  return text;
};

module.exports = { extractText };

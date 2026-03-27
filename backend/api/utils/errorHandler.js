const errorHandler = (err, req, res, _next) => {
  console.error(err.stack || err.message);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
};

module.exports = errorHandler;

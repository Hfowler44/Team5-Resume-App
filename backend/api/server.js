require("dotenv").config();
const connectDB = require("./config/db");
const app = require("./app");
const { syncJobsFromUpstream } = require("./services/jobSync");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    syncJobsFromUpstream()
      .then((result) => {
        console.log(
          `Startup job sync finished: ${result.message} (${result.totalProcessed} processed)`
        );
      })
      .catch((error) => {
        console.error("Startup job sync failed:", error.message);
      });
  });
});

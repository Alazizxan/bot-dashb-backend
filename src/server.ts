import { app } from "./app";
import { config } from "./config";
import "express-async-errors";


app.listen(config.port, () => {
  console.log(`✅ API running on http://localhost:${config.port}`);
});


process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

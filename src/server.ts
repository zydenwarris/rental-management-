import { buildApp } from "./app.js";
import { buildContainer } from "./container.js";
import { seedDevelopmentData } from "./seed/seed.js";
import { DEFAULT_PORT } from "./config/constants.js";

const port = Number(process.env["PORT"] ?? DEFAULT_PORT);
// Repositories are in-memory, so the portfolio is rebuilt on every boot.
// SEED=false starts with an empty portfolio instead.
const shouldSeed = process.env["SEED"] !== "false";

const container = buildContainer();

if (shouldSeed) {
  await seedDevelopmentData(container);
  console.log("Seeded development portfolio.");
}

buildApp(container).listen(port, () => {
  console.log(`Rental management API listening on http://localhost:${port}`);
});

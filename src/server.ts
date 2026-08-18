import { buildApp } from "./app.js";
import { buildContainer } from "./container.js";
import { seedDevelopmentData } from "./seed/seed.js";
import { env } from "./config/env.js";

const container = buildContainer();

// Seeding is opt-in now that data belongs to real authenticated users. Sign up through
// the portal, copy your id from Supabase → Authentication → Users, and set
// SEED_LANDLORD_ID to see the demo portfolio under your own account.
if (env.SEED_LANDLORD_ID) {
  await seedDevelopmentData(container, env.SEED_LANDLORD_ID);
  console.log(`Seeded development portfolio for landlord ${env.SEED_LANDLORD_ID}.`);
}

buildApp(container).listen(env.PORT, () => {
  console.log(`Rental management API listening on http://localhost:${env.PORT}`);
});

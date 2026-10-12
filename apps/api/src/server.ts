import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(
    JSON.stringify({
      level: "info",
      service: "g-stock-api",
      message: `Serveur API G-Stock démarré sur http://${env.API_HOST}:${env.API_PORT}/api/v1`,
      billingProvider: env.BILLING_PROVIDER,
      timestamp: new Date().toISOString(),
    })
  );
});

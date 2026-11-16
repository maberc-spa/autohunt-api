import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import { notFoundHandler } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";

const app: Application = express();

// Render (and most PaaS) terminate TLS at a proxy; trust it so req.protocol is https.
app.set("trust proxy", 1);

app.use(helmet());
app.disable("x-powered-by");
// The mobile app doesn't need CORS; browsers only get it for the origins listed in CORS_ORIGINS.
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : false }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

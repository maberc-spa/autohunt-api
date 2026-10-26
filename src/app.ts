import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import uploadRoutes from "./routes/upload.routes";
import { notFoundHandler } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";

const app: Application = express();

// Render (and most PaaS) terminate TLS at a proxy; trust it so req.protocol is https.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());
app.use(
  "/api/uploads",
  express.raw({ type: () => true, limit: "10mb" }),
  uploadRoutes
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

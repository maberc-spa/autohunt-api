import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";
import uploadRoutes from "./routes/upload.routes";
import { notFoundHandler } from "./middleware/not-found";
import { errorHandler } from "./middleware/error-handler";

const app: Application = express();

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

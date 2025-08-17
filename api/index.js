import "dotenv/config";
import express, { json, urlencoded } from "express";
import cors from "cors";
import { join } from "path";

import { createTables } from "./database/schema.js";

import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/students.js";
import batchRoutes from "./routes/batches.js";
import questionRoutes from "./routes/questions.js";
import testRoutes from "./routes/tests.js";
import quizRoutes from "./routes/quiz.js";
import pdfRoutes from "./routes/pdf.js";
import subjectRoutes from "./routes/subjects.js";

export async function initApp() {
  console.info("Initializing API...");
  await createTables();
  console.info("✅ Database tables checked/created successfully");

  const app = express();
  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));

  const rootDir = process.cwd();
  app.use("/uploads", express.static(join(rootDir, "uploads")));

  app.use("/api/auth", authRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/batches", batchRoutes);
  app.use("/api/questions", questionRoutes);
  app.use("/api/tests", testRoutes);
  app.use("/api/quiz", quizRoutes);
  app.use("/api/pdf", pdfRoutes);
  app.use("/api/subjects", subjectRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "API is running" });
  });

  app.use((error, req, res, next) => {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  });

  console.info("API initialized.");
  return app;
}

if (process.env.NODE_ENV !== "production" && process.env.NETLIFY !== "true") {
  const PORT = process.env.PORT || 3001;
  initApp().then((app) => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

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

const app = express();
const PORT = process.env.PORT || 3001;

async function startServer() {
  await createTables();

  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));

  const rootDir = process.cwd();
  app.use("/uploads", express.static(join(rootDir, "uploads")));

  app.use("/api/auth", authRoutes.default || authRoutes);
  app.use("/api/students", studentRoutes.default || studentRoutes);
  app.use("/api/batches", batchRoutes.default || batchRoutes);
  app.use("/api/questions", questionRoutes.default || questionRoutes);
  app.use("/api/tests", testRoutes.default || testRoutes);
  app.use("/api/quiz", quizRoutes.default || quizRoutes);
  app.use("/api/pdf", pdfRoutes.default || pdfRoutes);
  app.use("/api/subjects", subjectRoutes.default || subjectRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "IntelliQuiz AI API is running" });
  });

  app.use((error, req, res, next) => {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  });

  if (process.env.NETLIFY !== "true") {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
export default app;

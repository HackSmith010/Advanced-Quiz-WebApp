import express from "express";
import cors from "cors";
import { authenticateToken } from "./middleware/auth.js";
import { createTables } from "./database/schema.js";

import authRouter from "./routes/auth.js";
import studentsRouter from "./routes/students.js";
import batchesRouter from "./routes/batches.js";
import subjectsRouter from "./routes/subjects.js";
import questionsRouter from "./routes/questions.js";
import testsRouter from "./routes/tests.js";
import pdfRouter from "./routes/pdf.js";
import quizRouter from "./routes/quiz.js";
import uploadsRouter from "./routes/uploads.js";


const app = express();

app.use(cors());
app.use(express.json());

createTables().catch(console.error);

app.use("/api/auth", authRouter);
app.use("/api/quiz", quizRouter);

app.use(authenticateToken); 
app.use("/api/students", studentsRouter);
app.use("/api/batches", batchesRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/tests", testsRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/uploads", uploadsRouter);


app.get("/api", (req, res) => {
  res.send("API is running successfully.");
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = 3001;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export const handler = app;
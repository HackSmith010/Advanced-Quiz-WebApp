import express from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload",
  authenticateToken,
  upload.single("pdf"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    try {
      const backgroundFunctionUrl = `${process.env.URL}/.netlify/functions/process-pdf-background`;

      const payload = {
        fileBuffer: req.file.buffer,
        userId: req.user.userId,
      };

      fetch(backgroundFunctionUrl, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "x-netlify-lambda-asynchronous-ok": "true",
        },
      });

      res.status(202).json({
        message:
          "Your PDF has been received and is being processed. The questions will appear in the 'Pending Review' section shortly.",
      });
    } catch (error) {
      console.error("Error invoking background function:", error);
      res.status(500).json({ error: "Failed to start PDF processing." });
    }
  }
);

export default router;

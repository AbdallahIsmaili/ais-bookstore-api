// In uploads.ts
import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import authMiddleware from "../middleware/auth";

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 5MB limit
  },
});

router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ message: "No file uploaded" });
        return; // Explicit return
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      res.json({
        url: fileUrl,
        message: "File uploaded successfully",
      });
      return; // Explicit return
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
      return; // Explicit return
    }
  }
);

export default router;

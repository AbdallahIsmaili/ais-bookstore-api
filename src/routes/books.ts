import express, { Request, Response } from "express";
import Book from "../models/Book";
import User from "../models/User";
import auth from "../middleware/auth";
import axios from "axios";

const router = express.Router();

router.get(
  "/google-books/search",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;
      if (!q) {
        res.status(400).json({ error: "Search query required" });
        return;
      }

      console.log("Requesting Google Books for query:", q);

      const response = await axios.get(
        "https://www.googleapis.com/books/v1/volumes",
        {
          params: {
            q,
            maxResults: 20,
            key: process.env.GOOGLE_BOOKS_API_KEY,
          },
          timeout: 5000,
        }
      );

      if (!response.data.items) {
        throw new Error("No items in Google Books response");
      }

      const transformedBooks = response.data.items.map((item: any) => ({
        id: item.id,
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors?.join(", ") || "Unknown Author",
        description: item.volumeInfo.description || "",
        publication_year: item.volumeInfo.publishedDate
          ? new Date(item.volumeInfo.publishedDate).getFullYear()
          : 0,
        cover_image:
          item.volumeInfo.imageLinks?.thumbnail?.replace(
            "http://",
            "https://"
          ) || "",
        isAvailable: true,
        previewLink: item.volumeInfo.previewLink || "",
        infoLink: item.volumeInfo.infoLink || "",
      }));

      res.json(transformedBooks);
    } catch (error: any) {
      console.error("Google Books API Error:", {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });

      res.status(500).json({
        error: "Failed to fetch books",
        details: error.response?.data?.error?.message || error.message,
      });
    }
  }
);


router.get(
  "/google-books/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes/${id}`,
        {
          params: {
            key: process.env.GOOGLE_BOOKS_API_KEY,
          },
          timeout: 5000,
        }
      );

      const item = response.data;
      const transformedBook = {
        id: item.id,
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors?.join(", ") || "Unknown Author",
        description: item.volumeInfo.description || "",
        publication_year: item.volumeInfo.publishedDate
          ? new Date(item.volumeInfo.publishedDate).getFullYear()
          : 0,
        cover_image:
          item.volumeInfo.imageLinks?.thumbnail?.replace(
            "http://",
            "https://"
          ) || "",
        previewLink: item.volumeInfo.previewLink || "",
        infoLink: item.volumeInfo.infoLink || "",
      };

      res.json(transformedBook);
    } catch (error: any) {
      console.error("Google Books API Error:", {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });

      res.status(500).json({
        error: "Failed to fetch book details",
        details: error.response?.data?.error?.message || error.message,
      });
    }
  }
);


router.get(
  "/borrowed",
  auth,
  async (req: any, res: Response): Promise<void> => {
    try {
      const books = await Book.find({ borrower: req.userId });
      res.json(books);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  }
);

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const books = await Book.find();

    const transformedBooks = books.map((book) => ({
      ...book.toObject(),
      genre0: book["genre/0"],
      genre1: book["genre/1"],
    }));

    res.json(transformedBooks);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});


router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    const transformedBook = {
      ...book.toObject(),
      genre0: book["genre/0"],
      genre1: book["genre/1"],
    };

    res.json(transformedBook);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// POST /books
router.post("/", auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      author,
      description,
      publication_year,
      "genre/0": genre0,
      "genre/1": genre1,
      cover_image,
    } = req.body;

    const newBook = new Book({
      title,
      author,
      description,
      publication_year,
      "genre/0": genre0,
      "genre/1": genre1,
      cover_image,
    });

    const book = await newBook.save();
    res.json(book);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// PUT /books/:id
router.put("/:id", auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      author,
      description,
      publication_year,
      "genre/0": genre0,
      "genre/1": genre1,
      cover_image,
    } = req.body;

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      {
        title,
        author,
        description,
        publication_year,
        "genre/0": genre0,
        "genre/1": genre1,
        cover_image,
      },
      { new: true }
    );

    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    res.json(book);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Delete book (admin only)
router.delete(
  "/:id",
  auth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const book = await Book.findByIdAndDelete(req.params.id);

      if (!book) {
        res.status(404).json({ message: "Book not found" });
        return;
      }

      res.json({ message: "Book removed" });
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  }
);

// Borrow book
router.post(
  "/:id/borrow",
  auth,
  async (req: any, res: Response): Promise<void> => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        res.status(404).json({ message: "Book not found" });
        return;
      }

      if (!book.isAvailable) {
        res.status(400).json({ message: "Book is already borrowed" });
        return;
      }

      book.isAvailable = false;
      book.borrower = req.userId;
      await book.save();

      await User.findByIdAndUpdate(req.userId, {
        $push: { borrowedBooks: book._id },
      });

      res.json(book);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  }
);

// Return book
router.post(
  "/:id/return",
  auth,
  async (req: any, res: Response): Promise<void> => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        res.status(404).json({ message: "Book not found" });
        return;
      }

      if (book.isAvailable) {
        res.status(400).json({ message: "Book is not borrowed" });
        return;
      }

      if (book.borrower?.toString() !== req.userId) {
        res.status(403).json({ message: "Not authorized to return this book" });
        return;
      }

      book.isAvailable = true;
      book.borrower = undefined;
      await book.save();

      await User.findByIdAndUpdate(req.userId, {
        $pull: { borrowedBooks: book._id },
      });

      res.json(book);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  }
);

export default router;

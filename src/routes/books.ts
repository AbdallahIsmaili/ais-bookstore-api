import express, { Request, Response } from "express";
import Book, { IBook } from "../models/Book";
import User from "../models/User";
import auth from "../middleware/auth";
import axios from "axios";
import Loan, { ILoan } from "../models/Loan";
import mongoose from "mongoose";

const router = express.Router();

// Helper type for populated loan
type PopulatedLoan = Omit<ILoan, "book"> & { book: IBook };

router.get(
  "/google-books/search",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;
      if (!q) {
        res.status(400).json({ error: "Search query required" });
        return;
      }

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
      const loans = await Loan.find({ user: req.userId, status: "active" })
        .populate<{ book: IBook }>("book")
        .sort({ dueDate: 1 })
        .lean();

      const books = loans.map((loan) => {
        const book = loan.book as IBook;
        return {
          ...book,
          _id: book._id?.toString(),
          borrowedDate: loan.borrowedDate.toISOString(),
          dueDate: loan.dueDate.toISOString(),
          loanId: loan._id?.toString(),
        };
      });

      res.json(books);
    } catch (error) {
      res.status(500).send("Server error");
    }
  }
);

router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const books = await Book.find().lean();
    res.json(books);
  } catch (error) {
    res.status(500).send("Server error");
  }
});

router.get("/:id", auth, async (req: any, res: Response): Promise<void> => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    if (!book.isAvailable) {
      const loan = await Loan.findOne({
        book: book._id,
        status: "active",
      }).lean();

      if (loan) {
        res.json({
          ...book,
          borrowedDate: loan.borrowedDate.toISOString(),
          dueDate: loan.dueDate.toISOString(),
          borrower: loan.user.toString(),
          loanId: loan._id.toString(),
        });
        return; // 🔐 prevent sending another response later
      }
    }

    res.json(book); // sent only if loan isn't found or book is available
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});



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
    res.status(500).send("Server error");
  }
});

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
    ).lean();

    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }

    res.json(book);
  } catch (error) {
    res.status(500).send("Server error");
  }
});

router.delete(
  "/:id",
  auth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const book = await Book.findByIdAndDelete(req.params.id).lean();
      if (!book) {
        res.status(404).json({ message: "Book not found" });
        return;
      }
      res.json({ message: "Book removed" });
    } catch (error) {
      res.status(500).send("Server error");
    }
  }
);


// Update the borrow endpoint
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

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const loan = new Loan({
        book: book._id,
        user: req.userId,
        borrowedDate: new Date(),
        dueDate,
        status: "active",
      });
      await loan.save();

      book.isAvailable = false;
      await book.save();

      await User.findByIdAndUpdate(req.userId, {
        $push: { borrowedBooks: book._id },
      });

      // Cast to IBook to ensure proper typing
      const bookObj = book.toObject() as IBook;
      const loanObj = loan.toObject() as ILoan;

      res.json({
        book: { ...bookObj, _id: bookObj._id.toString() },
        loan: {
          ...loanObj,
          _id: loanObj._id.toString(),
          book: bookObj._id.toString(),
          user: req.userId.toString(),
        },
      });
    } catch (error) {
      res.status(500).send("Server error");
    }
  }
);

// Update the return endpoint
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

      const loan = await Loan.findOne({
        book: book._id,
        user: req.userId,
        status: "active",
      });
      if (!loan) {
        res.status(404).json({ message: "No active loan found for this book" });
        return;
      }

      loan.returnedDate = new Date();
      loan.status = "returned";
      await loan.save();

      book.isAvailable = true;
      await book.save();

      await User.findByIdAndUpdate(req.userId, {
        $pull: { borrowedBooks: book._id },
      });

      // Cast to IBook to ensure proper typing
      const bookObj = book.toObject() as IBook;
      const loanObj = loan.toObject() as ILoan;

      res.json({
        book: { ...bookObj, _id: bookObj._id.toString() },
        loan: {
          ...loanObj,
          _id: loanObj._id.toString(),
          book: bookObj._id.toString(),
          user: req.userId.toString(),
        },
      });
    } catch (error) {
      res.status(500).send("Server error");
    }
  }
);



export default router;

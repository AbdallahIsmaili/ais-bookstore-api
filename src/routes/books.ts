import express, { Request, Response } from "express";
import Book from "../models/Book";
import User from "../models/User"; // Make sure this is imported
import auth from "../middleware/auth";

const router = express.Router();


router.get(
  "/borrowed",
  auth,
  async (req: any, res: Response): Promise<void> => {
    try {
      // Get books where borrower matches the current user's ID
      const books = await Book.find({ borrower: req.userId });
      res.json(books);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server error");
    }
  }
);

// In your server route for getting all books (/books)
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const books = await Book.find();
    
    // Transform the genre fields to use dot notation instead of slash
    const transformedBooks = books.map(book => ({
      ...book.toObject(),
      genre0: book['genre/0'],
      genre1: book['genre/1'],
    }));
    
    res.json(transformedBooks);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Similarly update the single book route
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      res.status(404).json({ message: "Book not found" });
      return;
    }
    
    // Transform the genre fields
    const transformedBook = {
      ...book.toObject(),
      genre0: book['genre/0'],
      genre1: book['genre/1'],
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
    const { title, author, description, publication_year, "genre/0": genre0, "genre/1": genre1, cover_image } = req.body;

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
    const { title, author, description, publication_year, "genre/0": genre0, "genre/1": genre1, cover_image } = req.body;

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        author, 
        description, 
        publication_year,
        "genre/0": genre0,
        "genre/1": genre1,
        cover_image 
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

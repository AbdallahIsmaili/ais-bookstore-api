import mongoose, { Document } from "mongoose";

export interface IBook extends Document {
  title: string;
  author: string;
  description: string;
  publication_year: number; // Changed from publishedYear
  "genre/0": string;
  "genre/1": string;
  cover_image: string;
  isAvailable: boolean;
  borrower?: mongoose.Types.ObjectId;
  // Virtual properties
  genre0: string;
  genre1: string;
}

const bookSchema = new mongoose.Schema<IBook>({
  title: { type: String, required: true },
  author: { type: String, required: true },
  description: { type: String, required: true },
  publication_year: { type: Number, required: true },
  "genre/0": { type: String },
  "genre/1": { type: String },
  cover_image: { type: String },
  isAvailable: { type: Boolean, default: true },
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Add virtual properties for easier access to genre fields
bookSchema.virtual("genre0").get(function () {
  return this["genre/0"];
});

bookSchema.virtual("genre1").get(function () {
  return this["genre/1"];
});

// Ensure virtuals are included when converting to JSON or to Object
bookSchema.set("toJSON", { virtuals: true });
bookSchema.set("toObject", { virtuals: true });

export default mongoose.model<IBook>("Book", bookSchema);

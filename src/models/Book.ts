import mongoose, { Document } from "mongoose";

export interface IBook extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  author: string;
  description: string;
  publication_year: number; 
  "genre/0": string;
  "genre/1": string;
  cover_image: string;
  isAvailable: boolean;
  borrower?: mongoose.Types.ObjectId;
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
});

bookSchema.virtual("genre0").get(function () {
  return this["genre/0"];
});

bookSchema.virtual("genre1").get(function () {
  return this["genre/1"];
});

bookSchema.set("toJSON", { virtuals: true });
bookSchema.set("toObject", { virtuals: true });

export default mongoose.model<IBook>("Book", bookSchema);

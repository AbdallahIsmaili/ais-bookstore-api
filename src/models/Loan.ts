import mongoose, { Document } from "mongoose";
import { IBook } from "./Book";

export interface ILoan extends Document {
  _id: mongoose.Types.ObjectId;
  book: mongoose.Types.ObjectId | IBook;
  user: mongoose.Types.ObjectId;
  borrowedDate: Date;
  dueDate: Date;
  returnedDate?: Date;
  status: "active" | "returned" | "overdue";
}

const loanSchema = new mongoose.Schema<ILoan>({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  borrowedDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnedDate: { type: Date },
  status: {
    type: String,
    enum: ["active", "returned", "overdue"],
    default: "active",
  },
});

export default mongoose.model<ILoan>("Loan", loanSchema);

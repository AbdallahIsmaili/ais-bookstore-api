import mongoose, { Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  borrowedBooks: mongoose.Types.ObjectId[];
  profileImage: { type: String };
  comparePassword: (enteredPassword: string) => Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  borrowedBooks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);

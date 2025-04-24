import Loan from "../models/Loan";

export const checkOverdueLoans = async () => {
  try {
    const result = await Loan.updateMany(
      {
        dueDate: { $lt: new Date() },
        status: "active",
      },
      {
        status: "overdue",
      }
    );
    console.log(`Updated ${result.modifiedCount} overdue loans`);
  } catch (error) {
    console.error("Error checking overdue loans:", error);
  }
};

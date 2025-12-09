import User from "./User.js";
import Transaction from "./Transaction.js";

// A User can have many Transactions
User.hasMany(Transaction, {
  foreignKey: "userId",
  as: "transactions",
});

// A Transaction belongs to a single User
Transaction.belongsTo(User, { foreignKey: "userId", as: "user" });

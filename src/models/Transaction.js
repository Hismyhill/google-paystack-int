import { DataTypes } from "sequelize";
import sequelize from "../config/db.config.js";

const Transaction = sequelize.define("Transaction", {
  reference: { type: DataTypes.STRING, unique: true },
  amount: DataTypes.INTEGER,
  status: { type: DataTypes.STRING, defaultValue: "pending" },
  paid_at: DataTypes.DATE,
});

export default Transaction;

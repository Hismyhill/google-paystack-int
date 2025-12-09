import { DataTypes } from "sequelize";
import sequelize from "../config/db.config.js";

const Transaction = sequelize.define("Transaction", {
  reference: { type: DataTypes.STRING, unique: true },
  amount: DataTypes.INTEGER,
  status: { type: DataTypes.STRING, defaultValue: "pending" },
  paid_at: DataTypes.DATE,
  authorization_url: { type: DataTypes.STRING(512) }, // Store the payment URL
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users", // This is the table name
      key: "id",
    },
  },
});

export default Transaction;

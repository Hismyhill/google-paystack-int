import { DataTypes } from "sequelize";
import sequelize from "../config/db.config.js";

const User = sequelize.define("User", {
  googleId: { type: DataTypes.STRING, unique: true },
  email: { type: DataTypes.STRING, unique: true },
  name: DataTypes.STRING,
  picture: DataTypes.STRING,
  role: { type: DataTypes.STRING, defaultValue: "user" },
});

export default User;

import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const isDev = process.env.NODE_ENV === "development";

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: isDev
      ? false
      : {
          require: true,
          rejectUnauthorized: false,
        },
  },
});

export default sequelize;

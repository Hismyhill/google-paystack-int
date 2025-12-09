import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger.js";
import sequelize from "./config/db.config.js";
import "./models/index.js"; // Import to initialize model associations

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

app.get("/", (req, res) => {
  res.send("API is running");
});

const port = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
    // Using { alter: true } is useful in development to apply model changes.
    if (process.env.NODE_ENV === "development")
      await sequelize.sync({ alter: true });

    // Import routes AFTER sequelize is authenticated and models are synchronized
    // This ensures models are defined on a fully initialized sequelize instance.
    const authRoutes = (await import("./routes/auth.routes.js")).default;
    const paymentRoutes = (await import("./routes/payment.routes.js")).default;
    app.use("/auth", authRoutes);
    app.use("/payments", paymentRoutes);
    console.log("All models were synchronized successfully.");
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1); // Exit the process with an error code
  }
};

startServer();

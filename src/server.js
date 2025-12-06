import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger.js";
import authRoutes from "./routes/auth.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import sequelize from "./config/db.config.js";

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

app.use("/auth", authRoutes);
app.use("/payments", paymentRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

const port = process.env.PORT || 4000;

sequelize
  .sync()
  .then(() => console.log("DB connected"))
  .catch((err) => console.log("DB error:", err));

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${port}`)
);

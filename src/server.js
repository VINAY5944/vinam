
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import { connectRedis } from "./config/redis.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/", submissionRoutes);

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// Test route
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to the API"
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

// Start server
const PORT = process.env.PORT || 4000;

const startServer = async () => {
    try {
        await sequelize.authenticate();
        await connectRedis();

        console.log("PostgreSQL connected successfully");
        console.log("Redis connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
};

startServer();

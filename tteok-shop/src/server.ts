import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import app from "./app";

const MONGO_URL = process.env.MONGO_URL as string;
const PORT = process.env.PORT ?? 3009;

mongoose
  .connect(MONGO_URL, {})
  .then(() => {
    console.log("MongoDB connection succeeded");
    app.listen(PORT, () => {
      console.info(`Server is running on port: ${PORT}`);
      console.info(`Admin project on http://localhost:${PORT}/admin \n`);
    });
  })
  .catch((err) => {
    if (err?.codeName === "AtlasError" && /bad auth/i.test(err.message)) {
      console.error(
        "Error connecting to MongoDB: authentication failed. Check MONGO_URL username/password in .env."
      );
      return;
    }

    console.error("Error connecting to MongoDB:", err);
  });

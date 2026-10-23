import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api", (req, res) => {
  res.json({
    name: "Cheo Manager API",
    version: "1.0.0",
    status: "running"
  });
});

export default app;
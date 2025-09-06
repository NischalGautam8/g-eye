const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const cors = require("cors"); // Import cors

const app = express();
const port = 3001;

// Enable CORS for all origins
app.use(cors({ origin: "http://localhost:5173" }));

// Increase request body size limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({ dest: "uploads/" });

let jobs = {};

app.post("/api/upload", upload.single("file"), (req, res) => {
  const imageId = req.file.filename;
  res.json({ imageId });
});

app.post("/api/jobs", (req, res) => {
  const { imageAId, imageBId, aoi } = req.body;
  const jobId = Date.now().toString();

  jobs[jobId] = {
    status: "queued",
    progress: 0,
    imageAId,
    imageBId,
    aoi,
  };

  const imageAPath = path.join("/app/uploads", imageAId);
  const imageBPath = path.join("/app/uploads", imageBId);

  const pythonProcess = spawn("python", [
    "../worker/process.py",
    "--image_a",
    imageAPath,
    "--image_b",
    imageBPath,
    "--aoi",
    JSON.stringify(aoi),
  ]);

  pythonProcess.stdout.on("data", (data) => {
    console.log(`Python stdout: ${data}`);
    jobs[jobId].status = "processing";
  });

  pythonProcess.stderr.on("data", (data) => {
    console.error(`Python stderr: ${data}`);
    jobs[jobId].status = "failed";
    jobs[jobId].error = data.toString();
  });

  pythonProcess.on("close", (code) => {
    if (code === 0) {
      jobs[jobId].status = "completed";
      jobs[jobId].progress = 100;
      jobs[jobId].outputs = {
        imageAUrl: `/outputs/${imageAId}.outputA.tif`,
        imageBUrl: `/outputs/${imageBId}.outputB.tif`,
      };
    } else {
      jobs[jobId].status = "failed";
    }
  });

  res.json({ jobId });
});

app.get("/api/jobs/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];

  if (job) {
    res.json(job);
  } else {
    res.status(404).json({ error: "Job not found" });
  }
});

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});

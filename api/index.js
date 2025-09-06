const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json());

const upload = multer({ dest: '../data/uploads/' });

const jobs = {};
const jobsFilePath = path.join(__dirname, '../data/jobs.json');

// Load jobs from file
if (fs.existsSync(jobsFilePath)) {
  const jobsData = fs.readFileSync(jobsFilePath);
  Object.assign(jobs, JSON.parse(jobsData));
}

const saveJobs = () => {
  fs.writeFileSync(jobsFilePath, JSON.stringify(jobs, null, 2));
};

app.post('/api/upload', upload.single('file'), (req, res) => {
  const imageId = req.file.filename;
  res.json({ imageId });
});

app.post('/api/jobs', (req, res) => {
  const { imageAId, imageBId, aoi } = req.body;
  const jobId = uuidv4();

  jobs[jobId] = { status: 'Pending', progress: 0 };
  saveJobs();

  const outDir = path.join(__dirname, `../data/outputs/${jobId}`);
  const imageAPath = path.join(__dirname, `../data/uploads/${imageAId}`);
  const imageBPath = path.join(__dirname, `../data/uploads/${imageBId}`);
  const aoiStr = `north=${aoi.north};south=${aoi.south};east=${aoi.east};west=${aoi.west}`;

  const workerCmd = `python ../worker/process.py --image_a ${imageAPath} --image_b ${imageBPath} --aoi "${aoiStr}" --out_dir ${outDir}`;

  jobs[jobId].status = 'Running';
  saveJobs();

  exec(workerCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      jobs[jobId].status = 'Error';
      jobs[jobId].error = stderr;
      saveJobs();
      return;
    }
    jobs[jobId].status = 'Done';
    jobs[jobId].outputs = {
      imageAUrl: `/rasters/outputs/${jobId}/A_clipped.tif`,
      imageBUrl: `/rasters/outputs/${jobId}/B_clipped_aligned.tif`,
    };
    saveJobs();
  });

  res.json({ jobId });
});

app.get('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

app.get('/rasters/:type/:jobId/:fileName', (req, res) => {
  const { type, jobId, fileName } = req.params;
  const filePath = path.join(__dirname, `../data/${type}/${jobId}/${fileName}`);
  res.sendFile(filePath);
});

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
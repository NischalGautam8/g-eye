import React, { useState, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UploadPanel from './components/UploadPanel';
import SplitViewMap from './components/SplitViewMap';
import JobStatus from './components/JobStatus';
import axios from 'axios';
import L from 'leaflet';

axios.defaults.baseURL = 'http://localhost:3001';

export interface Aoi {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ProcessedOutputs {
  imageAUrl: string;
  imageBUrl: string;
}

function App(): JSX.Element {
  const [imageA, setImageA] = useState<File | null>(null);
  const [imageB, setImageB] = useState<File | null>(null);
  const [imageAId, setImageAId] = useState<string | null>(null);
  const [imageBId, setImageBId] = useState<string | null>(null);
  const [aoi, setAoi] = useState<Aoi | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [processedOutputs, setProcessedOutputs] = useState<ProcessedOutputs | null>(null);
  const [showProcessed, setShowProcessed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const mapARef = useRef<L.Map>(null);
  const mapBRef = useRef<L.Map>(null);

  const handleFileChange = (file: File, type: 'A' | 'B') => {
    if (type === 'A') {
      setImageA(file);
    } else {
      setImageB(file);
    }
  };

  const handleUpload = async () => {
    if (!imageA || !imageB) {
      toast.error('Please select both images.');
      return;
    }

    const upload = async (file: File, type: 'A' | 'B') => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await axios.post<{ imageId: string }>('/api/upload', formData);
        if (type === 'A') {
          setImageAId(response.data.imageId);
        } else {
          setImageBId(response.data.imageId);
        }
        toast.success(`${file.name} uploaded successfully.`);
      } catch (error) {
        toast.error(`Error uploading ${file.name}.`);
      }
    };

    await upload(imageA, 'A');
    await upload(imageB, 'B');
  };

  const handleProcess = async () => {
    if (!imageAId || !imageBId) {
      toast.error('Please upload both images first.');
      return;
    }
    if (!aoi) {
      toast.error('Please draw an Area of Interest (AOI).');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post<{ jobId: string }>('/api/jobs', {
        imageAId,
        imageBId,
        aoi,
      });
      setJobId(response.data.jobId);
      setJobStatus('Pending');
      pollJobStatus(response.data.jobId);
    } catch (error) {
      toast.error('Error starting processing job.');
      setIsProcessing(false);
    }
  };

  const pollJobStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get<{ status: string; outputs: ProcessedOutputs }>(
          `/api/jobs/${id}`
        );
        const { status, outputs } = response.data;
        setJobStatus(status);
        if (status === 'Done') {
          setProcessedOutputs(outputs);
          setIsProcessing(false);
          clearInterval(interval);
          toast.success('Processing complete!');
        } else if (status === 'Error') {
          setIsProcessing(false);
          clearInterval(interval);
          toast.error('Processing job failed.');
        }
      } catch (error) {
        setIsProcessing(false);
        clearInterval(interval);
        toast.error('Error polling job status.');
      }
    }, 2000);
  };

  const handleAoiChange = (newAoi: Aoi | null) => {
    setAoi(newAoi);
  };

  const handleResetAoi = () => {
    setAoi(null);
    // Need a way to clear the drawn rectangle on the map
  };

  const toggleProcessed = () => {
    setShowProcessed(!showProcessed);
  };

  return (
    <div className="flex flex-col h-screen">
      <ToastContainer />
      <div className="flex flex-grow">
        <UploadPanel
          imageA={imageA}
          imageB={imageB}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
          onProcess={handleProcess}
          onResetAoi={handleResetAoi}
          isProcessing={isProcessing}
          jobStatus={jobStatus}
          processedOutputs={processedOutputs}
          showProcessed={showProcessed}
          onToggleProcessed={toggleProcessed}
          aoi={aoi}
        />
        <SplitViewMap
          imageA={imageA}
          imageB={imageB}
          imageAId={imageAId}
          imageBId={imageBId}
          aoi={aoi}
          onAoiChange={handleAoiChange}
          mapARef={mapARef}
          mapBRef={mapBRef}
          showProcessed={showProcessed}
          processedOutputs={processedOutputs}
        />
      </div>
      <JobStatus status={jobStatus} />
    </div>
  );
}

export default App;

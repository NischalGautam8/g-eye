import React from 'react';
import { Aoi, ProcessedOutputs } from '../App';

interface UploadPanelProps {
  imageA: File | null;
  imageB: File | null;
  onFileChange: (file: File, type: 'A' | 'B') => void;
  onUpload: () => void;
  onProcess: () => void;
  onResetAoi: () => void;
  isProcessing: boolean;
  jobStatus: string | null;
  processedOutputs: ProcessedOutputs | null;
  showProcessed: boolean;
  onToggleProcessed: () => void;
  aoi: Aoi | null;
}

function UploadPanel({ 
  imageA, 
  imageB, 
  onFileChange, 
  onUpload, 
  onProcess, 
  onResetAoi, 
  isProcessing, 
  jobStatus, 
  processedOutputs, 
  showProcessed, 
  onToggleProcessed, 
  aoi 
}: UploadPanelProps): JSX.Element {
  return (
    <div className="w-96 p-4 border-r border-gray-300 flex flex-col">
      <h2 className="text-xl font-bold mb-4">Upload Images</h2>
      <div className="mb-4">
        <label className="block mb-2">Image A:</label>
        <input type="file" accept=".tif,.tiff" onChange={(e) => e.target.files && onFileChange(e.target.files[0], 'A')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
        {imageA && <div className="text-sm mt-1">{imageA.name} ({(imageA.size / 1024 / 1024).toFixed(2)} MB)</div>}
      </div>
      <div className="mb-4">
        <label className="block mb-2">Image B:</label>
        <input type="file" accept=".tif,.tiff" onChange={(e) => e.target.files && onFileChange(e.target.files[0], 'B')} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"/>
        {imageB && <div className="text-sm mt-1">{imageB.name} ({(imageB.size / 1024 / 1024).toFixed(2)} MB)</div>}
      </div>
      <button onClick={onUpload} disabled={isProcessing || (imageA && imageB) === null} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
        Upload Images
      </button>

      <h2 className="text-xl font-bold mt-8 mb-4">Area of Interest (AOI)</h2>
      {aoi && (
        <div className="text-sm">
          <div>North: {aoi.north.toFixed(4)}</div>
          <div>South: {aoi.south.toFixed(4)}</div>
          <div>East: {aoi.east.toFixed(4)}</div>
          <div>West: {aoi.west.toFixed(4)}</div>
        </div>
      )}
      <button onClick={onResetAoi} disabled={!aoi} className="mt-2 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
        Reset AOI
      </button>

      <h2 className="text-xl font-bold mt-8 mb-4">Processing</h2>
      <button onClick={onProcess} disabled={isProcessing || !aoi || !imageA || !imageB} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
        {isProcessing ? 'Processing...' : 'Process AOI'}
      </button>

      {jobStatus && (
        <div className="mt-4">
          <p>Job Status: <span className="font-bold">{jobStatus}</span></p>
        </div>
      )}

      {processedOutputs && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Processed Outputs</h3>
          <button onClick={onToggleProcessed} className="mt-2 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            {showProcessed ? 'Show Raw Rasters' : 'Show Processed Outputs'}
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadPanel;

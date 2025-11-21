import React, { useRef } from 'react';
import { Upload, FileJson, Terminal } from 'lucide-react';
import { NetworkData } from '../types';
import { parsePyATSData } from '../utils/parser';

interface FileUploadProps {
  onDataLoaded: (data: NetworkData) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        // Check for PyATS format (contains 'files' array)
        if (json.files && Array.isArray(json.files)) {
            console.log("Detected PyATS format, parsing...");
            const parsedData = parsePyATSData(json);
            onDataLoaded(parsedData);
        } 
        // Check for Standard NetworkData format
        else if (json.nodes && Array.isArray(json.nodes)) {
            onDataLoaded(json as NetworkData);
        } else {
            alert("Invalid JSON structure. Must contain a 'nodes' array or 'files' array (PyATS).");
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Error parsing JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === 'application/json') {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div 
      className="relative group cursor-pointer border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-6 transition-all duration-300 bg-gray-800/50 hover:bg-gray-800"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="application/json" 
        onChange={handleFileChange} 
      />
      <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-400">
        <div className="p-3 rounded-full bg-gray-700 group-hover:bg-blue-500/20 transition-colors mb-3">
          <Upload className="w-6 h-6" />
        </div>
        <span className="text-sm font-medium text-center">Click to upload<br/>Topology or Logs</span>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
             <FileJson className="w-3 h-3" />
             <span>.json</span>
          </div>
          <div className="flex items-center gap-1">
             <Terminal className="w-3 h-3" />
             <span>PyATS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
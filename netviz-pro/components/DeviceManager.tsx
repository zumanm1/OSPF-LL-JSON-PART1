/**
 * Device Manager Component
 * Provides CSV template download for device imports
 * Includes sample device data for the topology
 */

import React, { useState } from 'react';
import { X, Download, Upload, Server, FileSpreadsheet, CheckCircle, AlertCircle, HardDrive } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface DeviceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onDevicesImported: (devices: any[]) => void;
}

// Sample device data for CSV template
const SAMPLE_DEVICES = [
  { name: 'deu-r10', tags: 'core,germany', ip_address: '10.10.10.10', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'DEU' },
  { name: 'deu-r6', tags: 'edge,germany', ip_address: '10.10.6.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'DEU' },
  { name: 'gbr-r7', tags: 'core,uk', ip_address: '10.20.7.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'GBR' },
  { name: 'gbr-r9', tags: 'edge,uk', ip_address: '10.20.9.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'GBR' },
  { name: 'usa-r5', tags: 'core,us', ip_address: '10.30.5.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'USA' },
  { name: 'usa-r8', tags: 'edge,us', ip_address: '10.30.8.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'USA' },
  { name: 'zwe-r1', tags: 'core,zimbabwe', ip_address: '10.40.1.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'ZWE' },
  { name: 'zwe-r2', tags: 'edge,zimbabwe', ip_address: '10.40.2.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'ZWE' },
  { name: 'zwe-r3', tags: 'core,zimbabwe', ip_address: '10.40.3.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'ZWE' },
  { name: 'zwe-r4', tags: 'edge,zimbabwe', ip_address: '10.40.4.1', connection: 'SSH', type: 'Router', platform: 'Cisco', software: 'IOS-XE 17.3', country: 'ZWE' },
];

const CSV_HEADERS = ['Name', 'Tags', 'IP Address', 'Connection', 'Type', 'Platform', 'Software', 'Country'];

const DeviceManager: React.FC<DeviceManagerProps> = ({ isOpen, onClose, onDevicesImported }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  if (!isOpen) return null;

  // Generate CSV content
  const generateCSV = () => {
    const headerRow = CSV_HEADERS.join(',');
    const dataRows = SAMPLE_DEVICES.map(device =>
      `${device.name},${device.tags},${device.ip_address},${device.connection},${device.type},${device.platform},${device.software},${device.country}`
    );
    return [headerRow, ...dataRows].join('\n');
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'device_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setImportStatus({ type: 'success', message: 'CSV template downloaded successfully!' });
    setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          setImportStatus({ type: 'error', message: 'CSV file must contain header and at least one data row' });
          return;
        }

        // Validate headers
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = CSV_HEADERS.map(h => h.toLowerCase());
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setImportStatus({ type: 'error', message: `Missing required columns: ${missingHeaders.join(', ')}` });
          return;
        }

        const deviceCount = lines.length - 1;

        // Parse devices
        const devices = lines.slice(1).map(line => {
          const cols = line.split(',').map(c => c.trim());
          return {
            name: cols[0],
            tags: cols[1],
            ip_address: cols[2],
            connection: cols[3],
            type: cols[4],
            platform: cols[5],
            software: cols[6],
            country: cols[7]
          };
        });

        setImportStatus({ type: 'success', message: `Successfully validated ${deviceCount} device(s) from CSV!` });

        // Pass imported devices to parent
        onDevicesImported(devices);

        // Clear status after 5 seconds
        setTimeout(() => setImportStatus({ type: null, message: '' }), 5000);
      } catch {
        setImportStatus({ type: 'error', message: 'Failed to parse CSV file' });
      }
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
              <HardDrive className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Device Manager
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Import and manage network devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>

            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium cursor-pointer transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Upload className="w-4 h-4" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>

          {/* Status Message */}
          {importStatus.type && (
            <div className={`flex items-center gap-2 p-3 mb-4 rounded-lg ${importStatus.type === 'success'
                ? (isDark ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                : (isDark ? 'bg-red-900/30 text-red-300 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-200')
              }`}>
              {importStatus.type === 'success'
                ? <CheckCircle className="w-4 h-4" />
                : <AlertCircle className="w-4 h-4" />
              }
              <span className="text-sm">{importStatus.message}</span>
            </div>
          )}

          {/* CSV Format Info */}
          <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>CSV Format</h3>
            </div>
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              The CSV template includes the following columns:
            </p>
            <div className="flex flex-wrap gap-2">
              {CSV_HEADERS.map(header => (
                <span
                  key={header}
                  className={`px-2 py-1 text-xs rounded font-mono ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                >
                  {header}
                </span>
              ))}
            </div>
          </div>

          {/* Sample Devices Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Sample Devices ({SAMPLE_DEVICES.length})
              </h3>
            </div>

            <div className="overflow-x-auto rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-gray-800' : 'bg-gray-100'}>
                    {CSV_HEADERS.map(header => (
                      <th
                        key={header}
                        className={`px-3 py-2 text-left font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_DEVICES.map((device, index) => (
                    <tr
                      key={device.name}
                      className={`border-t ${isDark ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <td className={`px-3 py-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {device.name}
                      </td>
                      <td className={`px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="flex flex-wrap gap-1">
                          {device.tags.split(',').map(tag => (
                            <span
                              key={tag}
                              className={`px-1.5 py-0.5 text-xs rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={`px-3 py-2 font-mono text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {device.ip_address}
                      </td>
                      <td className={`px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.connection}
                      </td>
                      <td className={`px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.type}
                      </td>
                      <td className={`px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.platform}
                      </td>
                      <td className={`px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {device.software}
                      </td>
                      <td className={`px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${device.country === 'DEU' ? (isDark ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                            device.country === 'GBR' ? (isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') :
                              device.country === 'USA' ? (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700') :
                                (isDark ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700')
                          }`}>
                          {device.country}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceManager;

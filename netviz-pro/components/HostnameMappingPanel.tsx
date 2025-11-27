import React, { useState } from 'react';
import { X, Upload, FileText, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { HostnameMappingConfig, HostnameMapping, RouterRole } from '../types';
import { parseHostnameMappingTable, DEFAULT_HOSTNAME_MAPPINGS, getRoleBadgeStyle } from '../utils/hostnameMapper';

interface HostnameMappingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: HostnameMappingConfig | null;
  onConfigChange: (config: HostnameMappingConfig) => void;
}

const HostnameMappingPanel: React.FC<HostnameMappingPanelProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onConfigChange,
}) => {
  const [mappingText, setMappingText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState(false);

  if (!isOpen) return null;

  const handleParseMappings = () => {
    setParseError(null);
    setParseSuccess(false);

    if (!mappingText.trim()) {
      setParseError('Please enter mapping data');
      return;
    }

    try {
      const config = parseHostnameMappingTable(mappingText);
      if (config.mappings.length === 0) {
        setParseError('No valid mappings found. Format: old_hostname  role  new_hostname');
        return;
      }
      onConfigChange(config);
      setParseSuccess(true);
      setTimeout(() => setParseSuccess(false), 2000);
    } catch (error) {
      setParseError('Failed to parse mappings. Check format.');
    }
  };

  const handleLoadDefaults = () => {
    onConfigChange(DEFAULT_HOSTNAME_MAPPINGS);
    // Also populate the text area with the default mappings
    const text = DEFAULT_HOSTNAME_MAPPINGS.mappings
      .map(m => `${m.old_hostname}\t${m.role}\t${m.new_hostname}`)
      .join('\n');
    setMappingText(text);
    setParseSuccess(true);
    setTimeout(() => setParseSuccess(false), 2000);
  };

  const handleClearMappings = () => {
    onConfigChange({ mappings: [], auto_detect_role: true });
    setMappingText('');
    setParseError(null);
    setParseSuccess(false);
  };

  const roleColors: Record<RouterRole, string> = {
    'PE': 'text-blue-500',
    'P': 'text-emerald-500',
    'RR': 'text-purple-500',
    'CE': 'text-amber-500',
    'ABR': 'text-pink-500',
    'ASBR': 'text-red-500',
    'unknown': 'text-gray-500',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hostname Mapping</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Map old hostnames to new format with roles
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600/30 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">Format</h3>
            <p className="text-xs text-blue-600 dark:text-blue-300 mb-2">
              Enter one mapping per line: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">old_hostname  role  new_hostname</code>
            </p>
            <div className="text-xs text-blue-600 dark:text-blue-300 font-mono bg-blue-100 dark:bg-blue-800/50 p-2 rounded">
              deu-r10    PE    deu-ber-bes-pe10<br />
              deu-r6     P     deu-ber-bes-p06<br />
              usa-r8     RR    usa-nyc-dc1-rr08
            </div>
          </div>

          {/* Role Legend */}
          <div className="flex flex-wrap gap-2">
            {(['PE', 'P', 'RR', 'CE', 'ABR', 'ASBR'] as RouterRole[]).map(role => {
              const style = getRoleBadgeStyle(role);
              return (
                <span
                  key={role}
                  className={`text-xs font-semibold px-2 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                >
                  {role}
                </span>
              );
            })}
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mapping Data
            </label>
            <textarea
              value={mappingText}
              onChange={(e) => setMappingText(e.target.value)}
              placeholder="Paste your hostname mapping table here..."
              className="w-full h-48 px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error/Success Messages */}
          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">{parseError}</span>
            </div>
          )}

          {parseSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-600/30 rounded-lg">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">
                Mappings applied successfully! ({currentConfig?.mappings.length || 0} mappings)
              </span>
            </div>
          )}

          {/* Current Mappings */}
          {currentConfig && currentConfig.mappings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Active Mappings ({currentConfig.mappings.length})
              </h3>
              <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-400">Old</th>
                      <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">Role</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-400">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentConfig.mappings.map((m, idx) => (
                      <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">{m.old_hostname}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`font-semibold ${roleColors[m.role]}`}>{m.role}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">{m.new_hostname}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-2">
            <button
              onClick={handleLoadDefaults}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Load Defaults
            </button>
            <button
              onClick={handleClearMappings}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-600/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleParseMappings}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              Apply Mappings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostnameMappingPanel;

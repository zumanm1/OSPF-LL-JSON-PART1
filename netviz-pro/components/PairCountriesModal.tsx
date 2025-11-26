import React, { useState, useMemo } from 'react';
import { NetworkData } from '../types';
import { analyzePairCountries } from '../utils/impactAnalysis';
import { X, ArrowRight, TrendingUp, TrendingDown, Activity, Network as NetworkIcon, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';
import { exportToCSV, ExportColumn } from '../utils/exportUtils';

interface PairCountriesModalProps {
  data: NetworkData;
  onClose: () => void;
}

const PairCountriesModal: React.FC<PairCountriesModalProps> = ({ data, onClose }) => {
  const countries = useMemo(() => {
    const set = new Set(data.nodes.map(n => n.country));
    return Array.from(set).sort();
  }, [data]);

  const [sourceCountry, setSourceCountry] = useState<string>(countries[0] || '');
  const [destCountry, setDestCountry] = useState<string>(countries[1] || '');

  const analysis = useMemo(() => {
    if (!sourceCountry || !destCountry || sourceCountry === destCountry) {
      return null;
    }
    return analyzePairCountries(data.nodes, data.links, sourceCountry, destCountry);
  }, [data, sourceCountry, destCountry]);

  const reverseAnalysis = useMemo(() => {
    if (!sourceCountry || !destCountry || sourceCountry === destCountry) {
      return null;
    }
    return analyzePairCountries(data.nodes, data.links, destCountry, sourceCountry);
  }, [data, sourceCountry, destCountry]);

  const isAsymmetric = analysis && reverseAnalysis &&
    (analysis.minCost !== reverseAnalysis.minCost ||
      analysis.avgCost !== reverseAnalysis.avgCost);

  const handleExport = () => {
    if (!analysis || !reverseAnalysis) return;

    const exportData: any[] = [];

    // Forward paths
    analysis.paths.forEach((path, idx) => {
      exportData.push({
        direction: `${sourceCountry} → ${destCountry}`,
        rank: idx + 1,
        path: path.nodes.join(' → '),
        cost: path.totalCost,
        hops: path.nodes.length - 1,
      });
    });

    // Reverse paths
    reverseAnalysis.paths.forEach((path, idx) => {
      exportData.push({
        direction: `${destCountry} → ${sourceCountry}`,
        rank: idx + 1,
        path: path.nodes.join(' → '),
        cost: path.totalCost,
        hops: path.nodes.length - 1,
      });
    });

    const columns: ExportColumn[] = [
      { header: 'Direction', key: 'direction' },
      { header: 'Rank', key: 'rank' },
      { header: 'Path', key: 'path' },
      { header: 'Cost', key: 'cost' },
      { header: 'Hops', key: 'hops' },
    ];

    exportToCSV(exportData, columns, `pair_analysis_${sourceCountry}_${destCountry}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <NetworkIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              Pair Countries Analysis
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Analyze routing paths between two specific countries
            </p>
          </div>
          <div className="flex items-center gap-2">
            {analysis && reverseAnalysis && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Country Selection */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Source Country</label>
              <select
                value={sourceCountry}
                onChange={(e) => setSourceCountry(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:border-blue-500 outline-none"
              >
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Destination Country</label>
              <select
                value={destCountry}
                onChange={(e) => setDestCountry(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-3 focus:border-emerald-500 outline-none"
              >
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Analysis Results */}
        <div className="flex-1 overflow-auto p-6">
          {sourceCountry === destCountry ? (
            <div className="text-center text-gray-500 py-12">
              Please select different countries for analysis
            </div>
          ) : analysis && reverseAnalysis ? (
            <div className="space-y-6">

              {/* Asymmetric Warning */}
              {isAsymmetric && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-amber-400 font-bold text-sm">Asymmetric Routing Detected</p>
                    <p className="text-amber-300/70 text-xs mt-1">
                      Forward and reverse paths have different costs
                    </p>
                  </div>
                </div>
              )}

              {/* Forward Direction */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span style={{ color: COUNTRY_COLORS[sourceCountry] }}>{sourceCountry}</span>
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                    <span style={{ color: COUNTRY_COLORS[destCountry] }}>{destCountry}</span>
                  </h3>
                  <span className="text-xs text-gray-500">{analysis.paths.length} paths found</span>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Min Cost</p>
                    <p className="text-2xl font-bold text-green-400">{analysis.minCost}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Avg Cost</p>
                    <p className="text-2xl font-bold text-blue-400">{analysis.avgCost.toFixed(1)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Max Cost</p>
                    <p className="text-2xl font-bold text-red-400">{analysis.maxCost}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Nodes Used</p>
                    <p className="text-2xl font-bold text-purple-400">{analysis.nodeCount}</p>
                  </div>
                </div>

                {/* Top 3 Paths */}
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2 font-semibold">Best Paths:</p>
                  <div className="space-y-2">
                    {analysis.paths.slice(0, 3).map((path, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 p-2 rounded border border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                          <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
                            {path.nodes.map((node, i) => (
                              <React.Fragment key={i}>
                                <span className="text-xs text-gray-400 font-mono">{node}</span>
                                {i < path.nodes.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-blue-400 ml-2">{path.totalCost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reverse Direction */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span style={{ color: COUNTRY_COLORS[destCountry] }}>{destCountry}</span>
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                    <span style={{ color: COUNTRY_COLORS[sourceCountry] }}>{sourceCountry}</span>
                  </h3>
                  <span className="text-xs text-gray-500">{reverseAnalysis.paths.length} paths found</span>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Min Cost</p>
                    <p className="text-2xl font-bold text-green-400">{reverseAnalysis.minCost}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Avg Cost</p>
                    <p className="text-2xl font-bold text-blue-400">{reverseAnalysis.avgCost.toFixed(1)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Max Cost</p>
                    <p className="text-2xl font-bold text-red-400">{reverseAnalysis.maxCost}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Nodes Used</p>
                    <p className="text-2xl font-bold text-purple-400">{reverseAnalysis.nodeCount}</p>
                  </div>
                </div>

                {/* Top 3 Paths */}
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2 font-semibold">Best Paths:</p>
                  <div className="space-y-2">
                    {reverseAnalysis.paths.slice(0, 3).map((path, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-900/30 p-2 rounded border border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                          <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
                            {path.nodes.map((node, i) => (
                              <React.Fragment key={i}>
                                <span className="text-xs text-gray-400 font-mono">{node}</span>
                                {i < path.nodes.length - 1 && <ArrowRight className="w-3 h-3 text-gray-600" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-400 ml-2">{path.totalCost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comparison */}
              <div className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Bidirectional Comparison</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {analysis.minCost < reverseAnalysis.minCost ? (
                      <TrendingDown className="w-4 h-4 text-green-400" />
                    ) : analysis.minCost > reverseAnalysis.minCost ? (
                      <TrendingUp className="w-4 h-4 text-red-400" />
                    ) : (
                      <Activity className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-400">
                      Forward is {analysis.minCost < reverseAnalysis.minCost ? 'faster' : analysis.minCost > reverseAnalysis.minCost ? 'slower' : 'equal'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Cost difference: <span className="font-bold text-gray-900 dark:text-white">{Math.abs(analysis.minCost - reverseAnalysis.minCost)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Level 4: Transit Countries Analysis */}
              {(analysis.transitCountries.length > 0 || reverseAnalysis.transitCountries.length > 0) && (
                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30">
                  <h4 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                    <NetworkIcon className="w-4 h-4" />
                    Transit Countries (Level 4 Impact)
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Countries serving as transit hubs between {sourceCountry} and {destCountry}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Forward Direction Transit */}
                    <div>
                      <p className="text-xs text-blue-400 font-semibold mb-2">{sourceCountry} → {destCountry}</p>
                      {analysis.transitCountries.length > 0 ? (
                        <div className="space-y-1">
                          {analysis.transitCountries.map((transit, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
                              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium" style={{ color: COUNTRY_COLORS[transit.country] }}>
                                {transit.country}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{transit.pathCount} paths</span>
                                <span className="text-gray-700">|</span>
                                <span>{transit.nodeCount} nodes</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 italic">Direct connection (no transit)</p>
                      )}
                    </div>

                    {/* Reverse Direction Transit */}
                    <div>
                      <p className="text-xs text-emerald-400 font-semibold mb-2">{destCountry} → {sourceCountry}</p>
                      {reverseAnalysis.transitCountries.length > 0 ? (
                        <div className="space-y-1">
                          {reverseAnalysis.transitCountries.map((transit, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
                              <span className="text-xs text-gray-700 dark:text-gray-300 font-medium" style={{ color: COUNTRY_COLORS[transit.country] }}>
                                {transit.country}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{transit.pathCount} paths</span>
                                <span className="text-gray-700">|</span>
                                <span>{transit.nodeCount} nodes</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600 italic">Direct connection (no transit)</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              No paths found between selected countries
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PairCountriesModal;

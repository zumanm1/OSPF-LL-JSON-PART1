import React, { useState, useMemo } from 'react';
import { NetworkData, PathResult } from '../types';
import { findAllPaths } from '../utils/graphAlgorithms';
import { X, Grid3X3, Download, Filter, ArrowRight, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';

interface FullCostMatrixModalProps {
  data: NetworkData;
  onClose: () => void;
}

interface MatrixCell {
  sourceCountry: string;
  destCountry: string;
  minCost: number;
  maxCost: number;
  avgCost: number;
  pathCount: number;
  bestPath: string[];
  allPaths: PathResult[];
  transitCountries: string[];
  // Asymmetric routing support
  reverseCost: number;
  isAsymmetric: boolean;
  asymmetryRatio: number; // How different forward vs reverse costs are
}

const getCostColor = (cost: number): string => {
  if (cost < 0) return 'bg-gray-200 dark:bg-gray-800 text-gray-500'; // Unreachable
  if (cost < 100) return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
  if (cost < 1000) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300';
  if (cost < 5000) return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
  return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
};

const FullCostMatrixModal: React.FC<FullCostMatrixModalProps> = ({ data, onClose }) => {
  const [selectedCell, setSelectedCell] = useState<MatrixCell | null>(null);
  const [filterCountries, setFilterCountries] = useState<string[]>([]);
  const [costRangeMin, setCostRangeMin] = useState<string>('');
  const [costRangeMax, setCostRangeMax] = useState<string>('');
  const [maxHops, setMaxHops] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'source' | 'dest' | 'cost'>('source');
  const [sortAsc, setSortAsc] = useState(true);

  // Get all countries
  const countries = useMemo(() => {
    return Array.from(new Set(data.nodes.map(n => n.country))).sort();
  }, [data]);

  // Build the cost matrix
  const matrixData = useMemo(() => {
    const matrix: MatrixCell[][] = [];

    countries.forEach(sourceCountry => {
      const row: MatrixCell[] = [];

      countries.forEach(destCountry => {
        if (sourceCountry === destCountry) {
          row.push({
            sourceCountry,
            destCountry,
            minCost: 0,
            maxCost: 0,
            avgCost: 0,
            pathCount: 0,
            bestPath: [],
            allPaths: [],
            transitCountries: [],
            reverseCost: 0,
            isAsymmetric: false,
            asymmetryRatio: 1
          });
          return;
        }

        const sourceNodes = data.nodes.filter(n => n.country === sourceCountry);
        const destNodes = data.nodes.filter(n => n.country === destCountry);
        const allPaths: PathResult[] = [];

        sourceNodes.forEach(sNode => {
          destNodes.forEach(dNode => {
            const paths = findAllPaths(data.nodes, data.links, sNode.id, dNode.id, 5);
            allPaths.push(...paths);
          });
        });

        if (allPaths.length === 0) {
          row.push({
            sourceCountry,
            destCountry,
            minCost: -1,
            maxCost: -1,
            avgCost: -1,
            pathCount: 0,
            bestPath: [],
            allPaths: [],
            transitCountries: [],
            reverseCost: -1,
            isAsymmetric: false,
            asymmetryRatio: 1
          });
          return;
        }

        const costs = allPaths.map(p => p.totalCost);
        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);
        const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
        const bestPath = allPaths.find(p => p.totalCost === minCost)?.nodes || [];

        // Find transit countries
        const transitSet = new Set<string>();
        allPaths.forEach(path => {
          path.nodes.slice(1, -1).forEach(nodeId => {
            const node = data.nodes.find(n => n.id === nodeId);
            if (node && node.country !== sourceCountry && node.country !== destCountry) {
              transitSet.add(node.country);
            }
          });
        });

        // Calculate reverse path cost (destCountry -> sourceCountry)
        const reverseSourceNodes = data.nodes.filter(n => n.country === destCountry);
        const reverseDestNodes = data.nodes.filter(n => n.country === sourceCountry);
        const reversePaths: PathResult[] = [];

        reverseSourceNodes.forEach(sNode => {
          reverseDestNodes.forEach(dNode => {
            const paths = findAllPaths(data.nodes, data.links, sNode.id, dNode.id, 5);
            reversePaths.push(...paths);
          });
        });

        const reverseCost = reversePaths.length > 0
          ? Math.min(...reversePaths.map(p => p.totalCost))
          : -1;

        // Calculate asymmetry
        const isAsymmetric = reverseCost > 0 && minCost > 0 && Math.abs(minCost - reverseCost) > 10;
        const asymmetryRatio = (reverseCost > 0 && minCost > 0)
          ? Math.max(minCost, reverseCost) / Math.min(minCost, reverseCost)
          : 1;

        row.push({
          sourceCountry,
          destCountry,
          minCost,
          maxCost,
          avgCost,
          pathCount: allPaths.length,
          bestPath,
          allPaths: allPaths.sort((a, b) => a.totalCost - b.totalCost),
          transitCountries: Array.from(transitSet),
          reverseCost,
          isAsymmetric,
          asymmetryRatio
        });
      });

      matrix.push(row);
    });

    return matrix;
  }, [data, countries]);

  // Flatten matrix for list view with filtering
  const filteredCells = useMemo(() => {
    const cells: MatrixCell[] = [];
    matrixData.forEach(row => {
      row.forEach(cell => {
        if (cell.sourceCountry === cell.destCountry) return;

        // Apply filters
        if (filterCountries.length > 0) {
          if (!filterCountries.includes(cell.sourceCountry) &&
              !filterCountries.includes(cell.destCountry)) {
            return;
          }
        }

        if (costRangeMin && cell.minCost < parseFloat(costRangeMin)) return;
        if (costRangeMax && cell.minCost > parseFloat(costRangeMax)) return;

        if (maxHops) {
          const maxHopCount = parseInt(maxHops);
          if (cell.bestPath.length - 1 > maxHopCount) return;
        }

        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (!cell.sourceCountry.toLowerCase().includes(term) &&
              !cell.destCountry.toLowerCase().includes(term)) {
            return;
          }
        }

        cells.push(cell);
      });
    });

    // Sort
    cells.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'source') {
        cmp = a.sourceCountry.localeCompare(b.sourceCountry);
      } else if (sortBy === 'dest') {
        cmp = a.destCountry.localeCompare(b.destCountry);
      } else {
        cmp = a.minCost - b.minCost;
      }
      return sortAsc ? cmp : -cmp;
    });

    return cells;
  }, [matrixData, filterCountries, costRangeMin, costRangeMax, maxHops, searchTerm, sortBy, sortAsc]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Source', 'Destination', 'Forward Cost', 'Reverse Cost', 'Asymmetry Ratio', 'Is Asymmetric', 'Path Count', 'Best Path', 'Transit Countries'];
    const rows = filteredCells.map(cell => [
      cell.sourceCountry,
      cell.destCountry,
      cell.minCost,
      cell.reverseCost,
      cell.asymmetryRatio.toFixed(2),
      cell.isAsymmetric ? 'Yes' : 'No',
      cell.pathCount,
      cell.bestPath.join(' -> '),
      cell.transitCountries.join(', ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cost_matrix_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (column: 'source' | 'dest' | 'cost') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  const toggleCountryFilter = (country: string) => {
    setFilterCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Grid3X3 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              Full Cost Matrix Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Complete country-to-country cost matrix with all available paths
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-lg text-sm transition-all"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Filters:</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search countries..."
              className="pl-9 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Cost:</span>
            <input
              type="number"
              value={costRangeMin}
              onChange={(e) => setCostRangeMin(e.target.value)}
              placeholder="Min"
              className="w-20 px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={costRangeMax}
              onChange={(e) => setCostRangeMax(e.target.value)}
              placeholder="Max"
              className="w-20 px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Max Hops:</span>
            <input
              type="number"
              value={maxHops}
              onChange={(e) => setMaxHops(e.target.value)}
              placeholder="Any"
              className="w-16 px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {countries.map(country => (
              <button
                key={country}
                onClick={() => toggleCountryFilter(country)}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  filterCountries.includes(country)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {country}
              </button>
            ))}
            {filterCountries.length > 0 && (
              <button
                onClick={() => setFilterCountries([])}
                className="px-2 py-1 rounded text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900"
              >
                Clear
              </button>
            )}
          </div>

          <span className="text-xs text-gray-500 ml-auto">
            {filteredCells.length} routes shown
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Matrix Table */}
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th
                    className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => toggleSort('source')}
                  >
                    <div className="flex items-center gap-1">
                      Source
                      {sortBy === 'source' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium w-12"></th>
                  <th
                    className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => toggleSort('dest')}
                  >
                    <div className="flex items-center gap-1">
                      Destination
                      {sortBy === 'dest' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th
                    className="text-right p-3 text-gray-500 dark:text-gray-400 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => toggleSort('cost')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Fwd Cost
                      {sortBy === 'cost' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </th>
                  <th className="text-right p-3 text-gray-500 dark:text-gray-400 font-medium">Rev Cost</th>
                  <th className="text-center p-3 text-gray-500 dark:text-gray-400 font-medium">Asymmetry</th>
                  <th className="text-right p-3 text-gray-500 dark:text-gray-400 font-medium">Paths</th>
                  <th className="text-right p-3 text-gray-500 dark:text-gray-400 font-medium">Hops</th>
                  <th className="text-left p-3 text-gray-500 dark:text-gray-400 font-medium">Transit</th>
                </tr>
              </thead>
              <tbody>
                {filteredCells.map((cell, idx) => (
                  <tr
                    key={`${cell.sourceCountry}-${cell.destCountry}`}
                    className={`border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-all ${
                      selectedCell?.sourceCountry === cell.sourceCountry &&
                      selectedCell?.destCountry === cell.destCountry
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                    onClick={() => setSelectedCell(cell)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[cell.sourceCountry] || '#6b7280' }}
                        />
                        <span className="text-gray-900 dark:text-white font-medium">{cell.sourceCountry}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <ArrowRight className="w-4 h-4 text-gray-500 inline" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[cell.destCountry] || '#6b7280' }}
                        />
                        <span className="text-gray-900 dark:text-white font-medium">{cell.destCountry}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCostColor(cell.minCost)}`}>
                        {cell.minCost < 0 ? 'N/A' : cell.minCost}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCostColor(cell.reverseCost)}`}>
                        {cell.reverseCost < 0 ? 'N/A' : cell.reverseCost}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {cell.isAsymmetric ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          cell.asymmetryRatio > 5
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                            : cell.asymmetryRatio > 2
                            ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                        }`}>
                          {cell.asymmetryRatio.toFixed(1)}x
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-gray-600 dark:text-gray-300">{cell.pathCount}</td>
                    <td className="p-3 text-right text-gray-600 dark:text-gray-300">{cell.bestPath.length > 0 ? cell.bestPath.length - 1 : '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {cell.transitCountries.slice(0, 3).map(tc => (
                          <span
                            key={tc}
                            className="px-1.5 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            {tc}
                          </span>
                        ))}
                        {cell.transitCountries.length > 3 && (
                          <span className="text-xs text-gray-500">+{cell.transitCountries.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Panel */}
          {selectedCell && selectedCell.pathCount > 0 && (
            <div className="w-96 border-l border-gray-200 dark:border-gray-800 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedCell.sourceCountry} → {selectedCell.destCountry}
                </h3>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Forward Cost</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">{selectedCell.minCost}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Reverse Cost</div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{selectedCell.reverseCost}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Asymmetry</div>
                  <div className={`text-xl font-bold ${
                    selectedCell.isAsymmetric
                      ? selectedCell.asymmetryRatio > 5 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {selectedCell.isAsymmetric ? `${selectedCell.asymmetryRatio.toFixed(1)}x` : 'None'}
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Paths</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{selectedCell.pathCount}</div>
                </div>
              </div>

              {/* Asymmetric Warning */}
              {selectedCell.isAsymmetric && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  selectedCell.asymmetryRatio > 5
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}>
                  <div className={`text-sm font-medium ${
                    selectedCell.asymmetryRatio > 5 ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    Asymmetric Routing Detected
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {selectedCell.sourceCountry} → {selectedCell.destCountry}: Cost {selectedCell.minCost}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedCell.destCountry} → {selectedCell.sourceCountry}: Cost {selectedCell.reverseCost}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Difference: {Math.abs(selectedCell.minCost - selectedCell.reverseCost)} ({selectedCell.asymmetryRatio.toFixed(1)}x ratio)
                  </div>
                </div>
              )}

              {/* Best Path */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Best Path</h4>
                <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {selectedCell.bestPath.map((nodeId, idx) => {
                      const node = data.nodes.find(n => n.id === nodeId);
                      return (
                        <React.Fragment key={nodeId}>
                          <span className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COUNTRY_COLORS[node?.country || ''] || '#6b7280' }}
                            />
                            {nodeId}
                          </span>
                          {idx < selectedCell.bestPath.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-gray-500" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Cost: {selectedCell.minCost} • {selectedCell.bestPath.length - 1} hops
                  </div>
                </div>
              </div>

              {/* Transit Countries */}
              {selectedCell.transitCountries.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Transit Countries</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCell.transitCountries.map(tc => (
                      <span
                        key={tc}
                        className="px-2 py-1 rounded text-sm flex items-center gap-1"
                        style={{ backgroundColor: `${COUNTRY_COLORS[tc] || '#6b7280'}30`, color: COUNTRY_COLORS[tc] || '#9ca3af' }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COUNTRY_COLORS[tc] || '#6b7280' }}
                        />
                        {tc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* All Paths */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  All Paths ({selectedCell.allPaths.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCell.allPaths.slice(0, 20).map((path, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-100 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 rounded-lg p-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Path #{idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCostColor(path.totalCost)}`}>
                          {path.totalCost}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        {path.nodes.join(' → ')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {path.hopCount} hops
                      </div>
                    </div>
                  ))}
                  {selectedCell.allPaths.length > 20 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      +{selectedCell.allPaths.length - 20} more paths
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-center gap-4 text-xs">
          <span className="text-gray-500 dark:text-gray-400">Cost Legend:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50"></span>
            <span className="text-gray-600 dark:text-gray-400">&lt;100</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900/50"></span>
            <span className="text-gray-600 dark:text-gray-400">100-1000</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/50"></span>
            <span className="text-gray-600 dark:text-gray-400">1000-5000</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/50"></span>
            <span className="text-gray-600 dark:text-gray-400">&gt;5000</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default FullCostMatrixModal;

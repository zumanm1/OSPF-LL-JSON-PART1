import React, { useMemo } from 'react';
import { NetworkData } from '../types';
import { findShortestPathCost } from '../utils/graphAlgorithms';
import { X, Download } from 'lucide-react';
import { COUNTRY_COLORS } from '../constants';

interface CostMatrixModalProps {
    data: NetworkData;
    sourceCountry: string;
    destCountry: string;
    onClose: () => void;
}

const CostMatrixModal: React.FC<CostMatrixModalProps> = ({ data, sourceCountry, destCountry, onClose }) => {

    // Get nodes for source country
    const sourceNodes = useMemo(() =>
        data.nodes.filter(n => n.country === sourceCountry).sort((a, b) => a.id.localeCompare(b.id)),
        [data, sourceCountry]);

    // Get nodes for destination country
    const destNodes = useMemo(() =>
        data.nodes.filter(n => n.country === destCountry).sort((a, b) => a.id.localeCompare(b.id)),
        [data, destCountry]);

    // Calculate Matrix
    const matrix = useMemo(() => {
        return sourceNodes.map(sNode => {
            return destNodes.map(dNode => {
                const cost = findShortestPathCost(data.nodes, data.links, sNode.id, dNode.id);
                return {
                    source: sNode,
                    target: dNode,
                    cost
                };
            });
        });
    }, [data, sourceNodes, destNodes]);

    const handleExportCSV = () => {
        // Header Row: Source, Dest1, Dest2, ...
        const headers = ['Source Node', ...destNodes.map(n => `${n.id} (${n.hostname})`)];

        // Rows
        const rows = matrix.map((row, i) => {
            const sourceLabel = `${sourceNodes[i].id} (${sourceNodes[i].hostname})`;
            const costs = row.map(cell => cell.cost === Infinity ? 'Inf' : cell.cost);
            return [sourceLabel, ...costs].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `cost_matrix_${sourceCountry}_to_${destCountry}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Cost Matrix
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Shortest path OSPF costs from <span style={{ color: COUNTRY_COLORS[sourceCountry] || '#fff' }}>{sourceCountry}</span> to <span style={{ color: COUNTRY_COLORS[destCountry] || '#fff' }}>{destCountry}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-auto flex-1 p-4">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="p-3 text-left bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium sticky top-0 left-0 z-20 border-b border-gray-200 dark:border-gray-700">
                                    Source \ Dest
                                </th>
                                {destNodes.map(node => (
                                    <th key={node.id} className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 min-w-[80px] text-center">
                                        <div className="flex flex-col items-center">
                                            <span>{node.id}</span>
                                            <span className="text-[10px] text-gray-500 font-normal">{node.hostname}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {matrix.map((row, rowIndex) => (
                                <tr key={sourceNodes[rowIndex].id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold sticky left-0 z-10 border-r border-gray-200 dark:border-gray-700">
                                        <div className="flex flex-col">
                                            <span>{sourceNodes[rowIndex].id}</span>
                                            <span className="text-[10px] text-gray-500 font-normal">{sourceNodes[rowIndex].hostname}</span>
                                        </div>
                                    </td>
                                    {row.map((cell, colIndex) => (
                                        <td
                                            key={`${cell.source.id}-${cell.target.id}`}
                                            className="p-3 text-center border border-gray-200 dark:border-gray-800/50"
                                            style={{
                                                backgroundColor: cell.cost === Infinity ? '#374151' :
                                                    cell.cost === 0 ? '#1f2937' : 'transparent',
                                                color: cell.cost === Infinity ? '#9ca3af' : '#e5e7eb'
                                            }}
                                        >
                                            {cell.cost === Infinity ? '∞' : cell.cost}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex justify-between">
                    <span>Values represent cumulative link cost. ∞ indicates no path found.</span>
                    <span>{sourceNodes.length} x {destNodes.length} Matrix</span>
                </div>
            </div>
        </div>
    );
};

export default CostMatrixModal;

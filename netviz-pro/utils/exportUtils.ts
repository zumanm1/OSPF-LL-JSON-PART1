/**
 * Export Utility Functions for Excel/CSV Export
 * Provides reusable export functionality for all modals
 */

export interface ExportColumn {
  header: string;
  key: string;
  formatter?: (value: any, row: any) => string;
}

/**
 * Convert data array to CSV string
 */
export function toCSV(data: any[], columns: ExportColumn[]): string {
  const headers = columns.map(col => `"${col.header}"`).join(',');

  const rows = data.map(row => {
    return columns.map(col => {
      let value = row[col.key];
      if (col.formatter) {
        value = col.formatter(value, row);
      }
      // Handle undefined/null
      if (value === undefined || value === null) {
        value = '';
      }
      // Escape quotes and wrap in quotes
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV(data: any[], columns: ExportColumn[], filename: string): void {
  const csv = toCSV(data, columns);
  downloadCSV(csv, filename);
}

/**
 * Export multiple sheets to a single CSV (with sheet separators)
 */
export function exportMultiSheetCSV(sheets: { name: string; data: any[]; columns: ExportColumn[] }[], filename: string): void {
  const csvParts = sheets.map(sheet => {
    const csv = toCSV(sheet.data, sheet.columns);
    return `### ${sheet.name} ###\n${csv}`;
  });

  const combinedCSV = csvParts.join('\n\n');
  downloadCSV(combinedCSV, filename);
}

/**
 * Format number with units (e.g., 1000 -> 1K, 1000000 -> 1M)
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return String(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

/**
 * Format cost with direction indicator
 */
export function formatCost(forward: number, reverse: number): string {
  if (forward === reverse) {
    return String(forward);
  }
  return `${forward} / ${reverse}`;
}

// Pre-defined column sets for common exports

export const pathColumns: ExportColumn[] = [
  { header: 'Rank', key: 'rank' },
  { header: 'Path', key: 'path', formatter: (v) => Array.isArray(v) ? v.join(' → ') : v },
  { header: 'Cost', key: 'cost' },
  { header: 'Hops', key: 'hops' },
];

export const linkColumns: ExportColumn[] = [
  { header: 'Source', key: 'source' },
  { header: 'Target', key: 'target' },
  { header: 'Source Interface', key: 'source_interface' },
  { header: 'Target Interface', key: 'target_interface' },
  { header: 'Forward Cost', key: 'forward_cost' },
  { header: 'Reverse Cost', key: 'reverse_cost' },
  { header: 'Is Asymmetric', key: 'is_asymmetric', formatter: (v) => v ? 'Yes' : 'No' },
  { header: 'Capacity (Mbps)', key: 'capacity_mbps' },
];

export const interfaceColumns: ExportColumn[] = [
  { header: 'Router', key: 'router' },
  { header: 'Country', key: 'routerCountry' },
  { header: 'Interface', key: 'interface' },
  { header: 'Description', key: 'description' },
  { header: 'Status', key: 'status' },
  { header: 'Capacity', key: 'capacity' },
  { header: 'Capacity (Mbps)', key: 'capacityMbps' },
  { header: 'Input Rate (Mbps)', key: 'inputRate' },
  { header: 'Output Rate (Mbps)', key: 'outputRate' },
  { header: 'Input Util %', key: 'inputUtil' },
  { header: 'Output Util %', key: 'outputUtil' },
  { header: 'Neighbor', key: 'neighbor' },
  { header: 'Neighbor Country', key: 'neighborCountry' },
  { header: 'Forward Cost', key: 'forwardCost' },
  { header: 'Reverse Cost', key: 'reverseCost' },
  { header: 'Is Asymmetric', key: 'isAsymmetric', formatter: (v) => v ? 'Yes' : 'No' },
  { header: 'Is Bundle/LAG', key: 'isBundle', formatter: (v) => v ? 'Yes' : 'No' },
];

export const transitColumns: ExportColumn[] = [
  { header: 'Transit Country', key: 'country' },
  { header: 'Transit %', key: 'transitPercent' },
  { header: 'Paths Through', key: 'pathCount' },
  { header: 'Pairs Served', key: 'pairsServed' },
];

export const healthColumns: ExportColumn[] = [
  { header: 'Type', key: 'type' },
  { header: 'Item', key: 'item' },
  { header: 'Severity', key: 'severity' },
  { header: 'Description', key: 'description' },
  { header: 'Path Count', key: 'pathCount' },
];

export const matrixColumns: ExportColumn[] = [
  { header: 'Source Country', key: 'source' },
  { header: 'Destination Country', key: 'destination' },
  { header: 'Forward Cost', key: 'forwardCost' },
  { header: 'Reverse Cost', key: 'reverseCost' },
  { header: 'Asymmetry Ratio', key: 'asymmetryRatio' },
  { header: 'Path Count', key: 'pathCount' },
  { header: 'Hops', key: 'hops' },
  { header: 'Transit Countries', key: 'transitCountries', formatter: (v) => Array.isArray(v) ? v.join(', ') : v },
];

/**
 * Download multiple CSV files sequentially with a small delay
 */
export function downloadMultipleCSVs(exports: { data: any[]; columns: ExportColumn[]; filename: string }[]): void {
  exports.forEach((exp, index) => {
    // Add a small delay between downloads to prevent browser blocking
    setTimeout(() => {
      if (exp.data.length > 0) {
        exportToCSV(exp.data, exp.columns, exp.filename);
      }
    }, index * 200);
  });
}

/**
 * Create a zip-like combined download (all CSVs in one master file)
 */
export function exportAllToSingleFile(
  sheets: { name: string; data: any[]; columns: ExportColumn[] }[],
  filename: string
): void {
  let output = '';
  const timestamp = new Date().toISOString();

  output += `NetViz Pro - Complete Analysis Export\n`;
  output += `Generated: ${timestamp}\n`;
  output += `${'='.repeat(80)}\n\n`;

  sheets.forEach((sheet, index) => {
    if (sheet.data.length === 0) return;

    output += `${'#'.repeat(80)}\n`;
    output += `# SECTION ${index + 1}: ${sheet.name.toUpperCase()}\n`;
    output += `# Records: ${sheet.data.length}\n`;
    output += `${'#'.repeat(80)}\n\n`;

    output += toCSV(sheet.data, sheet.columns);
    output += '\n\n';
  });

  downloadCSV(output, filename);
}

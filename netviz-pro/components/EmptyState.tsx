import React from 'react';
import { FileJson, Upload, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  type?: 'no-data' | 'no-topology' | 'error' | 'loading';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * EmptyState Component
 * Displays a user-friendly message when there's no data to show
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-topology',
  title,
  description,
  actionLabel,
  onAction,
  icon
}) => {
  // Default content based on type
  const defaultContent = {
    'no-topology': {
      title: 'No Topology Loaded',
      description: 'Upload a network topology JSON file to visualize your network infrastructure',
      actionLabel: 'Upload Topology',
      icon: <FileJson className="w-16 h-16 text-gray-400" />
    },
    'no-data': {
      title: 'No Data Available',
      description: 'There is no data to display at this moment',
      actionLabel: undefined,
      icon: <AlertCircle className="w-16 h-16 text-gray-400" />
    },
    'error': {
      title: 'Something Went Wrong',
      description: 'An error occurred while loading the data',
      actionLabel: 'Try Again',
      icon: <AlertCircle className="w-16 h-16 text-red-400" />
    },
    'loading': {
      title: 'Loading...',
      description: 'Please wait while we load your data',
      actionLabel: undefined,
      icon: (
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      )
    }
  };

  const content = defaultContent[type];
  const displayTitle = title || content.title;
  const displayDescription = description || content.description;
  const displayActionLabel = actionLabel || content.actionLabel;
  const displayIcon = icon || content.icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      {/* Icon */}
      <div className="mb-6">
        {displayIcon}
      </div>

      {/* Title */}
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
        {displayTitle}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {displayDescription}
      </p>

      {/* Action Button */}
      {displayActionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
        >
          <Upload className="w-5 h-5" />
          {displayActionLabel}
        </button>
      )}

      {/* Additional Help Text */}
      {type === 'no-topology' && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> You can upload OSPF topology data in JSON format.
            The file should contain network nodes and links information.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmptyState;

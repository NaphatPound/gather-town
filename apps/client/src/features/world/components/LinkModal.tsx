interface LinkModalProps {
  title: string;
  url: string;
  description?: string;
  onClose: () => void;
}

export default function LinkModal({ title, url, description, onClose }: LinkModalProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-w-sm w-full mx-4 p-5">
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        {description && (
          <p className="text-gray-300 text-sm leading-relaxed mb-3">{description}</p>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors text-sm text-center mb-3"
        >
          Open Link
        </a>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

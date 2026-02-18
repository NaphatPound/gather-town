interface ImageModalProps {
  title: string;
  imageUrl: string;
  description?: string;
  onClose: () => void;
}

export default function ImageModal({ title, imageUrl, description, onClose }: ImageModalProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-w-md w-full mx-4 p-5">
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        <img
          src={imageUrl}
          alt={title}
          className="w-full rounded mb-3 max-h-64 object-contain bg-black"
        />
        {description && (
          <p className="text-gray-300 text-sm leading-relaxed mb-3">{description}</p>
        )}
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

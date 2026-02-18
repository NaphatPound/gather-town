interface NoteModalProps {
  title: string;
  content: string;
  onClose: () => void;
}

export default function NoteModal({ title, content, onClose }: NoteModalProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
      <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-w-sm w-full mx-4 p-5">
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">{content}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

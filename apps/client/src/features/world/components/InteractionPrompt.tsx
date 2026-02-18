interface InteractionPromptProps {
  objectName: string;
}

export default function InteractionPrompt({ objectName }: InteractionPromptProps) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-20">
      <div className="bg-black/80 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap border border-white/20 animate-pulse">
        Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded font-bold mx-1">X</kbd> to interact with {objectName}
      </div>
    </div>
  );
}

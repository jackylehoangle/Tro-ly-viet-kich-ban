import React from 'react';

interface FormattedMessageProps {
  content: string;
}

// Simple markdown-ish parser for the script
const FormattedMessage: React.FC<FormattedMessageProps> = ({ content }) => {
  // Split content into lines to process specific formatting
  const lines = content.split('\n');

  return (
    <div className="space-y-2 font-source-code text-sm sm:text-base leading-relaxed">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        
        // Empty lines
        if (!trimmedLine) return <div key={index} className="h-2"></div>;

        // Visual cues [VISUAL: ...]
        if (trimmedLine.startsWith('[VISUAL:') || trimmedLine.startsWith('[CẢNH:')) {
            const text = trimmedLine.replace(/^\[(VISUAL|CẢNH):\s*/i, '').replace(/\]$/, '');
            return (
                <div key={index} className="my-3 p-3 bg-indigo-900/30 border-l-4 border-indigo-500 rounded-r-md text-indigo-200 italic">
                    <span className="font-bold not-italic text-indigo-400 text-xs uppercase tracking-wide mr-2">Cảnh quay:</span>
                    {text}
                </div>
            );
        }

        // Headers (### Title or similar)
        if (trimmedLine.startsWith('#')) {
             const text = trimmedLine.replace(/^#+\s*/, '');
             return <h3 key={index} className="text-lg sm:text-xl font-bold text-indigo-300 mt-4 mb-2">{text}</h3>
        }

        // Bold text parsing (**text**)
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={index} className="whitespace-pre-wrap">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

export default FormattedMessage;

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Chat } from '@google/genai';
import { startChat, resumeChat } from './services/geminiService';
import { AppStatus } from './types';
import type { Message, ScriptConfig } from './types';
import { FilmIcon, SparklesIcon, ClipboardIcon, LoadingSpinnerIcon, UserIcon, SendIcon, DownloadIcon, MagicIcon, TrashIcon, MicIcon, StopIcon, DocIcon, BoldIcon, ItalicIcon } from './components/icons';
import FormattedMessage from './components/FormattedMessage';

const QUICK_ACTIONS = [
  { label: "Viết tiếp", prompt: "Hãy viết tiếp phần nội dung tiếp theo theo dàn ý." },
  { label: "Thêm ví dụ", prompt: "Hãy thêm một ví dụ minh họa cụ thể và sinh động cho phần này." },
  { label: "Hài hước hơn", prompt: "Hãy viết lại đoạn vừa rồi với giọng văn hài hước và thú vị hơn." },
  { label: "Thêm cảnh B-Roll", prompt: "Hãy gợi ý thêm các cảnh quay B-Roll (Visual) chi tiết cho đoạn này." },
  { label: "Hoàn tất & Tổng hợp", prompt: "Tuyệt vời! Hãy tổng hợp lại toàn bộ các phần đã viết thành một kịch bản hoàn chỉnh (Full Script) từ đầu đến cuối. Loại bỏ các đoạn hội thoại thừa, chỉ giữ lại nội dung kịch bản liền mạch và trình bày rõ ràng." },
];

const SLASH_COMMANDS = [
    { id: 'tieptuc', label: '/tieptuc', desc: 'Viết tiếp nội dung', value: 'Hãy viết tiếp nội dung.' },
    { id: 'tonghop', label: '/tonghop', desc: 'Hoàn tất và gộp kịch bản', value: 'Hãy tổng hợp lại toàn bộ kịch bản thành một bản hoàn chỉnh.' },
    { id: 'vidu', label: '/vidu', desc: 'Thêm ví dụ minh họa', value: 'Hãy thêm một ví dụ minh họa cụ thể.' },
    { id: 'chitiet', label: '/chitiet', desc: 'Viết chi tiết hơn', value: 'Hãy viết chi tiết hơn về phần này.' },
    { id: 'hinhanh', label: '/hinhanh', desc: 'Thêm gợi ý hình ảnh', value: 'Hãy thêm các gợi ý hình ảnh (Visual cues) cho đoạn này.' },
    { id: 'sualai', label: '/sualai', desc: 'Viết lại hay hơn', value: 'Hãy viết lại đoạn vừa rồi cho hay hơn.' },
    { id: 'tomtat', label: '/tomtat', desc: 'Tóm tắt lại', value: 'Hãy tóm tắt lại nội dung chính.' },
];

const STRUCTURE_OPTIONS = [
    { value: 'Linear', label: 'Tự do (Linear Storytelling)', desc: 'Kể chuyện tự nhiên theo dòng thời gian.' },
    { value: 'PAS', label: 'PAS (Problem - Agitate - Solve)', desc: 'Nêu vấn đề - Khoét sâu nỗi đau - Đưa giải pháp. Tuyệt vời cho video bán hàng/hướng dẫn.' },
    { value: 'AIDA', label: 'AIDA (Attention - Interest - Desire - Action)', desc: 'Thu hút - Thích thú - Khao khát - Hành động. Cấu trúc kinh điển của quảng cáo.' },
    { value: 'BAB', label: 'BAB (Before - After - Bridge)', desc: 'Trước - Sau - Cầu nối. Vẽ ra viễn cảnh tương lai tươi sáng để thúc đẩy hành động.' },
    { value: 'Golden Circle', label: 'Vòng tròn vàng (Why - How - What)', desc: 'Bắt đầu từ LÝ DO (Why). Truyền cảm hứng sâu sắc và xây dựng niềm tin.' },
    { value: 'Hero\'s Journey', label: 'Hành trình Anh hùng (Hero\'s Journey)', desc: 'Cấu trúc điện ảnh: Gọi mời, Thử thách, Chiến thắng. Tuyệt vời cho kể chuyện.' },
    { value: 'Dan Harmon Circle', label: 'Vòng tròn kể chuyện (Story Circle)', desc: '8 bước hiện đại của Dan Harmon. Cấu trúc hoàn hảo cho mọi câu chuyện viral.' },
    { value: 'Listicle', label: 'Liệt kê (Top List / Steps)', desc: 'Dạng danh sách (Top 5, 7 bước...). Dễ theo dõi và giữ chân người xem.' },
    { value: 'Comparative', label: 'So sánh / Review (Compare & Contrast)', desc: 'So sánh ưu/nhược điểm. Tối ưu cho video review sản phẩm hoặc phân tích.' },
];

const AUDIENCE_OPTIONS = [
    { value: 'Gen Z (16-24 tuổi)', label: 'Gen Z (Năng động, thích ngắn gọn, meme)' },
    { value: 'Millennials (25-40 tuổi)', label: 'Millennials (Sự nghiệp, phát triển bản thân)' },
    { value: 'Doanh nhân / Chuyên gia', label: 'Doanh nhân / Chuyên gia (Chuyên nghiệp, dữ liệu)' },
    { value: 'Nội trợ / Gia đình', label: 'Nội trợ / Gia đình (Gần gũi, cảm xúc)' },
    { value: 'Trẻ em (Dưới 12 tuổi)', label: 'Trẻ em (Vui nhộn, đơn giản)' },
    { value: 'Tech Enthusiasts', label: 'Yêu công nghệ (Chi tiết, kỹ thuật)' },
    { value: 'Đại chúng (Mass)', label: 'Đại chúng (Dễ hiểu, phổ thông)' },
];

const TONE_OPTIONS = [
    { value: 'Hài hước, Lầy lội', label: 'Hài hước, Lầy lội (Giải trí cao)' },
    { value: 'Thân thiện, Gần gũi', label: 'Thân thiện, Gần gũi (Vlog đời sống, Tâm sự)' },
    { value: 'Chuyên gia, Phân tích', label: 'Chuyên gia, Phân tích sâu (Review công nghệ, Tài chính)' },
    { value: 'Học thuật, Chuyên sâu', label: 'Học thuật, Chuyên sâu (Bài giảng, Nghiên cứu)' },
    { value: 'Huyền bí, Kịch tính', label: 'Huyền bí, Kịch tính (True Crime, Bí ẩn)' },
    { value: 'Hành động, Gay cấn', label: 'Hành động, Gay cấn (Phim ngắn, Trailer)' },
    { value: 'Truyền cảm hứng (Healing)', label: 'Truyền cảm hứng, Nhẹ nhàng (Chữa lành)' },
    { value: 'Thẳng thắn, Châm biếm', label: 'Thẳng thắn, Châm biếm (Review, Critique)' },
    { value: 'Sôi động, Năng lượng cao', label: 'Sôi động, Năng lượng cao (Vlog, Challenge)' },
];

const LANGUAGE_OPTIONS = [
    { value: 'Vietnamese', label: 'Tiếng Việt (Việt Nam)' },
    { value: 'English', label: 'Tiếng Anh (US/Global)' },
];

const STORAGE_KEY = 'ai_script_writer_data';

const DEFAULT_CONFIG: ScriptConfig = {
    topic: 'Những nghịch lý nổi tiếng sẽ làm bạn "xoắn não"',
    length: '15 phút',
    sections: '4',
    tone: TONE_OPTIONS[2].value,
    structure: 'Linear',
    audience: AUDIENCE_OPTIONS[0].value,
    reference: '',
    language: 'Vietnamese'
};

// Add type definition for Web Speech API
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [status, setStatus] = useState<AppStatus>(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          const parsed = JSON.parse(saved);
          // If it was loading, revert to chatting or config to avoid stuck state
          return parsed.status === AppStatus.Loading ? AppStatus.Chatting : parsed.status;
      }
      return AppStatus.Config;
  });

  const [config, setConfig] = useState<ScriptConfig>(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          const parsedConfig = JSON.parse(saved).config;
          // Merge with default to handle new fields for existing users
          return { ...DEFAULT_CONFIG, ...parsedConfig };
      }
      return DEFAULT_CONFIG;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).messages : [];
  });

  // UI States for Custom Inputs
  const [useCustomAudience, setUseCustomAudience] = useState(false);
  const [useCustomTone, setUseCustomTone] = useState(false);

  // Initialize custom states based on loaded config
  useEffect(() => {
    const isStandardAudience = AUDIENCE_OPTIONS.some(opt => opt.value === config.audience);
    if (!isStandardAudience && config.audience) setUseCustomAudience(true);

    const isStandardTone = TONE_OPTIONS.some(opt => opt.value === config.tone);
    if (!isStandardTone && config.tone) setUseCustomTone(true);
  }, []);

  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  // Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState(SLASH_COMMANDS);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Persist state to localStorage
  useEffect(() => {
      const stateToSave = {
          status,
          config,
          messages
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [status, config, messages]);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Toggle logic for custom inputs
    if (name === 'audience') {
        if (value === 'custom') {
            setUseCustomAudience(true);
            setConfig(prev => ({ ...prev, audience: '' }));
            return;
        }
    }
    if (name === 'tone') {
        if (value === 'custom') {
            setUseCustomTone(true);
            setConfig(prev => ({ ...prev, tone: '' }));
            return;
        }
    }

    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const toggleCustomInput = (field: 'audience' | 'tone', isCustom: boolean) => {
      if (field === 'audience') {
          setUseCustomAudience(isCustom);
          if (!isCustom) setConfig(prev => ({ ...prev, audience: AUDIENCE_OPTIONS[0].value }));
      } else {
          setUseCustomTone(isCustom);
          if (!isCustom) setConfig(prev => ({ ...prev, tone: TONE_OPTIONS[0].value }));
      }
  };

  const handleClearHistory = () => {
      if (confirm("Bạn có chắc muốn tạo kịch bản mới? Nội dung hiện tại sẽ bị xóa.")) {
          localStorage.removeItem(STORAGE_KEY);
          setStatus(AppStatus.Config);
          setMessages([]);
          // Keep the form mostly populated but reset basics if needed, or fully reset:
          // setConfig(DEFAULT_CONFIG); 
          setChatSession(null);
          setError(null);
      }
  };

  const handleStartChat = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(AppStatus.Loading);
    setError(null);

    try {
      const { chat, stream } = startChat(config);
      setChatSession(chat);

      setMessages([{ role: 'model', content: '' }]);

      let text = '';
      for await (const chunk of await stream) {
        text += chunk.text;
        setMessages([{ role: 'model', content: text }]);
      }
      setStatus(AppStatus.Chatting);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.';
      setError(`Không thể bắt đầu: ${errorMessage}`);
      setStatus(AppStatus.Error);
    }
  }, [config]);

  const sendMessageToGemini = async (messageText: string) => {
    let currentChat = chatSession;
    
    // If chat session is lost (e.g. after refresh), try to resume it
    if (!currentChat && status === AppStatus.Chatting && messages.length > 0) {
        try {
            currentChat = resumeChat(config, messages);
            setChatSession(currentChat);
        } catch (e) {
            setError("Phiên làm việc hết hạn. Vui lòng khởi động lại.");
            return;
        }
    }

    if (!currentChat) return;
    
    // Optimistic update
    const userMessage: Message = { role: 'user', content: messageText };
    const newMessages: Message[] = [...messages, userMessage, { role: 'model', content: '' }];
    setMessages(newMessages);
    setUserInput('');
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    setStatus(AppStatus.Loading);
    
    try {
      const stream = await currentChat.sendMessageStream({ message: messageText });
      let text = '';
      for await (const chunk of stream) {
        text += chunk.text;
        setMessages(prev => {
            const updatedMessages = [...prev];
            updatedMessages[updatedMessages.length - 1].content = text;
            return updatedMessages;
        });
      }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định.';
        setMessages(prev => [...prev.slice(0, -1), { role: 'model', content: `Lỗi: ${errorMessage}` }]);
        setError(`Không nhận được phản hồi: ${errorMessage}`);
    } finally {
        setStatus(AppStatus.Chatting);
    }
  };

  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;
    await sendMessageToGemini(userInput);
  }, [userInput, chatSession, messages, config, status]);

  const handleQuickAction = (prompt: string) => {
    sendMessageToGemini(prompt);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
        return;
    }

    const w = window as unknown as IWindow;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Trình duyệt của bạn không hỗ trợ nhập liệu giọng nói.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = config.language === 'English' ? 'en-US' : 'vi-VN'; // Switch input language based on config
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        setIsListening(true);
    };

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Smart Editor Logic
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setUserInput(val);

      // Auto resize textarea
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';

      // Slash commands detection
      const cursor = e.target.selectionStart;
      const textBefore = val.slice(0, cursor);
      const match = textBefore.match(/\/([a-z0-9]*)$/i);

      if (match) {
          const query = match[1].toLowerCase();
          const filtered = SLASH_COMMANDS.filter(cmd => cmd.id.includes(query) || cmd.label.includes(query));
          if (filtered.length > 0) {
              setFilteredCommands(filtered);
              setShowSuggestions(true);
              setSuggestionIndex(0);
              return;
          }
      }
      setShowSuggestions(false);
  };

  const applyCommand = (command: typeof SLASH_COMMANDS[0]) => {
      if (!textareaRef.current) return;
      const val = textareaRef.current.value;
      const cursor = textareaRef.current.selectionStart;
      const textBefore = val.slice(0, cursor);
      const lastSlashIndex = textBefore.lastIndexOf('/');
      
      const newValue = val.slice(0, lastSlashIndex) + command.value + val.slice(cursor);
      setUserInput(newValue);
      setShowSuggestions(false);
      
      setTimeout(() => {
          if (textareaRef.current) {
             textareaRef.current.focus();
             // Reset height
             textareaRef.current.style.height = 'auto';
             textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
          }
      }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showSuggestions) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSuggestionIndex(prev => (prev + 1) % filteredCommands.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSuggestionIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              applyCommand(filteredCommands[suggestionIndex]);
          } else if (e.key === 'Escape') {
              setShowSuggestions(false);
          }
          return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  };

  const applyFormat = (type: 'bold' | 'italic') => {
      if (!textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const text = userInput;
      const wrapper = type === 'bold' ? '**' : '*';
      
      // Insert wrapper
      const newText = text.substring(0, start) + wrapper + text.substring(start, end) + wrapper + text.substring(end);
      setUserInput(newText);

      // Restore selection/focus
      setTimeout(() => {
          if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(start + wrapper.length, end + wrapper.length);
          }
      }, 0);
  };

  const handleExportScript = () => {
    const scriptContent = messages
      .filter(m => m.role === 'model')
      .map(m => m.content)
      .join('\n\n-----------------------------------\n\n');
    
    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_script.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportDoc = () => {
    const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${config.topic}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            h1 { color: #2c3e50; font-size: 24px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; }
            h2 { color: #16a085; font-size: 20px; margin-top: 20px; }
            h3 { color: #2980b9; font-size: 18px; }
            .visual-cue { 
                background-color: #e8f0fe; 
                color: #1a73e8; 
                padding: 10px; 
                border-left: 4px solid #1a73e8; 
                margin: 10px 0; 
                font-style: italic;
                font-family: Consolas, 'Courier New', monospace;
            }
            .model-response { margin-bottom: 20px; }
            p { margin-bottom: 10px; }
        </style>
        </head><body>
        <h1>KỊCH BẢN: ${config.topic.toUpperCase()}</h1>
        <p><strong>Khán giả:</strong> ${config.audience} | <strong>Structure:</strong> ${config.structure}</p>
        <p><strong>Độ dài:</strong> ${config.length} | <strong>Style:</strong> ${config.tone}</p>
        <p><strong>Language:</strong> ${config.language}</p>
        <hr/>
    `;

    const content = messages
        .filter(m => m.role === 'model')
        .map(m => {
            let html = m.content;
            html = html.replace(/\[(VISUAL|CẢNH):\s*(.*?)\]/gi, '<div class="visual-cue"><strong>🎥 CẢNH QUAY:</strong> $2</div>');
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
            html = html.replace(/\n/g, '<br>');
            
            return `<div class="model-response">${html}</div><br><hr><br>`;
        })
        .join('');

    const footer = "</body></html>";
    const sourceHTML = header + content + footer;

    const blob = new Blob([sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_script.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const renderConfigForm = () => (
    <form onSubmit={handleStartChat} className="bg-slate-800/50 rounded-xl shadow-2xl shadow-indigo-900/10 border border-slate-700 p-6 sm:p-8 space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-center text-slate-200">Thiết Lập Kịch Bản Chuyên Nghiệp</h2>
      
      <div className="space-y-4">
        {/* Core Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
                <label htmlFor="topic" className="block text-sm font-semibold text-slate-300 mb-2">Chủ đề chính</label>
                <input required type="text" name="topic" id="topic" value={config.topic} onChange={handleConfigChange} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200" placeholder="VD: Lợi ích của thiền định..." />
            </div>

            {/* Language Selection */}
            <div className="col-span-1 md:col-span-2">
                 <label htmlFor="language" className="block text-sm font-semibold text-slate-300 mb-2">Ngôn ngữ kịch bản (Output Language)</label>
                 <div className="relative">
                    <select name="language" id="language" value={config.language} onChange={handleConfigChange} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200 appearance-none">
                        {LANGUAGE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                         <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            
            {/* Audience Section */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="audience" className="block text-sm font-semibold text-slate-300">Khán giả mục tiêu</label>
                    <button 
                        type="button" 
                        onClick={() => toggleCustomInput('audience', !useCustomAudience)} 
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                        {useCustomAudience ? 'Chọn từ danh sách' : 'Tự nhập khác'}
                    </button>
                </div>
                {useCustomAudience ? (
                     <input type="text" name="audience" id="audience" value={config.audience} onChange={handleConfigChange} autoFocus className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200" placeholder="VD: Sinh viên IT năm cuối..." />
                ) : (
                    <div className="relative">
                        <select name="audience" id="audience" value={config.audience} onChange={handleConfigChange} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200 appearance-none">
                            {AUDIENCE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                            <option value="custom">Khác (Tự nhập...)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                             <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Structure Section */}
            <div>
                <label htmlFor="structure" className="block text-sm font-semibold text-slate-300 mb-2">Cấu trúc kể chuyện</label>
                <div className="relative">
                    <select name="structure" id="structure" value={config.structure} onChange={handleConfigChange} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200 appearance-none">
                        {STRUCTURE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
                <p className="mt-1 text-xs text-slate-400 italic truncate">{STRUCTURE_OPTIONS.find(o => o.value === config.structure)?.desc}</p>
            </div>
        </div>

        {/* Tone & Logistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tone Section */}
            <div>
                 <div className="flex justify-between items-center mb-2">
                    <label htmlFor="tone" className="block text-sm font-semibold text-slate-300">Giọng văn & Phong cách</label>
                    <button 
                        type="button" 
                        onClick={() => toggleCustomInput('tone', !useCustomTone)} 
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                    >
                        {useCustomTone ? 'Chọn từ danh sách' : 'Tự nhập khác'}
                    </button>
                </div>
                 {useCustomTone ? (
                    <input type="text" name="tone" id="tone" value={config.tone} onChange={handleConfigChange} autoFocus className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200" placeholder="VD: Hài hước, Chuyên gia..." />
                 ) : (
                    <div className="relative">
                        <select name="tone" id="tone" value={config.tone} onChange={handleConfigChange} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200 appearance-none">
                            {TONE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                            <option value="custom">Khác (Tự nhập...)</option>
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                             <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                 )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="length" className="block text-sm font-semibold text-slate-300 mb-2">Độ dài</label>
                    <input type="text" name="length" id="length" value={config.length} onChange={handleConfigChange} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200" placeholder="VD: 15 phút" />
                </div>
                <div>
                    <label htmlFor="sections" className="block text-sm font-semibold text-slate-300 mb-2">Số phần</label>
                    <input type="number" name="sections" id="sections" value={config.sections} onChange={handleConfigChange} min="1" className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200" />
                </div>
            </div>
        </div>

        {/* Context Material */}
        <div>
           <label htmlFor="reference" className="block text-sm font-semibold text-slate-300 mb-2">
               Tài liệu tham khảo / Thông tin nền (Tùy chọn)
               <span className="ml-2 text-xs font-normal text-slate-500">Giúp AI viết chính xác hơn</span>
           </label>
           <textarea name="reference" id="reference" value={config.reference} onChange={handleConfigChange} rows={3} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-200 resize-none placeholder-slate-600" placeholder="Dán nội dung bài viết, số liệu, hoặc các ý chính bạn muốn đưa vào video tại đây..."></textarea>
        </div>
      </div>

      <button type="submit" disabled={status === AppStatus.Loading} className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-all duration-200">
        {status === AppStatus.Loading ? <LoadingSpinnerIcon /> : <SparklesIcon />}
        <span>Lập Dàn Ý & Viết Kịch Bản</span>
      </button>
    </form>
  );

  const renderChat = () => (
    <div className="bg-slate-800/50 rounded-xl shadow-2xl shadow-indigo-900/10 border border-slate-700 flex flex-col h-[85vh] animate-fade-in">
        {/* Chat Header */}
        <div className="px-6 py-3 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 rounded-t-xl backdrop-blur-sm">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <FilmIcon className="w-4 h-4 text-indigo-400" />
                    <span className="truncate max-w-[150px] sm:max-w-xs" title={config.topic}>{config.topic}</span>
                </div>
                <div className="text-xs text-slate-500 hidden sm:block">
                    {STRUCTURE_OPTIONS.find(s => s.value === config.structure)?.label} • {config.audience} • <span className="text-indigo-400">{config.language}</span>
                </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
                <button 
                    onClick={handleClearHistory}
                    className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm bg-slate-700 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 border border-transparent text-slate-300 rounded transition-all"
                    title="Tạo kịch bản mới"
                >
                    <TrashIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Tạo mới</span>
                </button>
                <div className="h-6 w-px bg-slate-600 mx-1"></div>
                <button 
                    onClick={handleExportScript}
                    className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm bg-slate-700 hover:bg-indigo-900/30 hover:text-indigo-400 hover:border-indigo-900/50 border border-transparent text-slate-200 rounded transition-all"
                    title="Tải kịch bản dạng .txt"
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">.TXT</span>
                </button>
                <button 
                    onClick={handleExportDoc}
                    className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm bg-indigo-700 hover:bg-indigo-600 border border-transparent text-white rounded transition-all shadow-lg shadow-indigo-900/50"
                    title="Tải kịch bản dạng Word/Google Doc"
                >
                    <DocIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">.DOC</span>
                </button>
            </div>
        </div>

        {/* Messages Area */}
        <div ref={chatContainerRef} className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-500 flex items-center justify-center mt-1 shadow-lg shadow-indigo-500/20">
                            <FilmIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                    <div className={`max-w-3xl p-4 rounded-xl relative group ${msg.role === 'user' ? 'bg-slate-700 text-slate-200' : 'bg-slate-900 text-slate-300 shadow-sm ring-1 ring-white/5'}`}>
                         {msg.role === 'model' ? (
                            <FormattedMessage content={msg.content} />
                         ) : (
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                         )}
                         
                         {msg.role === 'model' && (
                             <button 
                                onClick={() => handleCopyToClipboard(msg.content)} 
                                className="absolute top-2 right-2 p-1.5 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-slate-700 rounded transition-all"
                                title="Sao chép"
                             >
                                 <ClipboardIcon className="w-4 h-4" />
                             </button>
                         )}
                    </div>
                    {msg.role === 'user' && (
                        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-600 flex items-center justify-center mt-1">
                            <UserIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                </div>
            ))}
            {status === AppStatus.Loading && messages[messages.length-1]?.role === 'user' && (
                 <div className="flex items-start gap-3 justify-start">
                     <div className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-500 flex items-center justify-center mt-1 shadow-lg shadow-indigo-500/20">
                         <FilmIcon className="w-5 h-5 text-white" />
                     </div>
                     <div className="max-w-xl p-4 rounded-xl bg-slate-900 flex items-center border border-slate-800">
                        <LoadingSpinnerIcon className="w-5 h-5 text-indigo-400" />
                        <span className="ml-3 text-slate-400 text-sm font-medium">Đang suy nghĩ và viết kịch bản...</span>
                     </div>
                 </div>
            )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700 bg-slate-800/80 p-4 rounded-b-xl space-y-3 backdrop-blur-md relative">
            {/* Suggestions Popover */}
            {showSuggestions && (
                <div className="absolute bottom-full left-4 mb-2 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in-up">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase bg-slate-950/50">Gợi ý lệnh</div>
                    {filteredCommands.map((cmd, idx) => (
                        <button
                            key={cmd.id}
                            onClick={() => applyCommand(cmd)}
                            className={`w-full text-left px-4 py-2.5 flex flex-col gap-0.5 transition-colors ${idx === suggestionIndex ? 'bg-indigo-900/50 text-indigo-200' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                            <span className="font-mono text-sm font-bold text-indigo-400">{cmd.label}</span>
                            <span className="text-xs text-slate-400">{cmd.desc}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                {QUICK_ACTIONS.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleQuickAction(action.prompt)}
                        disabled={status === AppStatus.Loading}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-indigo-200 border border-slate-600 hover:border-indigo-400 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <MagicIcon className="w-3 h-3" />
                        {action.label}
                    </button>
                ))}
            </div>

            {/* Advanced Editor Container */}
            <div className="relative flex flex-col bg-slate-900 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition duration-200">
                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1 p-1.5 border-b border-slate-800 bg-slate-900/50 rounded-t-lg">
                    <button onClick={() => applyFormat('bold')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition" title="In đậm (Ctrl+B)">
                        <BoldIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => applyFormat('italic')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition" title="In nghiêng (Ctrl+I)">
                        <ItalicIcon className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    <span className="text-xs text-slate-500 ml-1">Gõ <code className="bg-slate-800 px-1 rounded text-indigo-400">/</code> để mở menu lệnh</span>
                </div>

                {/* Textarea */}
                <div className="flex items-end gap-2 p-2">
                     <textarea 
                        ref={textareaRef}
                        value={userInput} 
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập yêu cầu, phản hồi hoặc chỉnh sửa cho đoạn kịch bản..."
                        rows={1}
                        className="w-full bg-transparent border-none focus:ring-0 resize-none text-slate-200 placeholder-slate-500 max-h-[200px] min-h-[44px] py-2.5 px-2"
                        disabled={status === AppStatus.Loading}
                    />
                    
                    <div className="flex items-center gap-2 pb-1.5 pr-1">
                        <button 
                            type="button"
                            onClick={toggleVoiceInput}
                            className={`p-2 rounded-full transition-all ${isListening ? 'text-red-500 bg-red-900/20 animate-pulse' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                            title="Nhập bằng giọng nói"
                        >
                            {isListening ? <StopIcon className="w-4 h-4" /> : <MicIcon className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={() => handleSendMessage()}
                            disabled={status === AppStatus.Loading || !userInput.trim()} 
                            className="p-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl">
        <header className="text-center mb-8 animate-fade-in-down">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-30 rounded-full"></div>
                <FilmIcon className="w-10 h-10 text-indigo-400 relative z-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Trợ lý Viết Kịch Bản AI</h1>
          </div>
          <p className="text-slate-400 mt-2 text-lg">Đối tác sáng tạo nội dung chuyên nghiệp.</p>
        </header>
        <main>
          {status === AppStatus.Config && renderConfigForm()}
          {(status === AppStatus.Chatting || status === AppStatus.Loading) && renderChat()}
          {status === AppStatus.Error && error && (
            <div className="p-4 mt-8 bg-red-900/20 border border-red-500/50 text-red-200 rounded-lg flex items-center gap-3 animate-shake">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-semibold">Lỗi Kết Nối</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
              <button 
                onClick={() => setStatus(AppStatus.Config)} 
                className="ml-auto text-sm underline hover:text-white"
              >
                Thử Lại
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

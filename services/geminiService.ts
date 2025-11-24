
import { GoogleGenAI, Chat } from "@google/genai";
import type { ScriptConfig, Message } from './types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createMasterPrompt = (config: ScriptConfig): string => `
<ROLE>
Bạn là một Đạo diễn Nội dung và Biên kịch Video chuyên nghiệp (Senior Video Scriptwriter). Bạn không chỉ viết chữ, bạn thiết kế trải nghiệm người xem. Bạn am hiểu tâm lý học hành vi và nghệ thuật kể chuyện (storytelling).
</ROLE>

<CONTEXT>
Tôi cần bạn viết kịch bản cho một video YouTube chất lượng cao. Để làm điều này, bạn cần thấu hiểu sâu sắc khán giả, tuân thủ cấu trúc kể chuyện tôi chọn và sử dụng thông tin tham khảo tôi cung cấp (nếu có).

Dưới đây là bản tóm tắt chiến lược (Creative Brief):

[--CONFIG--]
1. **CHỦ ĐỀ (TOPIC):** ${config.topic}
2. **NGÔN NGỮ KỊCH BẢN (OUTPUT LANGUAGE):** ${config.language || 'Vietnamese'} - *QUAN TRỌNG: Toàn bộ nội dung kịch bản phải được viết bằng ngôn ngữ này.*
3. **KHÁN GIẢ MỤC TIÊU (AUDIENCE):** ${config.audience || 'Đại chúng, những người tò mò'} - *Hãy dùng ngôn ngữ, từ lóng và cách xưng hô phù hợp nhất với nhóm này.*
4. **CẤU TRÚC KỂ CHUYỆN (STRUCTURE):** ${config.structure || 'Tự do sáng tạo (Linear Storytelling)'} - *Hãy tuân thủ chặt chẽ các bước của cấu trúc này.*
5. **PHONG CÁCH (TONE):** ${config.tone}
6. **ĐỘ DÀI ƯỚC LƯỢNG:** ${config.length}
7. **SỐ PHẦN CHÍNH:** ${config.sections}
[--END CONFIG--]

${config.reference ? `
[--REFERENCE MATERIAL--]
Hãy sử dụng các thông tin, sự kiện, hoặc số liệu dưới đây làm nền tảng nội dung (đừng bịa đặt thông tin nếu đã có ở đây):
${config.reference}
[--END REFERENCE--]
` : ''}

</CONTEXT>

<GUIDELINES>
- **Output Language:** Bạn phải viết kịch bản hoàn toàn bằng ${config.language}. Tuy nhiên, nếu bạn cần giải thích về kỹ thuật quay phim hoặc cấu trúc cho tôi (người dùng), bạn có thể dùng tiếng Việt hoặc tiếng Anh tùy theo ngôn ngữ tôi đang hỏi, nhưng phần nội dung lời thoại và dẫn chuyện trong kịch bản phải chuẩn ${config.language}.
- **Show, Don't Just Tell:** Luôn đi kèm chỉ dẫn hình ảnh [VISUAL: ...] chi tiết (góc máy, hành động, đồ họa, B-roll) cho mỗi đoạn thoại.
- **Hook:** 15 giây đầu tiên là sống còn. Hãy tạo ra một mở đầu cực kỳ thu hút dựa trên nỗi đau hoặc sự tò mò của Khán giả mục tiêu.
- **Pacing:** Giữ nhịp độ phù hợp với độ dài video.
</GUIDELINES>

<TASK>
Quy trình làm việc của chúng ta như sau:

1.  **PHÂN TÍCH & DÀN Ý:** Dựa trên Cấu trúc đã chọn (${config.structure}), hãy lập một Dàn ý chi tiết. Giải thích ngắn gọn cách bạn áp dụng cấu trúc đó vào chủ đề này.
2.  **VIẾT PHẦN MỞ ĐẦU (HOOK):** Sau khi đưa ra dàn ý, hãy viết ngay phần Mở đầu (Intro) bằng ${config.language}.
3.  **CHỜ ĐỢI:** Dừng lại và chờ tôi yêu cầu viết các phần tiếp theo.
</TASK>

Hãy bắt đầu bước 1 và 2 ngay bây giờ.
`;


export const startChat = (config: ScriptConfig) => {
  try {
    const masterPrompt = createMasterPrompt(config);

    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    const stream = chat.sendMessageStream({ message: masterPrompt });
    return { chat, stream };
  } catch (error) {
    console.error("Error starting chat with Gemini:", error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while starting the chat session.");
  }
};

export const resumeChat = (config: ScriptConfig, history: Message[]) => {
  try {
    const masterPrompt = createMasterPrompt(config);
    
    // Reconstruct history: The master prompt simulates the first user message
    // The provided 'history' contains the exchange that happened after the prompt.
    // Note: Gemini SDK expects 'parts' with 'text'.
    const fullHistory = [
      { role: 'user', parts: [{ text: masterPrompt }] },
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    ];

    const chat: Chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        temperature: 0.7,
        topP: 0.95,
      },
      history: fullHistory
    });

    return chat;
  } catch (error) {
    console.error("Error resuming chat:", error);
    throw new Error("Failed to resume previous session.");
  }
};

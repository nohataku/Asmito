// Gemini無料AI用のシンプルなサービス

export interface ParsedShiftRequest {
  date: string;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
  }>;
  type: 'work' | 'off' | 'available';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  confidence: number;
}

export interface NormalizedShiftData {
  originalText: string;
  parsedRequests: ParsedShiftRequest[];
  processingNotes?: string;
}

/**
 * Gemini無料APIを使用した解析
 */
export async function parseShiftRequestWithGemini(
  inputText: string,
  currentYear: number = new Date().getFullYear()
): Promise<NormalizedShiftData> {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API keyが設定されていません');
    }

    const prompt = `
日本のシフト管理システム用AIです。以下のテキストを解析してJSONで返してください。

入力: "${inputText}"
年: ${currentYear}

ルール:
- 日付: "8/1" → "${currentYear}-08-01"
- 時間: "13時-17時" → "13:00-17:00"
- タイプ: 休み→"off", 時間指定→"work", ○→"available"
- 優先度: 絶対→"high", 希望→"medium", どちらでも→"low"

JSON形式で応答:
{
  "parsedRequests": [
    {
      "date": "YYYY-MM-DD",
      "timeSlots": [{"startTime": "HH:MM", "endTime": "HH:MM"}],
      "type": "work|off|available",
      "priority": "high|medium|low",
      "notes": "",
      "confidence": 0.9
    }
  ],
  "processingNotes": ""
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0]?.content?.parts[0]?.text;

    if (!responseText) {
      throw new Error('Gemini APIからの応答が空です');
    }

    // JSONレスポンスを解析
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('有効なJSONレスポンスが見つかりません');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    
    return {
      originalText: inputText,
      parsedRequests: parsedResponse.parsedRequests || [],
      processingNotes: parsedResponse.processingNotes
    };

  } catch (error) {
    console.error('Gemini解析エラー:', error);
    
    // フォールバック: ルールベース解析
    return parseWithRules(inputText, currentYear);
  }
}

/**
 * ルールベースの解析（完全無料フォールバック）
 */
export function parseWithRules(
  inputText: string,
  currentYear: number = new Date().getFullYear()
): NormalizedShiftData {
  const parsedRequests: ParsedShiftRequest[] = [];
  const lines = inputText.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 日付抽出
    const dateMatch = trimmedLine.match(/(\d{1,2})\/(\d{1,2})/);
    if (!dateMatch) continue;

    const month = dateMatch[1].padStart(2, '0');
    const day = dateMatch[2].padStart(2, '0');
    const date = `${currentYear}-${month}-${day}`;

    // 休み判定
    const offPatterns = /休み|お休み|×|❌|OFF/i;
    if (offPatterns.test(trimmedLine)) {
      parsedRequests.push({
        date,
        timeSlots: [],
        type: 'off',
        priority: 'high',
        confidence: 0.8
      });
      continue;
    }

    // 出勤可能判定
    const availablePatterns = /◯|〇|○|出勤可能/i;
    if (availablePatterns.test(trimmedLine)) {
      parsedRequests.push({
        date,
        timeSlots: [],
        type: 'available',
        priority: 'medium',
        confidence: 0.8
      });
      continue;
    }

    // 時間抽出
    const timePatterns = [
      /(\d{1,2}):?(\d{0,2})[時-](\d{1,2}):?(\d{0,2})/,
      /(\d{1,2})[時-](\d{1,2})/,
    ];

    for (const pattern of timePatterns) {
      const timeMatch = trimmedLine.match(pattern);
      if (timeMatch) {
        let startHour = parseInt(timeMatch[1]);
        let startMin = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        let endHour = parseInt(timeMatch[3] || timeMatch[2]);
        let endMin = timeMatch[4] ? parseInt(timeMatch[4]) : 0;

        const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        // 優先度判定
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (/絶対|必ず|どうしても/.test(trimmedLine)) priority = 'high';
        else if (/どちらでも|可能なら/.test(trimmedLine)) priority = 'low';

        parsedRequests.push({
          date,
          timeSlots: [{ startTime, endTime }],
          type: 'work',
          priority,
          confidence: 0.7
        });
        break;
      }
    }
  }

  return {
    originalText: inputText,
    parsedRequests,
    processingNotes: 'ルールベース解析を使用しました'
  };
}

/**
 * 無料AI解析（Geminiメイン、ルールベースフォールバック）
 */
export async function parseShiftRequestFree(
  inputText: string,
  currentYear: number = new Date().getFullYear()
): Promise<NormalizedShiftData> {
  // まずGeminiで解析を試行
  try {
    const result = await parseShiftRequestWithGemini(inputText, currentYear);
    if (result.parsedRequests.length > 0) {
      result.processingNotes = `Geminiによる解析: ${result.processingNotes}`;
      return result;
    }
  } catch (error) {
    console.warn('Gemini解析に失敗:', error);
  }

  // Geminiが失敗した場合はルールベース解析
  return parseWithRules(inputText, currentYear);
}

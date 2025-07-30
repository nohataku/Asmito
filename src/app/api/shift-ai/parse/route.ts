import { NextRequest, NextResponse } from 'next/server';
import { parseShiftRequestWithAI, parseBulkShiftRequests } from '@/services/shiftAIService';
import { parseShiftRequestFree } from '@/services/shiftAIFreeService';

export async function POST(request: NextRequest) {
  try {
    const { text, mode = 'single' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: '有効なテキストが必要です' },
        { status: 400 }
      );
    }

    const aiEngine = process.env.AI_ENGINE || 'free';
    let result;
    
    if (mode === 'bulk') {
      // 複数行の一括処理
      const lines = text.split('\n').filter(line => line.trim());
      
      if (aiEngine === 'openai') {
        result = await parseBulkShiftRequests(lines);
      } else {
        // 無料エンジンを使用
        const results = [];
        for (const line of lines) {
          if (line.trim()) {
            results.push(await parseShiftRequestFree(line.trim()));
          }
        }
        result = results;
      }
    } else {
      // 単一行の処理
      if (aiEngine === 'openai') {
        result = await parseShiftRequestWithAI(text);
      } else {
        result = await parseShiftRequestFree(text);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      engine: aiEngine
    });

  } catch (error) {
    console.error('シフト解析API エラー:', error);
    
    return NextResponse.json(
      { 
        error: 'シフト希望の解析に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    );
  }
}

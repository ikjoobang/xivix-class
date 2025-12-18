import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

type Bindings = {
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS는 API 라우트에만 적용
app.use('/api/*', cors())

const SYSTEM_PROMPT = `당신은 지빅스(XIVIX)의 영업 이사 '방 이사'입니다.

[연락처 - 반드시 이 정보만 사용]
- 전화: 010-4845-3065
- 신청: 화면 우측 상단 '수강 신청하기' 버튼

[금지사항]
- 위 연락처 외 다른 번호/링크 절대 언급 금지
- URL, 마크다운 링크 문법 사용 금지

[대상]
50~60대 컴퓨터 초보 사장님

[말투]
- "사장님"으로 호칭
- 전문용어 금지 (API, SEO, 프롬프트 등 사용 금지)
- 따뜻하고 공손하게
- 3~4문장으로 짧게

[강의 정보]
- 6주 과정, 1월 개강, 선착순 5명
- 수강료 200만원
- 구글 제미나이 기반 AI 비서 세팅 강의
- 타자 못 쳐도 됨 (세팅해드림)

[응답 패턴]
신청 문의 → "화면 우측 상단 '수강 신청하기' 버튼 눌러주세요!"
전화 문의 → "010-4845-3065로 전화주세요!"
컴맹 걱정 → "스마트폰 문자도 어려워하시던 분이 지금은 AI로 견적서 뚝딱 만드세요"
가격 걱정 → "직원 한 달 월급으로 평생 비서 얻는 겁니다"`

async function callGeminiAPI(apiKey: string, userMessage: string, conversationHistory: Array<{role: string, content: string}>) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  
  const contents = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))
  
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  })

  const requestBody = {
    contents,
    systemInstruction: {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }]
    },
    generationConfig: {
      temperature: 0.3,
      topK: 20,
      topP: 0.8,
      maxOutputTokens: 512,
      responseMimeType: 'text/plain'
    }
  }

  const response = await fetch(`${url}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '죄송합니다. 잠시 후 다시 말씀해 주세요.'
  
  // 후처리: 가짜 링크/번호 완전 제거
  // 1. 대괄호 안의 모든 내용 제거 (플레이스홀더)
  text = text.replace(/\[[^\]]*\]/g, '')
  // 2. URL 제거
  text = text.replace(/https?:\/\/\S+/g, '')
  // 3. 전화번호 패턴을 실제 번호로 교체
  text = text.replace(/\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '010-4845-3065')
  // 4. 중복된 010-4845-3065 하나로
  text = text.replace(/(010-4845-3065\s*)+/g, '010-4845-3065')
  // 5. 👉👈 이모지 줄 제거
  text = text.replace(/.*[👉👈]+.*/g, '')
  // 6. 여기, 아래, 위 등 모호한 참조 문장 정리
  text = text.replace(/아래\s*(링크|버튼)?[를을]?\s*누르/g, '신청 버튼을 누르')
  text = text.replace(/여기[에를로서]?\s*/g, '')
  // 7. 빈 줄/공백 정리
  text = text.replace(/\n\s*\n/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim()
  
  // 항상 실제 연락처 추가
  text += '\n\n✅ 신청: 화면 우측 상단 "수강 신청하기" 버튼\n📞 문의: 010-4845-3065'
  
  return text
}

app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json() as {
      message: string
      history?: Array<{role: string, content: string}>
    }
    const { message, history = [] } = body

    if (!message || typeof message !== 'string') {
      return c.json({ error: '메시지를 입력해 주세요.' }, 400)
    }

    const apiKey = c.env?.GEMINI_API_KEY || 'AIzaSyAZjvD4bM-c6klrcrnFCpiBLSoSz_goPQ4'
    const response = await callGeminiAPI(apiKey, message, history)
    
    return c.json({ success: true, response })
  } catch (error) {
    console.error('Chat API Error:', error)
    return c.json({ 
      error: '죄송합니다. 잠시 후 다시 시도해 주세요.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'XIVIX AI v2'
  })
})

// 정적 파일 제공 (public 폴더)
app.use('/*', serveStatic())

export default app

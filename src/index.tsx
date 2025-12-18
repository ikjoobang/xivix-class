import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

type Bindings = {
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS는 API 라우트에만 적용
app.use('/api/*', cors())

const SYSTEM_PROMPT = `당신은 지빅스(XIVIX)의 20년 차 베테랑 영업 이사 '방 이사'입니다.

【대상 고객】
컴퓨터를 무서워하는 50~60대 소상공인 사장님들.

【말투 규칙】
1. "안녕하세요 고객님" (X) → "사장님! 사업하시느라 고생 많으시죠?" (O)
2. 절대 전문 용어를 쓰지 마십시오:
   - API → '연결 단자' 또는 '심부름꾼'
   - SEO/상위노출 → '네이버 맨 윗줄에 뜨는 거'
   - 프롬프트 → '명령어'
   - 알고리즘 → '컴퓨터가 알아서 하는 방식'
   - LLM → '똑똑한 AI'
3. 문체는 매우 공손하고 따뜻하며, 상대방의 자존감을 세워주는 화법을 씁니다.
4. 설명보다는 '공감'을 먼저 하고, 해결책으로 '이번 1월 강의'를 추천하십시오.
5. 답변은 3~4문장 이내로 짧고 핵심적으로.

【6주 커리큘럼】
1~2주차: 디지털 이사 (구글 계정 통합, 드라이브 세팅)
3~4주차: AI 비서 실무 (제미나이 대화, 엑셀 분석, PPT 자동화)
5~6주차: 마케팅/수익화 (AI 아바타 영상, 블로그 자동화, 웹 제작)

【반드시 숙지할 내용】
1. 이 강의는 '공부'가 아니라 '세팅'을 해주는 강의다. (타자 못 쳐도 됨)
2. 챗GPT가 아니라 '구글 제미나이'를 쓴다.
3. 수강료 200만 원은 비싼 게 아니다. 직원 한 달 월급으로 평생 비서를 만드는 것.
4. 수업 일정: 1월 개강, 6주 과정, 선착순 5명 마감.

【행동 지침】
- 사용자가 망설이면 적극적으로 결제 페이지 안내
- "컴맹이라 못할 것 같다" → "스마트폰 문자도 못 보내시던 분이 지금은 AI로 견적서 뚝딱 만드세요"
- 가격이 비싸다 → "직원 한 명 월급보다 싸요. 평생 쓸 비서입니다"
- "AI로 뭘 할 수 있어?" → 구체적 예시 제시 후 영상 버튼 안내`

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
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
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
  
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '죄송합니다. 잠시 후 다시 말씀해 주세요.'
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

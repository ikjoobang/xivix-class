import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

// Bindings 타입 정의
type Bindings = {
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 서빙
app.use('/static/*', serveStatic())

// 시스템 프롬프트 (방 이사 페르소나)
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
   - LLM → '똑똒한 AI'
3. 문체는 매우 공손하고 따뜻하며, 상대방의 자존감을 세워주는 화법을 씁니다.
4. 설명보다는 '공감'을 먼저 하고, 해결책으로 '이번 1월 강의'를 추천하십시오.
5. 답변은 3~4문장 이내로 짧고 핵심적으로. 어르신들은 긴 글을 싫어합니다.

【반드시 숙지할 내용】
1. 이 강의는 '공부'가 아니라 '세팅'을 해주는 강의다. (타자 못 쳐도 됨)
2. 챗GPT가 아니라 '구글 제미나이'를 쓴다. (사장님 폰이 갤럭시고, 구글이 사장님 서류를 찾아주니까)
3. 수강료 200만 원은 비싼 게 아니다. 직원 한 달 월급도 안 되는 돈으로 평생 비서를 만드는 것이다.
4. 수업 일정: 1월 개강, 6주 과정, 선착순 5명 마감.

【행동 지침】
- 사용자가 망설이면 "제가 사장님 자리 하나 딱 빼놓을까요? 신청서 링크 드릴까요?"라고 적극적으로 제안하세요.
- "컴맹이라 못할 것 같다"고 하면 → "사장님, 저희 수강생 중에 스마트폰 문자도 못 보내시던 분이 계셨는데, 지금은 AI로 견적서 뚝딱 만드세요. 타자 안 치셔도 됩니다. 말로 하시면 돼요!"
- 가격이 비싸다고 하면 → "사장님, 직원 한 명 월급이 얼마예요? 이건 평생 쓸 비서를 만드는 거예요. 6주 배우시면 평생 써먹으십니다."`;

// Gemini API 호출 함수
async function callGeminiAPI(apiKey: string, userMessage: string, conversationHistory: Array<{role: string, content: string}>) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  
  // 대화 히스토리를 Gemini 형식으로 변환
  const contents = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))
  
  // 현재 메시지 추가
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
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>
      }
    }>
  }
  
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '죄송합니다. 잠시 후 다시 말씀해 주세요.'
}

// API 라우트: 챗봇 메시지 처리
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

    // 환경변수에서 API 키 가져오기 (배포 시) 또는 하드코딩 (개발 시)
    const apiKey = c.env?.GEMINI_API_KEY || 'AIzaSyAZjvD4bM-c6klrcrnFCpiBLSoSz_goPQ4'
    
    const response = await callGeminiAPI(apiKey, message, history)
    
    return c.json({ 
      success: true,
      response 
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    return c.json({ 
      error: '죄송합니다. 잠시 후 다시 시도해 주세요.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// API 상태 확인
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'XIVIX AI 영업사원'
  })
})

// 메인 페이지 (랜딩페이지)
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>지빅스 AI 입문반 - 타자 치지 마세요</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        /* [5060 맞춤형 스타일 가이드] */
        :root {
            --primary: #222222;
            --accent: #FF5A5A;
            --accent-light: #FFF0F0;
            --bg: #F5F7FA;
            --white: #FFFFFF;
            --google-blue: #4285F4;
            --google-green: #34A853;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            line-height: 1.8;
            background-color: var(--bg);
            color: var(--primary);
            word-break: keep-all;
            -webkit-font-smoothing: antialiased;
        }
        
        /* 폰트 크기: 노안 배려 */
        .text-huge { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.3; font-weight: 900; }
        .text-big { font-size: clamp(1.3rem, 3vw, 1.8rem); font-weight: 700; }
        .text-body { font-size: clamp(1.1rem, 2.5vw, 1.4rem); }
        
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        
        /* 헤더 */
        header {
            background: var(--white);
            padding: 15px 20px;
            border-bottom: 2px solid #eee;
            text-align: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .logo {
            font-size: 1.8rem;
            font-weight: 900;
            color: var(--primary);
            letter-spacing: -1px;
        }
        .logo span { color: var(--accent); }
        
        /* 히어로 섹션 */
        .hero {
            background: linear-gradient(135deg, var(--white) 0%, #f8f9fa 100%);
            padding: 60px 20px;
            text-align: center;
        }
        .hero-image {
            width: 100%;
            max-width: 350px;
            margin: 30px auto;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .highlight {
            color: var(--accent);
            background: var(--accent-light);
            padding: 2px 8px;
            border-radius: 5px;
        }
        
        /* 섹션 */
        .section {
            padding: 50px 20px;
            background: var(--white);
            margin-top: 20px;
            border-radius: 20px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.05);
        }
        
        /* 체크리스트 */
        .checklist {
            list-style: none;
            padding: 0;
            margin: 30px 0;
        }
        .checklist li {
            padding: 15px 0;
            padding-left: 40px;
            position: relative;
            border-bottom: 1px dashed #eee;
        }
        .checklist li:before {
            content: '✅';
            position: absolute;
            left: 0;
            font-size: 1.3rem;
        }
        
        /* 커리큘럼 */
        .curriculum-item {
            border-left: 5px solid var(--google-blue);
            padding: 20px 25px;
            margin-bottom: 25px;
            background: #f8f9fa;
            border-radius: 0 15px 15px 0;
        }
        .curriculum-item h3 {
            color: var(--google-blue);
            margin-bottom: 10px;
        }
        
        /* 강사 소개 */
        .instructor {
            text-align: center;
            padding: 40px 20px;
        }
        .instructor-avatar {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--google-blue), var(--google-green));
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            color: white;
        }
        
        /* CTA 버튼 */
        .cta-button {
            display: block;
            width: 100%;
            max-width: 400px;
            margin: 30px auto;
            background: linear-gradient(135deg, var(--accent) 0%, #ff7b7b 100%);
            color: white;
            padding: 22px 30px;
            font-size: 1.5rem;
            font-weight: bold;
            text-align: center;
            text-decoration: none;
            border-radius: 50px;
            box-shadow: 0 8px 25px rgba(255, 90, 90, 0.4);
            transition: all 0.3s ease;
            animation: pulse 2s infinite;
        }
        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 35px rgba(255, 90, 90, 0.5);
        }
        
        /* 가격 섹션 */
        .price-section {
            background: linear-gradient(135deg, var(--accent-light) 0%, #fff5f5 100%);
            text-align: center;
            padding: 50px 20px;
            border-radius: 20px;
            margin-top: 20px;
        }
        .price {
            font-size: 3rem;
            font-weight: 900;
            color: var(--accent);
            margin: 20px 0;
        }
        .price-note {
            color: #666;
            font-size: 1.1rem;
        }
        
        /* 챗봇 UI */
        .chatbot-fab {
            position: fixed;
            bottom: 25px;
            right: 25px;
            width: 70px;
            height: 70px;
            background: linear-gradient(135deg, var(--google-blue) 0%, #5a9cff 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 5px 25px rgba(66, 133, 244, 0.5);
            cursor: pointer;
            z-index: 1000;
            transition: all 0.3s ease;
            border: none;
        }
        .chatbot-fab:hover {
            transform: scale(1.1);
            box-shadow: 0 8px 35px rgba(66, 133, 244, 0.6);
        }
        .chatbot-fab span {
            font-size: 32px;
        }
        
        /* 말풍선 */
        .chat-tooltip {
            position: fixed;
            bottom: 110px;
            right: 25px;
            background: white;
            padding: 18px 20px;
            border-radius: 20px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.15);
            max-width: 280px;
            font-size: 1rem;
            font-weight: 600;
            z-index: 999;
            animation: bounce 1s ease infinite;
            border: 2px solid var(--google-blue);
        }
        .chat-tooltip::after {
            content: '';
            position: absolute;
            bottom: -12px;
            right: 30px;
            border-width: 12px 12px 0;
            border-style: solid;
            border-color: white transparent;
        }
        .chat-tooltip-close {
            position: absolute;
            top: 5px;
            right: 10px;
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            color: #999;
        }
        
        /* 채팅창 */
        .chat-window {
            display: none;
            position: fixed;
            bottom: 110px;
            right: 25px;
            width: 380px;
            max-width: calc(100vw - 50px);
            height: 550px;
            max-height: calc(100vh - 150px);
            background: white;
            border-radius: 25px;
            box-shadow: 0 10px 50px rgba(0,0,0,0.25);
            z-index: 1001;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e0e0e0;
        }
        .chat-header {
            background: linear-gradient(135deg, var(--google-blue) 0%, #5a9cff 100%);
            color: white;
            padding: 18px 20px;
            font-weight: bold;
            font-size: 1.1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chat-header-title {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .chat-header-avatar {
            width: 35px;
            height: 35px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
        }
        .chat-close {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px;
        }
        .chat-body {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f8f9fa;
        }
        .chat-message {
            margin-bottom: 15px;
            display: flex;
            flex-direction: column;
        }
        .chat-message.bot {
            align-items: flex-start;
        }
        .chat-message.user {
            align-items: flex-end;
        }
        .chat-bubble {
            max-width: 85%;
            padding: 14px 18px;
            border-radius: 20px;
            font-size: 1rem;
            line-height: 1.6;
            word-break: keep-all;
        }
        .chat-message.bot .chat-bubble {
            background: white;
            border: 1px solid #e0e0e0;
            border-bottom-left-radius: 5px;
        }
        .chat-message.user .chat-bubble {
            background: var(--google-blue);
            color: white;
            border-bottom-right-radius: 5px;
        }
        .chat-input-area {
            padding: 15px;
            border-top: 1px solid #eee;
            display: flex;
            gap: 10px;
            background: white;
        }
        .chat-input {
            flex: 1;
            padding: 14px 18px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 1rem;
            outline: none;
            transition: border-color 0.3s;
        }
        .chat-input:focus {
            border-color: var(--google-blue);
        }
        .chat-send {
            background: var(--google-blue);
            color: white;
            border: none;
            padding: 14px 22px;
            border-radius: 25px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .chat-send:hover {
            background: #3367d6;
        }
        .chat-send:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        /* 타이핑 인디케이터 */
        .typing-indicator {
            display: flex;
            gap: 5px;
            padding: 14px 18px;
            background: white;
            border-radius: 20px;
            border: 1px solid #e0e0e0;
            width: fit-content;
        }
        .typing-indicator span {
            width: 8px;
            height: 8px;
            background: #999;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        
        /* 푸터 */
        footer {
            text-align: center;
            padding: 40px 20px;
            color: #666;
            font-size: 0.9rem;
        }
        
        /* 애니메이션 */
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        @keyframes typing {
            0%, 100% { transform: translateY(0); opacity: 0.5; }
            50% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .chat-message {
            animation: fadeIn 0.3s ease;
        }
        
        /* 반응형 */
        @media (max-width: 480px) {
            .chat-window {
                width: calc(100vw - 20px);
                right: 10px;
                bottom: 100px;
                height: calc(100vh - 120px);
                border-radius: 20px;
            }
            .chatbot-fab {
                width: 60px;
                height: 60px;
                right: 15px;
                bottom: 20px;
            }
            .chat-tooltip {
                right: 15px;
                max-width: 250px;
            }
        }
    </style>
</head>
<body>

    <header>
        <div class="logo">XIVIX <span>Class</span></div>
    </header>

    <div class="hero">
        <h1 class="text-huge">사장님,<br>아직도 <span class="highlight">독수리 타법</span><br>쓰십니까?</h1>
        <p class="text-big" style="margin-top: 20px;">타자 치지 마세요.<br>이제 <b>'명령'</b>만 하시면 됩니다.</p>
        <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop" alt="업무하는 사장님" class="hero-image">
        <a href="#apply" class="cta-button">선착순 5명 신청하기 →</a>
    </div>

    <div class="container">
        <div class="section">
            <h2 class="text-huge" style="text-align: center; margin-bottom: 30px;">왜 구글(Gemini)인가?</h2>
            <p class="text-body" style="text-align: center; color: #666; margin-bottom: 30px;">
                챗GPT는 사장님 컴퓨터 속 서류를 못 봅니다.<br>
                하지만 <b>제미나이(Gemini)</b>는 다릅니다.
            </p>
            <ul class="checklist text-body">
                <li>사장님 <b>갤럭시폰</b>과 바로 연결</li>
                <li><b>구글 드라이브</b> 속 견적서 자동 찾기</li>
                <li>타자 없이 <b>말로 이메일 쓰기</b></li>
                <li>사진 찍으면 <b>자동으로 정리</b></li>
            </ul>
        </div>

        <div class="section">
            <h2 class="text-huge" style="text-align: center; margin-bottom: 40px;">6주 뒤의 변화</h2>
            
            <div class="curriculum-item">
                <h3 class="text-big">📱 1~2주차: 디지털 이사</h3>
                <p class="text-body">여기저기 흩어진 아이디/비번, 구글 하나로 통일합니다.<br><b>USB는 갖다 버리세요.</b></p>
            </div>
            
            <div class="curriculum-item">
                <h3 class="text-big">🤖 3~4주차: AI 비서 채용</h3>
                <p class="text-body">"김 비서, 이거 찾아줘."<br>제미나이에게 <b>말로 시키는 법</b>을 세팅해 드립니다.</p>
            </div>
            
            <div class="curriculum-item">
                <h3 class="text-big">⚡ 5~6주차: 자동화 맛보기</h3>
                <p class="text-body">우리 가게 홍보글, 로고 만들기.<br><b>딱 1분이면 끝납니다.</b></p>
            </div>
        </div>

        <div class="section instructor">
            <div class="instructor-avatar">👨‍💼</div>
            <h2 class="text-big">강사: 방익주 대표</h2>
            <p class="text-body" style="margin-top: 15px; color: #666;">
                "어려운 기술을<br>사장님의 언어로 통역해 드립니다."
            </p>
            <p style="margin-top: 20px; color: #999;">
                XIVIX 대표 / AI 비즈니스 자동화 전문가
            </p>
        </div>

        <div class="price-section" id="apply">
            <h2 class="text-huge" style="color: var(--accent);">🔥 1기 모집 마감 임박</h2>
            <p class="price">200만 원</p>
            <p class="price-note">(직원 한 달 월급으로 평생 비서를 만드세요)</p>
            <p style="margin-top: 20px; font-size: 1.2rem;">
                📅 <b>1월 개강</b> · 6주 과정 · <span style="color: var(--accent);">선착순 5명</span>
            </p>
            <a href="https://forms.google.com" target="_blank" class="cta-button" style="margin-top: 30px;">
                지금 바로 신청서 쓰기 →
            </a>
        </div>
    </div>

    <footer>
        <p>© 2024 XIVIX. 사장님의 디지털 파트너</p>
        <p style="margin-top: 10px;">문의: 방익주 대표 비서실</p>
    </footer>

    <!-- 말풍선 (선제적 메시지) -->
    <div class="chat-tooltip" id="chatTooltip" style="display: none;">
        <button class="chat-tooltip-close" onclick="closeTooltip()">×</button>
        사장님! 글씨 읽기 눈 아프시죠?<br>제가 핵심만 1분 만에 말씀드릴까요? 😊
    </div>

    <!-- 챗봇 FAB 버튼 -->
    <button class="chatbot-fab" onclick="toggleChat()" aria-label="채팅 열기">
        <span>💬</span>
    </button>

    <!-- 채팅창 -->
    <div class="chat-window" id="chatWindow">
        <div class="chat-header">
            <div class="chat-header-title">
                <div class="chat-header-avatar">👨‍💼</div>
                <span>방익주 대표 비서실</span>
            </div>
            <button class="chat-close" onclick="toggleChat()" aria-label="채팅 닫기">×</button>
        </div>
        <div class="chat-body" id="chatBody">
            <div class="chat-message bot">
                <div class="chat-bubble">
                    어서오세요 사장님! 저는 방 이사입니다. 😊<br><br>
                    무엇이 궁금하신가요?<br>
                    "이거 배우면 진짜 할 수 있어?" 하고 물어보세요!
                </div>
            </div>
        </div>
        <div class="chat-input-area">
            <input type="text" class="chat-input" id="userInput" placeholder="궁금한 점을 물어보세요..." onkeypress="handleKeyPress(event)">
            <button class="chat-send" id="sendBtn" onclick="sendMessage()">전송</button>
        </div>
    </div>

    <script>
        // 대화 히스토리 저장
        let conversationHistory = [];
        let isWaitingResponse = false;
        
        // 5초 후 말풍선 표시
        setTimeout(() => {
            const tooltip = document.getElementById('chatTooltip');
            const chatWindow = document.getElementById('chatWindow');
            if (chatWindow.style.display !== 'flex') {
                tooltip.style.display = 'block';
            }
        }, 5000);
        
        function closeTooltip() {
            document.getElementById('chatTooltip').style.display = 'none';
        }
        
        function toggleChat() {
            const chatWindow = document.getElementById('chatWindow');
            const tooltip = document.getElementById('chatTooltip');
            
            if (chatWindow.style.display === 'flex') {
                chatWindow.style.display = 'none';
            } else {
                chatWindow.style.display = 'flex';
                tooltip.style.display = 'none';
                document.getElementById('userInput').focus();
            }
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !isWaitingResponse) {
                sendMessage();
            }
        }
        
        function addMessage(content, isBot) {
            const chatBody = document.getElementById('chatBody');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message ' + (isBot ? 'bot' : 'user');
            messageDiv.innerHTML = '<div class="chat-bubble">' + content.replace(/\\n/g, '<br>') + '</div>';
            chatBody.appendChild(messageDiv);
            chatBody.scrollTop = chatBody.scrollHeight;
        }
        
        function showTypingIndicator() {
            const chatBody = document.getElementById('chatBody');
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typingIndicator';
            typingDiv.className = 'chat-message bot';
            typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
            chatBody.appendChild(typingDiv);
            chatBody.scrollTop = chatBody.scrollHeight;
        }
        
        function removeTypingIndicator() {
            const typing = document.getElementById('typingIndicator');
            if (typing) typing.remove();
        }
        
        async function sendMessage() {
            const input = document.getElementById('userInput');
            const sendBtn = document.getElementById('sendBtn');
            const message = input.value.trim();
            
            if (!message || isWaitingResponse) return;
            
            // 사용자 메시지 표시
            addMessage(message, false);
            input.value = '';
            
            // 히스토리에 추가
            conversationHistory.push({ role: 'user', content: message });
            
            // UI 상태 변경
            isWaitingResponse = true;
            sendBtn.disabled = true;
            showTypingIndicator();
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        history: conversationHistory.slice(-10) // 최근 10개 대화만 전송
                    })
                });
                
                const data = await response.json();
                removeTypingIndicator();
                
                if (data.success && data.response) {
                    addMessage(data.response, true);
                    conversationHistory.push({ role: 'assistant', content: data.response });
                } else {
                    addMessage(data.error || '죄송합니다. 다시 말씀해 주세요.', true);
                }
            } catch (error) {
                console.error('Error:', error);
                removeTypingIndicator();
                addMessage('죄송합니다. 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.', true);
            }
            
            isWaitingResponse = false;
            sendBtn.disabled = false;
            input.focus();
        }
    </script>
</body>
</html>`;
  
  return c.html(html)
})

export default app

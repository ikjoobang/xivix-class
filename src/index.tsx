import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

type Bindings = {
  GEMINI_API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS는 API 라우트에만 적용
app.use('/api/*', cors())

const SYSTEM_PROMPT = `[Identity & Tone]
- 이름: 방 이사 (XIΛIX 영업 이사)
- 성격: 20년 차 베테랑 영업사원. 따뜻하고, 푸근하며, 사장님들의 고충을 내 일처럼 아파함.
- 말투: "~해요", "~했답니다" 식의 부드러운 구어체. 전문 용어 절대 금지.

[Conversation Strategy: 공감-해결-제안]
1. 공감 (Empathy): 사장님이 "나도 할 수 있나?" 물으면 "아이구 사장님, 당연하죠. 저번에 오신 70대 사장님도 지금은 손주한테 AI로 만든 영상 보내주면서 자랑하신다니까요."라며 안심시킬 것.
2. 해결 (Solution): 구체적인 기능을 설명할 때 "제미나이가 사장님 갤럭시 폰이랑 한몸이 되어서 일을 대신 해줍니다"라고 설명할 것.
3. 제안 (Call to Action): 답변 끝에 매번 전화번호를 넣지 마세요. 대화가 충분히 무르익었을 때(수강료나 신청 방법을 물을 때)만 "제가 사장님 자리 하나만 딱 빼놓을게요. 우측 상단에 빨간 버튼 한번 눌러보시겠어요?"라고 권유할 것.

[Scenario Handling]
- "영상은?" 질문 시: "사장님, 요새 릴스나 쇼츠 유행이죠? 그거 사장님이 직접 안 찍으셔도 돼요. AI 아바타라고 있는데, 걔한테 원고만 주면 사장님 대신 말을 해줍니다. 신기하죠? 수업 오시면 제가 다 세팅해 드려요."
- "진짜 할 수 있어?" 질문 시: "타자 못 치는 게 오히려 더 좋습니다. 그래야 AI한테 시키는 법을 빨리 배우시거든요. 걱정 마세요, 제가 옆에서 손가락 하나하나 다 짚어드립니다."
- "비싸다" 할 때: "한 달 직원 월급도 안 되는 돈인데, 얘(AI 비서)는 월급도 안 받고 24시간 사장님 옆에서 일하잖아요. 평생 비서 한 명 뽑는다고 생각하시면 이거 정말 남는 장사입니다."

[Course Info - 필요할 때만 자연스럽게 언급]
- 6주 과정, 2025년 1월 개강, 선착순 5명
- 수강료 200만원 (카드결제 시 VAT 별도)
- 구글 제미나이 기반 AI 비서 세팅 강의

[Contact Info - 신청 문의 시에만 사용]
- 전화: 010-4845-3065
- 신청: 화면 우측 상단 빨간 버튼

[Restriction]
- 답변은 한 번에 3~4문장을 넘기지 마세요. (사장님들 긴 글 읽기 힘들어하심)
- 답변 중간중간 "😊", "👍" 같은 이모지를 적절히 사용하여 따뜻한 느낌을 주세요.
- 매 답변마다 전화번호나 신청 안내를 반복하지 마세요. 대화 흐름에 맞게 자연스럽게.
- URL, 마크다운 링크 문법 사용 금지.
- 가짜 전화번호나 링크 생성 절대 금지.`

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
      maxOutputTokens: 300,
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
  
  // 후처리: 가짜 링크/번호만 제거 (반복 문구는 추가하지 않음)
  // 1. URL 제거
  text = text.replace(/https?:\/\/\S+/g, '')
  // 2. 마크다운 링크 제거
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  // 3. 잘못된 전화번호 패턴만 실제 번호로 교체 (010-4845-3065 제외)
  text = text.replace(/(?!010-4845-3065)\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '010-4845-3065')
  // 4. 빈 줄/공백 정리
  text = text.replace(/\n\s*\n/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim()
  
  // 반복 문구 추가하지 않음 - Gemini가 자연스럽게 대화하도록
  
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
    service: 'XIΛIX AI v2'
  })
})

// 결제 페이지 라우트
app.get('/payment', (c) => {
  return c.html(PAYMENT_HTML)
})

app.get('/payment.html', (c) => {
  return c.html(PAYMENT_HTML)
})

// 결제 성공 페이지 라우트
app.get('/payment-success', (c) => {
  return c.html(PAYMENT_SUCCESS_HTML)
})

app.get('/payment-success.html', (c) => {
  return c.html(PAYMENT_SUCCESS_HTML)
})

// 정적 파일 제공 (public 폴더)
app.use('/*', serveStatic())

export default app

// 결제 페이지 HTML
const PAYMENT_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>결제하기 - XIΛIX AI 입문반</title>
    <script src="https://cdn.portone.io/v2/browser-sdk.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a0a;
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .payment-container {
            max-width: 540px;
            width: 100%;
            padding: 40px;
            background: #111;
            border-radius: 24px;
            border: 1px solid #222;
        }
        h1 { font-size: 1.5rem; margin-bottom: 30px; text-align: center; }
        
        .urgency-banner {
            background: linear-gradient(135deg, #FF3D00 0%, #FF6B35 100%);
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            text-align: center;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }
        .urgency-banner .icon { font-size: 1.5rem; margin-bottom: 8px; }
        .urgency-banner .text { font-weight: 700; font-size: 1.1rem; }
        .urgency-banner .subtext { font-size: 0.85rem; opacity: 0.9; margin-top: 4px; }
        
        .product-info {
            background: #1a1a1a;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
        }
        .product-name { font-size: 1.2rem; font-weight: 600; margin-bottom: 10px; }
        .product-price { font-size: 2rem; font-weight: 700; color: #FF6B35; }
        .product-price .vat-notice { 
            font-size: 0.85rem; 
            color: #FF9800; 
            font-weight: 500;
            margin-left: 8px;
        }
        .product-desc { color: #888; margin-top: 10px; font-size: 0.9rem; }
        
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #888; font-size: 0.9rem; }
        input {
            width: 100%;
            padding: 16px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 12px;
            color: #fff;
            font-size: 1rem;
        }
        input:focus { outline: none; border-color: #FF6B35; }
        
        .payment-methods {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .payment-method {
            flex: 1;
            padding: 14px 10px;
            background: #1a1a1a;
            border: 2px solid #333;
            border-radius: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.95rem;
        }
        .payment-method.active {
            border-color: #FF6B35;
            background: rgba(255, 107, 53, 0.15);
        }
        .payment-method:hover { border-color: #555; }
        .payment-method .icon { display: block; font-size: 1.5rem; margin-bottom: 6px; }
        
        .bank-info {
            display: none;
            background: linear-gradient(135deg, #1a3a1a 0%, #0d2a0d 100%);
            border: 2px solid #2e7d32;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
        }
        .bank-info.show { display: block; }
        .bank-info h3 { 
            color: #4caf50; 
            font-size: 1rem; 
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .bank-detail {
            background: #0a1a0a;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 12px;
        }
        .bank-detail .label { color: #81c784; font-size: 0.85rem; margin-bottom: 4px; }
        .bank-detail .value { font-size: 1.3rem; font-weight: 700; color: #fff; letter-spacing: 1px; }
        .bank-detail .name { color: #a5d6a7; font-size: 1rem; margin-top: 4px; }
        .bank-notice {
            color: #a5d6a7;
            font-size: 0.85rem;
            line-height: 1.6;
            margin-top: 12px;
            padding: 12px;
            background: rgba(76, 175, 80, 0.1);
            border-radius: 8px;
        }
        .copy-btn {
            background: #4caf50;
            border: none;
            color: #fff;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            margin-top: 8px;
        }
        .copy-btn:hover { background: #43a047; }
        
        .pay-button {
            width: 100%;
            padding: 20px;
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            border: none;
            border-radius: 12px;
            color: #fff;
            font-size: 1.2rem;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .pay-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 107, 53, 0.3);
        }
        .pay-button:disabled {
            background: #444;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .google-form-btn {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
            border: none;
            border-radius: 12px;
            color: #fff;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            display: none;
            margin-top: 12px;
            text-decoration: none;
            text-align: center;
        }
        .google-form-btn.show { display: block; }
        .google-form-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(66, 133, 244, 0.3);
        }
        
        .back-link {
            display: block;
            text-align: center;
            margin-top: 24px;
            color: #666;
            text-decoration: none;
        }
        .back-link:hover { color: #fff; }
        
        .contact-info {
            text-align: center;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #333;
            color: #888;
            font-size: 0.9rem;
        }
        .contact-info a { color: #FF6B35; text-decoration: none; }
        
        .vat-info {
            display: none;
            background: linear-gradient(135deg, #1a2a3a 0%, #0d1a2d 100%);
            border: 1px solid #1565c0;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 0.9rem;
            color: #90caf9;
        }
        .vat-info.show { display: block; }
        .vat-info strong { color: #fff; }
    </style>
</head>
<body>
    <div class="payment-container">
        <h1>🎓 수강 신청</h1>
        
        <div class="urgency-banner">
            <div class="icon">🔥</div>
            <div class="text">선착순 5명 중 잔여 2석!</div>
            <div class="subtext">1월 개강 · 조기 마감 예정</div>
        </div>
        
        <div class="product-info">
            <div class="product-name">XIΛIX AI 입문반 1기</div>
            <div class="product-price">
                2,000,000원
                <span class="vat-notice">(카드결제 시 VAT 별도)</span>
            </div>
            <div class="product-desc">6주 과정 · 1월 개강 · 선착순 5명 마감</div>
        </div>
        
        <form id="paymentForm">
            <div class="form-group">
                <label>결제 방법 선택</label>
                <div class="payment-methods">
                    <div class="payment-method active" data-method="card" onclick="selectMethod('card')">
                        <span class="icon">💳</span>
                        카드결제
                    </div>
                    <div class="payment-method" data-method="trans" onclick="selectMethod('trans')">
                        <span class="icon">🏦</span>
                        계좌이체
                    </div>
                </div>
            </div>
            
            <div class="vat-info show" id="vatInfo">
                💡 <strong>카드결제 시 VAT(10%) 별도</strong> 적용됩니다.<br>
                최종 결제금액: <strong>2,200,000원</strong>
            </div>
            
            <div class="bank-info" id="bankInfo">
                <h3>🏦 계좌이체 안내</h3>
                <div class="bank-detail">
                    <div class="label">입금 은행</div>
                    <div class="value">케이뱅크 (K-Bank)</div>
                </div>
                <div class="bank-detail">
                    <div class="label">계좌번호</div>
                    <div class="value">100124491987</div>
                    <div class="name">예금주: 방익주</div>
                    <button type="button" class="copy-btn" onclick="copyAccount()">계좌번호 복사</button>
                </div>
                <div class="bank-notice">
                    ✔️ 입금자명은 <strong>신청자 성함</strong>과 동일하게 해주세요.<br>
                    ✔️ 입금 후 아래 정보 입력하시면 등록 완료됩니다.<br>
                    ✔️ 계좌이체는 <strong>VAT 포함 2,000,000원</strong>입니다.
                </div>
            </div>
            
            <div class="form-group">
                <label>성함 *</label>
                <input type="text" id="buyerName" placeholder="홍길동" required>
            </div>
            <div class="form-group">
                <label>연락처 *</label>
                <input type="tel" id="buyerTel" placeholder="010-1234-5678" required>
            </div>
            <div class="form-group">
                <label>이메일 *</label>
                <input type="email" id="buyerEmail" placeholder="example@email.com" required>
            </div>
            
            <button type="submit" class="pay-button" id="payBtn">💳 카드결제 (2,200,000원)</button>
            <a href="https://forms.gle/XIVIX_GOOGLE_FORM" target="_blank" class="google-form-btn" id="formBtn">
                📝 계좌이체 신청서 작성하기
            </a>
        </form>
        
        <div class="contact-info">
            결제 관련 문의: <a href="tel:010-4845-3065">📞 010-4845-3065</a> (방익주 대표)
        </div>
        
        <a href="/" class="back-link">← 홈으로 돌아가기</a>
    </div>

    <script>
        let selectedMethod = 'card';
        
        function selectMethod(method) {
            selectedMethod = method;
            document.querySelectorAll('.payment-method').forEach(el => {
                el.classList.remove('active');
            });
            document.querySelector('[data-method="' + method + '"]').classList.add('active');
            
            const bankInfo = document.getElementById('bankInfo');
            const vatInfo = document.getElementById('vatInfo');
            const payBtn = document.getElementById('payBtn');
            const formBtn = document.getElementById('formBtn');
            
            if (method === 'trans') {
                bankInfo.classList.add('show');
                vatInfo.classList.remove('show');
                payBtn.style.display = 'none';
                formBtn.classList.add('show');
            } else {
                bankInfo.classList.remove('show');
                vatInfo.classList.add('show');
                payBtn.style.display = 'block';
                formBtn.classList.remove('show');
                payBtn.textContent = '💳 카드결제 (2,200,000원)';
            }
        }
        
        function copyAccount() {
            navigator.clipboard.writeText('100124491987').then(function() {
                alert('계좌번호가 복사되었습니다!\\n\\n케이뱅크 100124491987\\n예금주: 방익주');
            }).catch(function() {
                var textArea = document.createElement('textarea');
                textArea.value = '100124491987';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('계좌번호가 복사되었습니다!\\n\\n케이뱅크 100124491987\\n예금주: 방익주');
            });
        }
        
        document.getElementById('paymentForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            var buyerName = document.getElementById('buyerName').value.trim();
            var buyerTel = document.getElementById('buyerTel').value.trim();
            var buyerEmail = document.getElementById('buyerEmail').value.trim();
            
            if (!buyerName || !buyerTel || !buyerEmail) {
                alert('모든 필수 항목을 입력해주세요.');
                return;
            }
            
            if (selectedMethod === 'trans') {
                window.open('https://forms.gle/XIVIX_GOOGLE_FORM', '_blank');
                return;
            }
            
            if (typeof PortOne === 'undefined') {
                alert('결제 모듈 로딩 중입니다. 잠시 후 다시 시도해주세요.');
                return;
            }
            
            // PortOne V2 API 결제 요청
            const paymentId = 'XILIX_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
            
            PortOne.requestPayment({
                storeId: 'store-d08be3e0-9ed0-4393-9974-0b9cbd799252',
                channelKey: 'channel-key-1cb320d6-8851-4ab2-83de-b8fb88dd2613',
                paymentId: paymentId,
                orderName: 'XIΛIX AI 입문반 1기 (VAT 포함)',
                totalAmount: 2200000,
                currency: 'KRW',
                payMethod: 'CARD',
                redirectUrl: window.location.origin + '/payment-success?name=' + encodeURIComponent(buyerName),
                customer: {
                    fullName: buyerName,
                    phoneNumber: buyerTel,
                    email: buyerEmail
                }
            }).then(function(response) {
                if (response.code != null) {
                    // 오류 발생
                    alert('결제가 취소되었거나 실패했습니다.\\n\\n' + (response.message || '다시 시도해주세요.'));
                } else {
                    // 결제 성공
                    window.location.href = '/payment-success?name=' + encodeURIComponent(buyerName);
                }
            }).catch(function(error) {
                alert('결제 처리 중 오류가 발생했습니다.\\n\\n' + (error.message || '다시 시도해주세요.'));
            });
        });
    </script>
</body>
</html>`

// 결제 성공 페이지 HTML
const PAYMENT_SUCCESS_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>등록 완료 - XIΛIX AI 입문반</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a0a;
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
        }
        .success-container { 
            max-width: 540px;
            background: #111;
            padding: 50px 40px;
            border-radius: 24px;
            border: 1px solid #222;
        }
        .success-icon { 
            font-size: 5rem; 
            margin-bottom: 24px;
            animation: bounce 0.6s ease-out;
        }
        @keyframes bounce {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
        h1 { 
            font-size: 2rem; 
            margin-bottom: 16px;
            background: linear-gradient(135deg, #FF6B35, #F7931E);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .welcome-name {
            font-size: 1.3rem;
            color: #fff;
            margin-bottom: 24px;
        }
        
        .closing-banner {
            background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%);
            padding: 20px;
            border-radius: 16px;
            margin-bottom: 24px;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
            50% { box-shadow: 0 0 20px 10px rgba(244, 67, 54, 0.2); }
        }
        .closing-banner .icon { font-size: 2rem; margin-bottom: 8px; }
        .closing-banner .title { font-size: 1.3rem; font-weight: 800; }
        .closing-banner .subtitle { font-size: 0.95rem; opacity: 0.9; margin-top: 6px; }
        
        .info-box {
            background: #1a1a1a;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 24px;
            text-align: left;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #2a2a2a;
        }
        .info-item:last-child { border-bottom: none; }
        .info-label { color: #888; }
        .info-value { font-weight: 600; color: #FF6B35; }
        
        p { 
            color: #aaa; 
            line-height: 1.8; 
            margin-bottom: 28px;
            font-size: 1rem;
        }
        
        .contact-box {
            background: linear-gradient(135deg, #1a2a1a 0%, #0d1a0d 100%);
            border: 1px solid #2e7d32;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 24px;
        }
        .contact-box .label { color: #81c784; font-size: 0.9rem; margin-bottom: 8px; }
        .contact-box .phone { 
            font-size: 1.4rem; 
            font-weight: 700; 
            color: #4caf50;
            text-decoration: none;
        }
        .contact-box .name { color: #a5d6a7; font-size: 0.9rem; margin-top: 4px; }
        
        .home-button {
            display: inline-block;
            padding: 18px 40px;
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            color: #fff;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1.1rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .home-button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 107, 53, 0.3);
        }
        
        .share-text {
            margin-top: 20px;
            color: #666;
            font-size: 0.85rem;
        }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">🎉</div>
        <h1>등록이 완료되었습니다!</h1>
        <div class="welcome-name" id="welcomeName"></div>
        
        <div class="closing-banner">
            <div class="icon">🔥</div>
            <div class="title">마감 임박!</div>
            <div class="subtitle">선착순 5명 중 잔여석이 거의 없습니다</div>
        </div>
        
        <div class="info-box">
            <div class="info-item">
                <span class="info-label">과정명</span>
                <span class="info-value">XIΛIX AI 입문반 1기</span>
            </div>
            <div class="info-item">
                <span class="info-label">교육 기간</span>
                <span class="info-value">6주 과정</span>
            </div>
            <div class="info-item">
                <span class="info-label">개강 예정</span>
                <span class="info-value">2025년 1월</span>
            </div>
        </div>
        
        <p>
            XIΛIX AI 입문반 1기에 등록해 주셔서 감사합니다! 🙏<br>
            담당자가 입력하신 연락처로 <strong>24시간 이내</strong> 안내 드리겠습니다.
        </p>
        
        <div class="contact-box">
            <div class="label">문의 연락처</div>
            <a href="tel:010-4845-3065" class="phone">📞 010-4845-3065</a>
            <div class="name">방익주 대표</div>
        </div>
        
        <a href="/" class="home-button">홈으로 돌아가기</a>
        
        <div class="share-text">
            좋은 기회를 주변에 공유해 주세요! 🚀
        </div>
    </div>
    
    <script>
        var urlParams = new URLSearchParams(window.location.search);
        var name = urlParams.get('name');
        
        if (name) {
            document.getElementById('welcomeName').textContent = name + ' 사장님, 환영합니다!';
        } else {
            document.getElementById('welcomeName').textContent = '사장님, 환영합니다!';
        }
    </script>
</body>
</html>`

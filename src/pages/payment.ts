export const paymentPage = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>결제하기 - XIVIX AI 입문반</title>
    <script src="https://cdn.iamport.kr/v1/iamport.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
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
            max-width: 500px;
            width: 100%;
            padding: 40px;
            background: #111;
            border-radius: 24px;
            border: 1px solid #222;
        }
        h1 { font-size: 1.5rem; margin-bottom: 30px; text-align: center; }
        .product-info {
            background: #1a1a1a;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 30px;
        }
        .product-name { font-size: 1.2rem; font-weight: 600; margin-bottom: 10px; }
        .product-price { font-size: 2rem; font-weight: 700; color: #FF6B35; }
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
        .pay-button {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            border: none;
            border-radius: 12px;
            color: #fff;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .pay-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 107, 53, 0.3);
        }
        .back-link {
            display: block;
            text-align: center;
            margin-top: 20px;
            color: #666;
            text-decoration: none;
        }
        .back-link:hover { color: #fff; }
        .payment-methods {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .payment-method {
            flex: 1;
            padding: 14px;
            background: #1a1a1a;
            border: 2px solid #333;
            border-radius: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .payment-method:hover { border-color: #FF6B35; }
        .payment-method.active { border-color: #FF6B35; background: rgba(255, 107, 53, 0.1); }
        .payment-method span { display: block; font-size: 0.85rem; color: #888; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="payment-container">
        <h1>수강 신청</h1>
        <div class="product-info">
            <div class="product-name">XIVIX AI 입문반 1기</div>
            <div class="product-price">2,000,000원</div>
            <div class="product-desc">6주 과정 · 1월 개강 · 선착순 5명</div>
        </div>
        
        <div class="payment-methods">
            <div class="payment-method active" data-method="card" onclick="selectMethod(this)">
                💳<span>카드결제</span>
            </div>
            <div class="payment-method" data-method="vbank" onclick="selectMethod(this)">
                🏦<span>무통장입금</span>
            </div>
        </div>
        
        <form id="paymentForm">
            <div class="form-group">
                <label>성함</label>
                <input type="text" id="buyerName" placeholder="홍길동" required>
            </div>
            <div class="form-group">
                <label>연락처</label>
                <input type="tel" id="buyerTel" placeholder="010-1234-5678" required>
            </div>
            <div class="form-group">
                <label>이메일</label>
                <input type="email" id="buyerEmail" placeholder="example@email.com" required>
            </div>
            <button type="submit" class="pay-button">결제하기</button>
        </form>
        <a href="/" class="back-link">← 홈으로 돌아가기</a>
    </div>

    <script>
        let selectedMethod = 'card';
        
        function selectMethod(el) {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            el.classList.add('active');
            selectedMethod = el.dataset.method;
        }
        
        document.getElementById('paymentForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const buyerName = document.getElementById('buyerName').value;
            const buyerTel = document.getElementById('buyerTel').value;
            const buyerEmail = document.getElementById('buyerEmail').value;
            
            // 아임포트 초기화 (실제 가맹점 식별코드 필요)
            // IMP.init('imp00000000');
            
            // 테스트용 - 실제 결제 연동 시 아래 코드 활성화
            alert('결제 기능 준비 중입니다.\\n\\n' +
                  '성함: ' + buyerName + '\\n' +
                  '연락처: ' + buyerTel + '\\n' +
                  '이메일: ' + buyerEmail + '\\n' +
                  '결제방식: ' + (selectedMethod === 'card' ? '카드결제' : '무통장입금') + '\\n\\n' +
                  '문의: 방익주 대표 비서실');
            
            /*
            IMP.request_pay({
                pg: 'html5_inicis.MOI9559449',
                pay_method: selectedMethod,
                merchant_uid: 'XIVIX_' + new Date().getTime(),
                name: 'XIVIX AI 입문반 1기',
                amount: 2000000,
                buyer_email: buyerEmail,
                buyer_name: buyerName,
                buyer_tel: buyerTel,
            }, function(rsp) {
                if (rsp.success) {
                    alert('결제가 완료되었습니다!');
                    window.location.href = '/payment-success?imp_uid=' + rsp.imp_uid;
                } else {
                    alert('결제 실패: ' + rsp.error_msg);
                }
            });
            */
        });
    </script>
</body>
</html>`;

export const paymentSuccessPage = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>결제 완료 - XIVIX</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap" rel="stylesheet">
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
        .success-container { max-width: 500px; }
        .success-icon { font-size: 4rem; margin-bottom: 20px; }
        h1 { font-size: 2rem; margin-bottom: 20px; }
        p { color: #888; line-height: 1.8; margin-bottom: 30px; }
        .home-button {
            display: inline-block;
            padding: 16px 32px;
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            color: #fff;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .home-button:hover { transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="success-icon">✅</div>
        <h1>결제가 완료되었습니다!</h1>
        <p>XIVIX AI 입문반 1기에 등록해 주셔서 감사합니다.<br>
        담당자가 입력하신 연락처로 곧 안내 드리겠습니다.</p>
        <a href="/" class="home-button">홈으로 돌아가기</a>
    </div>
</body>
</html>`;

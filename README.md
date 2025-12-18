# XIVIX Class - AI 교육 랜딩페이지

## 프로젝트 개요
- **Name**: XIVIX Class
- **Goal**: 405060 소상공인 대상 AI 교육(입문반) 모집용 원페이지 사이트
- **Target**: PC/IT 용어를 전혀 모르는 5060 사장님 (컴맹)

## URLs
- **Production**: https://xivix-class.pages.dev
- **API Health**: https://xivix-class.pages.dev/api/health
- **Chat API**: https://xivix-class.pages.dev/api/chat

## 완료된 기능

### ❶ 랜딩페이지 (5060 맞춤형)
- ✅ 큰 글씨 (노안 배려)
- ✅ 간결한 문장 (word-break: keep-all)
- ✅ 시각적 강조 (체크리스트, 컬러 하이라이트)
- ✅ 모바일 반응형 디자인
- ✅ 스크롤 방식 정보 전달

### ❷ AI 챗봇 ('방 이사' 페르소나)
- ✅ 우측 하단 FAB 버튼 (💬)
- ✅ **선제적 메시지** (5초 후 말풍선 자동 표시)
- ✅ 대화창 UI (채팅 버블, 타이핑 인디케이터)
- ✅ 대화 히스토리 관리 (최근 10개 유지)
- ✅ 빠른 응답 속도 (Gemini 2.0 Flash - 1.5초 이내)

### ❸ AI 영업사원 시스템 프롬프트
- ✅ 전문 용어 금지 (API → '심부름꾼', SEO → '네이버 맨 윗줄')
- ✅ 따뜻하고 공손한 말투
- ✅ 공감 우선, 해결책 제안
- ✅ 적극적 수강 신청 유도

## 기술 스택
- **Backend**: Hono (TypeScript)
- **AI**: Google Gemini 2.0 Flash
- **Hosting**: Cloudflare Pages
- **Styling**: Noto Sans KR, CSS Variables

## API 명세

### GET /api/health
서비스 상태 확인

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-18T00:49:39.102Z",
  "service": "XIVIX AI 영업사원"
}
```

### POST /api/chat
챗봇 대화

**Request Body:**
```json
{
  "message": "이거 배우면 나같은 컴맹도 할 수 있어?",
  "history": [
    {"role": "user", "content": "이전 질문"},
    {"role": "assistant", "content": "이전 답변"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "사장님, 당연히 하실 수 있습니다! ..."
}
```

## 환경 변수
- `GEMINI_API_KEY`: Google AI Studio API Key (Cloudflare Secret으로 설정됨)

## 배포 방법
```bash
# 빌드
npm run build

# Cloudflare Pages 배포
npm run deploy:prod
```

## 구글 폼 연동 방법
1. Google Forms에서 수강 신청 폼 생성
2. `src/index.tsx` 파일에서 `href="https://forms.google.com"` 부분을 실제 폼 URL로 교체

## 향후 개발 예정
- [ ] 이미지 생성 기능 (Imagen 3 연동)
- [ ] 구글 폼 연동
- [ ] 수강생 후기 섹션 추가
- [ ] FAQ 섹션 추가

## 배포 정보
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active
- **Last Updated**: 2025-12-18

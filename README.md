# XIVIX Class v2.0 - AI 교육 랜딩페이지

## 프로젝트 개요
- **Name**: XIVIX Class
- **Version**: 2.0 (전면 리뉴얼)
- **Goal**: 405060 소상공인 대상 AI 교육(입문반) 모집용 원페이지 사이트
- **Target**: PC/IT 용어를 전혀 모르는 5060 사장님

## URLs
| 환경 | URL |
|------|-----|
| **Production** | https://xivix-class.pages.dev |
| **결제 페이지** | https://xivix-class.pages.dev/payment |
| **결제 완료** | https://xivix-class.pages.dev/payment-success |

## 완료된 기능

### ❶ 디자인 리뉴얼
- ✅ 다크모드 기반 세련된 디자인
- ✅ 와이드 레이아웃 (1400px)
- ✅ 포인트 컬러: #FF6B35 (오렌지)
- ✅ studiojuai.club 스타일 적용
- ✅ 모바일/태블릿/데스크톱 반응형

### ❷ 섹션 구성
- Hero: 메인 카피 + YouTube 영상
- Stats: 핵심 수치 (80% 절감, 6주, 5명)
- Problem: 타겟 고객 고민 공감
- Solution: 제미나이 장점
- Curriculum: 6주 상세 커리큘럼
- Instructor: 방익주 대표 소개
- CTA: 가격 및 신청 유도

### ❸ 6주 커리큘럼 상세
| 주차 | 주제 | 내용 |
|------|------|------|
| 1~2주 | 디지털 이사 | 구글 계정 통합, 드라이브 세팅, 갤럭시 연동 |
| 3~4주 | AI 비서 실무 | 제미나이 대화법, 엑셀 분석, PPT 자동화 |
| 5~6주 | 마케팅/수익화 | AI 아바타 영상, 블로그 자동화, 웹 제작 |

### ❹ AI 챗봇 ('방 이사')
- ✅ 5초 후 선제적 말걸기
- ✅ 영상 시연 버튼 (YouTube 임베드)
- ✅ 전문 용어 없는 친근한 화법
- ✅ Gemini 2.0 Flash (응답 1.3초)

### ❺ 결제 시스템
- ✅ KG이니시스 연동 준비 완료
- ✅ 카드결제 / 무통장입금 선택
- ⚠️ 실결제는 아임포트 가맹점 등록 후 활성화

## 기술 스택
- **Backend**: Hono (TypeScript)
- **AI**: Google Gemini 2.0 Flash
- **Hosting**: Cloudflare Pages
- **Payment**: KG이니시스 (아임포트)
- **Design**: CSS Variables, Dark Mode

## API 명세

### GET /api/health
```json
{"status":"ok","timestamp":"...","service":"XIVIX AI v2"}
```

### POST /api/chat
```json
// Request
{"message": "질문 내용", "history": [...]}

// Response
{"success": true, "response": "AI 응답"}
```

## 환경 변수
| 변수 | 설명 |
|------|------|
| `GEMINI_API_KEY` | Google AI Studio API Key |

## KG이니시스 정보 (참고용)
```
상점ID: MOI9559449
Sign Key: bDJKcjZ2QkkwZjFHcXZ0MFJEMGZYQT09
```

## 배포 방법
```bash
npm run build
npm run deploy:prod
```

## 프로젝트 구조
```
webapp/
├── src/
│   ├── index.tsx        # 메인 앱 (API + 라우팅)
│   └── pages/
│       ├── landing.ts   # 랜딩페이지 HTML
│       └── payment.ts   # 결제/완료 페이지 HTML
├── public/
├── ecosystem.config.cjs
├── wrangler.jsonc
└── package.json
```

## 향후 개발 예정
- [ ] KG이니시스 실결제 활성화
- [ ] 커스텀 도메인 연결 (class.xivix.kr)
- [ ] Google Analytics 연동
- [ ] 실제 강사 이미지 적용

---
**Last Updated**: 2025-12-18  
**Status**: ✅ Production Ready

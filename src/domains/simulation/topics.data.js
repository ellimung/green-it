/**
 * topics.data.js - 4대 환경 주제 메타데이터 및 정책 파라미터 정의
 */

const TOPICS_DATA = {
  FOREST: {
    id: 'FOREST',
    categoryName: '산림생태',
    tagline: '지구의 초록 허파를 지키고 탄소를 흡수하는 숲 생태계',
    icon: '🌲',
    themeColor: '#059669', // Emerald-600
    accentColor: '#10B981',
    bgGradient: 'from-emerald-900/60 to-teal-950/80',
    keywords: ['산림 탄소 흡수', '도심 녹지 회복', '생태축 복원', '야생동물 서식지'],
    weights: {
      budget: 0.35,      // 토지 매입 및 조림 예산
      regulation: 0.35,  // 산림 보호구역 개발 제한
      techRnd: 0.30      // 산림 탄소 계측 및 병충해 AI 방제
    },
    sliders: [
      { key: 'budget', label: '산림 복원 및 도심숲 조성 예산', min: 0, max: 100, defaultVal: 60, desc: '국유림 확대, 도심 바람길숲 및 훼손지 생태 복원 투자' },
      { key: 'regulation', label: '산림 보호구역 개발 규제 강도', min: 0, max: 100, defaultVal: 50, desc: '산림 전용 제한, 벌채 허가제 강화 및 훼손 행위 처벌' },
      { key: 'techRnd', label: '산림 탄소 계측 및 위성 AI R&D', min: 0, max: 100, defaultVal: 55, desc: '드론·위성 기반 탄소 흡수량 정밀 측정 및 스마트 산불 감시' }
    ]
  },

  OCEAN: {
    id: 'OCEAN',
    categoryName: '해양생태',
    tagline: '기후위기에 신음하는 바다와 블루카본을 지키는 해양 수호',
    icon: '🌊',
    themeColor: '#0284C7', // Sky-600
    accentColor: '#38BDF8',
    bgGradient: 'from-sky-950/70 to-blue-950/80',
    keywords: ['해양 보호구역(MPA)', '고수온 백화현상', '블루카본 복원', '지속가능한 수산'],
    weights: {
      budget: 0.30,      // 연안 인프라 및 블루카본 조성
      regulation: 0.45,  // 어획량 제한(TAC) 및 불법 어업 강력 규제
      techRnd: 0.25      // 해양 위성 탐사 및 부이 센서 데이터
    },
    sliders: [
      { key: 'budget', label: '해양 완충습지 및 블루카본 복원 예산', min: 0, max: 100, defaultVal: 50, desc: '잘피림, 염습지, 산호 군락 인공 증식 및 해안선 복원' },
      { key: 'regulation', label: '해양보호구역(MPA) 및 어획 규제 강도', min: 0, max: 100, defaultVal: 65, desc: '총허용어획량(TAC) 엄격 적용 및 플라스틱 배출 금지' },
      { key: 'techRnd', label: '해양 AI 부이 및 위성 관측 R&D', min: 0, max: 100, defaultVal: 45, desc: '실시간 적조·수온 예측 센서 및 친환경 해양 방제제 개발' }
    ]
  },

  ENERGY: {
    id: 'ENERGY',
    categoryName: '기후에너지',
    tagline: '화석연료를 넘어 무한 청정 에너지로의 대전환',
    icon: '⚡',
    themeColor: '#D97706', // Amber-600
    accentColor: '#F59E0B',
    bgGradient: 'from-amber-950/60 to-orange-950/80',
    keywords: ['신재생에너지(태양·풍력)', '스마트그리드', '탄소중립 로드맵', '제로에너지 빌딩'],
    weights: {
      budget: 0.30,      // 청정에너지 인프라 보조금
      regulation: 0.30,  // 온실가스 배출권 거래제 및 탄소세
      techRnd: 0.40      // 페로브스카이트·그린수소 혁신 R&D
    },
    sliders: [
      { key: 'budget', label: '신재생에너지 보급 및 스마트그리드 예산', min: 0, max: 100, defaultVal: 65, desc: '태양광·해상풍력 발전소 설치 지원 및 송배전망 지능화' },
      { key: 'regulation', label: '온실가스 배출 규제 및 탄소세 강도', min: 0, max: 100, defaultVal: 55, desc: '다배출 기업 감축 의무 부과 및 화석연료 보조금 폐지' },
      { key: 'techRnd', label: '차세대 청정에너지 및 에너지 저장(ESS) R&D', min: 0, max: 100, defaultVal: 75, desc: '고효율 태양전지, 수소 수전해, 대용량 배터리 혁신 연구' }
    ]
  },

  RECYCLE: {
    id: 'RECYCLE',
    categoryName: '자원순환',
    tagline: '폐기물을 0으로 만드는 순환경제와 친환경 신소재',
    icon: '🔄',
    themeColor: '#0D9488', // Teal-600
    accentColor: '#14B8A6',
    bgGradient: 'from-teal-950/60 to-cyan-950/80',
    keywords: ['순환경제(Circular)', '생분해 바이오 플라스틱', '도시광산 희소금속', '업사이클링'],
    weights: {
      budget: 0.25,      // 스마트 분리수거 및 공공 선별장 인프라
      regulation: 0.40,  // 일회용품 전면 금지 및 생산자책임(EPR)
      techRnd: 0.35      // 생분해 신소재 및 배터리 재활용 공정
    },
    sliders: [
      { key: 'budget', label: '스마트 재활용 및 순환 인프라 투자', min: 0, max: 100, defaultVal: 55, desc: 'IoT 기반 무인 회수기 보급 및 폐기물 자동 선별 현대화' },
      { key: 'regulation', label: '일회용 플라스틱 규제 및 포장재 법제화', min: 0, max: 100, defaultVal: 70, desc: '과대포장 금지, 일회용 컵 보증금제 및 친환경 인증 의무' },
      { key: 'techRnd', label: '생분해 소재(PHA) 및 희소금속 재활용 R&D', min: 0, max: 100, defaultVal: 60, desc: '미세플라스틱 제로 신소재 및 폐배터리 리튬·니켈 추출 기술' }
    ]
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TOPICS_DATA };
}

/**
 * DEPLOY_ALL_IN_ONE.gs - 그린잇! (Green-it!) 단일 통합 배포 파일
 * 
 * [비개발자 교사용 원클릭 배포 안내]
 * 1. 구글 스프레드시트를 하나 만들고 [확장 프로그램] > [Apps Script]를 클릭합니다.
 * 2. 기존 코드를 모두 지우고 본 파일의 내용 전체를 복사해서 붙여넣습니다.
 * 3. 상단 함수 선택창에서 'initDatabase'를 선택하고 [실행]을 누릅니다. (직업 DB 자동 생성)
 * 4. 우측 상단 [배포] > [새 배포]를 누르고 유형을 '웹 앱'으로 선택합니다.
 *    - 액세스 권한: '모든 사용자(Anyone)'로 설정
 * 5. 생성된 '웹 앱 URL'을 복사하여 그린잇! 프론트엔드 환경설정에 넣으면 끝납니다!
 */

// ==========================================
// 1. CONFIG & CONSTANTS
// ==========================================
const CONFIG = {
  SHEET_NAMES: {
    META: '_CLASS_META_',
    JOBS: '_JOBS_MASTER_'
  },
  MASTER_PIN: '9999',
  LOCK_TIMEOUT_MS: 10000,
  HEADERS: {
    META: [
      'class_id',
      'school_name',
      'grade',
      'class_num',
      'grade_tier',
      'teacher_pin',
      'sheet_name',
      'is_unlocked',
      'created_at'
    ],
    JOBS: [
      'category',
      'score_min',
      'score_max',
      'job_name',
      'desc_elem',
      'desc_sec',
      'sub1',
      'sub2',
      'feedback_elem',
      'feedback_sec'
    ],
    CLASS_STUDENT: [
      'timestamp',
      'student_key',
      'student_no',
      'student_name',
      'topic',
      'param_budget',
      'param_regul',
      'param_rnd',
      'total_score',
      'matched_job',
      'sub_jobs'
    ]
  },
  ERRORS: {
    INVALID_ACTION: 'ERR_INVALID_ACTION',
    CLASS_NOT_FOUND: 'ERR_CLASS_NOT_FOUND',
    AUTH_FAILED: 'ERR_AUTH_FAILED',
    LOCK_TIMEOUT: 'ERR_LOCK_TIMEOUT',
    VALIDATION_FAILED: 'ERR_VALIDATION_FAILED',
    INTERNAL_ERROR: 'ERR_INTERNAL_ERROR'
  }
};

function createResponse(success, action, dataOrError, message) {
  const payload = {
    success: success,
    action: action,
    timestamp: new Date().toISOString()
  };

  if (success) {
    payload.data = dataOrError || {};
    if (message) payload.message = message;
  } else {
    payload.error = {
      code: (dataOrError && dataOrError.code) || CONFIG.ERRORS.INTERNAL_ERROR,
      message: (dataOrError && dataOrError.message) || message || '처리 중 오류가 발생했습니다.'
    };
  }

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 2. LOCK MANAGER
// ==========================================
var LockManager = {
  withLock: function(callback, timeoutMs) {
    var timeout = timeoutMs || CONFIG.LOCK_TIMEOUT_MS;
    var lock = LockService.getDocumentLock();
    if (!lock) lock = LockService.getScriptLock();

    var success = lock.tryLock(timeout);
    if (!success) {
      throw {
        code: CONFIG.ERRORS.LOCK_TIMEOUT,
        message: '동시 접속자가 많아 처리 대기 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
      };
    }

    try {
      return callback();
    } finally {
      lock.releaseLock();
    }
  }
};

// ==========================================
// 3. JOB SERVICE (30 GREEN JOBS)
// ==========================================
var JobService = {
  MASTER_JOBS: [
    // 산림생태 (7)
    {
      category: '산림생태', score_min: 80, score_max: 100, job_name: '산림탄소회계사',
      desc_elem: '나무와 숲이 빨아들이는 탄소 양을 정확히 세어 지구 온도를 낮추는 숲의 은행원!',
      desc_sec: '국제 탄소배출권 인증 기준(VCS/REDD+)에 기반하여 산림 생태계의 탄소 흡수량을 정량 평가·감사하는 전문 직무입니다.',
      sub1: '산림경영기획가', sub2: '도시숲설계가',
      feedback_elem: '지구를 위한 뛰어난 거시적 설계 감각을 지녔어요!',
      feedback_sec: '탄소중립 제도와 ESG 거버넌스를 아우르는 거시적 전략 기획 역량이 탁월합니다.'
    },
    {
      category: '산림생태', score_min: 80, score_max: 100, job_name: '도시숲설계가',
      desc_elem: '콘크리트 빌딩 사이에 시원한 바람길과 푸른 나무 쉼터를 만드는 도심 정원 건축가!',
      desc_sec: '열섬 현상 완화와 도시 생태축 연결을 위해 기후 복원력 기반 도시녹지를 입체 설계하는 공간 디자이너입니다.',
      sub1: '생태복원전문가', sub2: '산림치유지도사',
      feedback_elem: '사람과 자연이 함께 숨 쉬는 푸른 도시를 상상하는 힘이 대단해요!',
      feedback_sec: '도시계획과 조경생태학적 원리를 융합하여 기후 적응형 녹지 네트워크를 구축하는 역량이 돋보입니다.'
    },
    {
      category: '산림생태', score_min: 50, score_max: 79, job_name: '생태복원전문가',
      desc_elem: '불이 나거나 파괴된 숲에 흙을 덮고 어린 나무를 심어 숲의 상처를 치료하는 의사 선생님!',
      desc_sec: '훼손된 산림 생태계의 토양·식생 데이터를 분석하여 고유종 중심의 서식지 자연 천이를 유도하는 복원 공학자입니다.',
      sub1: '백두대간생태조사관', sub2: '야생동식물보호원',
      feedback_elem: '파괴된 숲을 포기하지 않고 끈기 있게 되살리는 따뜻한 마음을 가졌어요!',
      feedback_sec: '제한된 예산과 규제 속에서도 과학적 복원 메커니즘을 적용하는 현장 중심 실행력이 우수합니다.'
    },
    {
      category: '산림생태', score_min: 50, score_max: 79, job_name: '산림경영기획가',
      desc_elem: '나무가 건강하게 자랄 수 있도록 숲을 계획하고 돌보는 든든한 숲 매니저!',
      desc_sec: '목재 생산, 생태계 보전, 탄소 흡수 기능을 종합적으로 고려하여 지속가능한 산림 자원 순환 체계를 설계하는 기획자입니다.',
      sub1: '산림탄소회계사', sub2: '산림치유지도사',
      feedback_elem: '숲의 현재와 미래를 골고루 살피는 균형 잡힌 시각이 돋보여요!',
      feedback_sec: '경제적 효용과 환경적 가치 사이의 절충점을 도출하는 합리적 정책 기획 역량이 돋보입니다.'
    },
    {
      category: '산림생태', score_min: 50, score_max: 79, job_name: '산림치유지도사',
      desc_elem: '숲속 맑은 공기와 피톤치드로 지친 사람들의 마음과 몸을 건강하게 치료해 주는 숲의 친구!',
      desc_sec: '산림 생태 인프라를 활용하여 스트레스 완화 및 환경성 질환 예방을 위한 과학적 치유 프로그램을 개발·운용하는 헬스케어 전문가입니다.',
      sub1: '도시숲설계가', sub2: '백두대간생태조사관',
      feedback_elem: '자연의 품에서 사람들에게 행복과 건강을 전해주는 다정한 리더예요!',
      feedback_sec: '생태 자원의 공공 보건적 가치를 발굴하여 시민 복지와 연계하는 창의적 융합 사고가 뛰어납니다.'
    },
    {
      category: '산림생태', score_min: 0, score_max: 49, job_name: '야생동식물보호원',
      desc_elem: '사라져가는 멸종위기 동물과 다친 숲속 친구들을 가장 먼저 구하러 달려가는 용감한 구조대원!',
      desc_sec: '서식지 단절 및 기후변화로 멸종위기에 처한 생물종을 현장에서 모니터링하고 불법 포획·외래종 교란을 차단하는 생태계 방어자입니다.',
      sub1: '백두대간생태조사관', sub2: '생태복원전문가',
      feedback_elem: '위험에 처한 동물 친구들을 구하러 가장 먼저 달려갈 용기 있는 지구 지킴이!',
      feedback_sec: '이론에 머물지 않고 생태계 위기 현장에 즉각 개입하여 생물다양성을 수호하는 강한 사명감과 행동력이 돋보입니다.'
    },
    {
      category: '산림생태', score_min: 0, score_max: 49, job_name: '백두대간생태조사관',
      desc_elem: '우리 땅의 거대한 산줄기를 구석구석 탐험하며 자연의 건강 상태를 수첩에 적는 숲속 탐험가!',
      desc_sec: '한반도 핵심 생태축인 백두대간의 식생 변화와 기후 민감종 동태를 조사하여 국가 생물다양성 정책의 기초 데이터를 구축하는 조사관입니다.',
      sub1: '생태복원전문가', sub2: '야생동식물보호원',
      feedback_elem: '거친 산길도 마다하지 않고 지구의 신호를 꼼꼼히 기록하는 탐험대장!',
      feedback_sec: '데이터 공백이 심한 기후 사각지대를 직접 발로 뛰며 국가 환경 통계의 신뢰성을 확보하는 블루오션 개척 역량이 탁월합니다.'
    },

    // 해양생태 (7)
    {
      category: '해양생태', score_min: 80, score_max: 100, job_name: '해양데이터사이언티스트',
      desc_elem: '넓은 바다의 수온과 조류를 컴퓨터 인공지능으로 분석해 바다의 미래를 예언하는 마법사!',
      desc_sec: '위성 원격탐사와 해양 부이(Buoy) 센서 빅데이터를 딥러닝으로 분석하여 적조·엘니뇨 및 해양 환경 변화를 예측하는 데이터 공학자입니다.',
      sub1: '기후적응전문가', sub2: '수산자원컨설턴트',
      feedback_elem: '바다의 방대한 신호를 읽어내는 뛰어난 지혜와 호기심을 지녔어요!',
      feedback_sec: '정밀 해양 물리 데이터와 인공지능 예측 모델을 결합하여 거시적 해양 거버넌스를 선도할 잠재력이 충분합니다.'
    },
    {
      category: '해양생태', score_min: 80, score_max: 100, job_name: '수산자원컨설턴트',
      desc_elem: '물고기들이 대를 이어 행복하게 살 수 있도록 어부 아저씨들과 약속을 정하는 바다 약속 대장!',
      desc_sec: '총허용어획량(TAC) 제도 및 블루이코노미 관점에서 수산 자원의 재생산 주기와 어촌 경제의 지속가능성을 설계하는 해양 정책 컨설턴트입니다.',
      sub1: '해양데이터사이언티스트', sub2: '산호초정원사',
      feedback_elem: '바다 생물과 어부 모두가 함께 웃을 수 있는 약속을 이끄는 멋진 중재자예요!',
      feedback_sec: '자원 보전 규제와 어촌 경제의 상생 메커니즘을 분석하는 거시적 경제·정책 분석 역량이 탁월합니다.'
    },
    {
      category: '해양생태', score_min: 50, score_max: 79, job_name: '기후적응전문가',
      desc_elem: '뜨거워지는 바다와 높아지는 파도에 맞서 바닷가 마을을 안전하게 지키는 수호천사!',
      desc_sec: '해수면 상승 및 해안 침식 위험도를 평가하고 연안 방파제·해안 완충습지 등 복합 기후 회복력 인프라를 계획하는 전문 전략가입니다.',
      sub1: '해양오염방제연구원', sub2: '해양데이터사이언티스트',
      feedback_elem: '거친 파도로부터 사람들을 안전하게 보호하는 든든한 방패 역할을 해내요!',
      feedback_sec: '재해 위험 분석 데이터를 기반으로 회복탄력성(Resilience) 중심의 현실적 대안을 제시하는 능력이 우수합니다.'
    },
    {
      category: '해양생태', score_min: 50, score_max: 79, job_name: '산호초정원사',
      desc_elem: '하얗게 병든 산호초에 새 생명을 불어넣고 알록달록 바닷속 정원을 가꾸는 잠수부 정원사!',
      desc_sec: '온난화로 백화현상을 겪는 산호 군락과 잘피림(Seagrass)을 인공 증식하여 해양 생물다양성과 블루카본 흡수원을 복원하는 수중 생태 전문가입니다.',
      sub1: '해양동물보호가', sub2: '갯벌생태해설사',
      feedback_elem: '바닷속 작은 산호 하나도 소중히 돌보는 섬세한 관찰력을 가졌어요!',
      feedback_sec: '블루카본 생태계 복원 기술을 통해 전 지구적 탄소 감축에 직접 기여하는 실증적 응용생물학 역량이 돋보입니다.'
    },
    {
      category: '해양생태', score_min: 50, score_max: 79, job_name: '해양오염방제연구원',
      desc_elem: '기름이 쏟아지거나 쓰레기로 오염된 바다를 친환경 로봇과 미생물로 깨끗이 씻어내는 청소 박사님!',
      desc_sec: '해양 유류 유출 및 미세플라스틱 확산 메커니즘을 규명하고 친환경 생분해 방제제 및 흡착 기술을 개발하는 해양 화학 연구자입니다.',
      sub1: '해양데이터사이언티스트', sub2: '갯벌생태해설사',
      feedback_elem: '오염된 바다를 깨끗하게 되돌리는 멋진 과학 해결사예요!',
      feedback_sec: '해양 화학적 오염 물질의 거동을 신속히 파악하고 친환경 방제 프로토콜을 설계하는 문제 해결 역량이 뛰어납니다.'
    },
    {
      category: '해양생태', score_min: 0, score_max: 49, job_name: '해양동물보호가',
      desc_elem: '그물에 걸린 돌고래와 플라스틱을 삼킨 바다거북을 구출하고 치료해 주는 따뜻한 바다 수의사!',
      desc_sec: '해양 포유류의 좌초 원인을 역학 조사하고 해양보호구역(MPA) 내 불법 혼획 방지 및 응급 구조 체계를 지휘하는 현장 활동가입니다.',
      sub1: '산호초정원사', sub2: '갯벌생태해설사',
      feedback_elem: '다친 바다거북과 돌고래의 든든한 친구이자 가장 용감한 바다 수호자!',
      feedback_sec: '열악한 현장 여건에서도 해양 생명의 존엄성을 지키고 국제 보호 규범을 실행하는 강인한 생명윤리 리더십이 돋보입니다.'
    },
    {
      category: '해양생태', score_min: 0, score_max: 49, job_name: '갯벌생태해설사',
      desc_elem: '짱뚱어와 농게가 숨 쉬는 갯벌의 신비로움을 어린이들에게 재미있게 들려주는 갯벌 이야기꾼!',
      desc_sec: '유네스코 세계자연유산 한국의 갯벌이 지닌 탄소 고정 능력과 생태적 가치를 대중에게 전달하고 연안 습지 보전 인식을 확산하는 전문 커뮤니케이터입니다.',
      sub1: '해양오염방제연구원', sub2: '해양동물보호가',
      feedback_elem: '숨어있는 갯벌 생물들의 이야기를 재미있게 들려주는 이야기 박사님!',
      feedback_sec: '복잡한 해양 생태계 서비스를 시민 눈높이로 환원하여 대중의 환경 감수성과 정책 지지를 이끌어내는 소통 역량이 우수합니다.'
    },

    // 기후에너지 (8)
    {
      category: '기후에너지', score_min: 80, score_max: 100, job_name: '탄소중립 전략가',
      desc_elem: '공장과 도시가 내뿜는 매연을 0으로 만들기 위해 멋진 지구 작전을 세우는 총사령관!',
      desc_sec: '기업과 정부의 온실가스 배출 인벤토리를 구축하고 과학기반감축목표(SBTi) 및 ESG 규제에 맞춘 넷제로 이행 로드맵을 수립하는 수석 전략가입니다.',
      sub1: '탄소배출권거래중개사', sub2: '신재생에너지연구원',
      feedback_elem: '지구의 미래를 구하는 가장 크고 멋진 그림을 그리는 리더예요!',
      feedback_sec: '글로벌 탄소 국경세(CBAM)와 넷제로 공시 의무화에 선제 대응하는 거시적 비즈니스 포트폴리오 기획력이 탁월합니다.'
    },
    {
      category: '기후에너지', score_min: 80, score_max: 100, job_name: '스마트시티기획자',
      desc_elem: '전기도 아끼고 버스도 스스로 달리는 똑똑하고 깨끗한 미래 도시를 짓는 도시 설계자!',
      desc_sec: '사물인터넷(IoT)과 스마트그리드, 친환경 모빌리티를 융합하여 에너지 자립률이 극대화된 제로에너지 도시 인프라를 총괄 기획하는 엔지니어입니다.',
      sub1: '친환경건축가', sub2: '그린에너지컨설턴트',
      feedback_elem: '첨단 기술로 매연 없는 마법 같은 미래 도시를 건설할 주인공!',
      feedback_sec: '도시 공학 기술과 에너지 데이터 네트워크를 통합하여 지속가능한 정주 여건을 창출하는 시스템 설계 역량이 뛰어납니다.'
    },
    {
      category: '기후에너지', score_min: 80, score_max: 100, job_name: '신재생에너지연구원',
      desc_elem: '햇빛, 바람, 바닷물에서 무한한 청정 전기를 만들어내는 미래 발전소 발명가!',
      desc_sec: '차세대 페로브스카이트 태양전지, 해상풍력 터빈, 그린수소 수전해 고효율화 기술을 연구 개발하는 신에너지 R&D 연구원입니다.',
      sub1: '그린에너지컨설턴트', sub2: '에너지효율진단사',
      feedback_elem: '태양과 바람을 모아 세상을 움직이는 청정 에너지를 만들어낼 발명왕!',
      feedback_sec: '열역학 및 에너지 변환 기술의 한계를 돌파하는 연구 집념과 첨단 공학적 탐구 역량이 매우 돋보입니다.'
    },
    {
      category: '기후에너지', score_min: 50, score_max: 79, job_name: '그린에너지컨설턴트',
      desc_elem: '어떤 학교나 아파트에 태양광 패널을 설치하면 전기를 가장 많이 아낄 수 있는지 알려주는 에너지 코치!',
      desc_sec: 'RE100 달성을 추진하는 산업체에 최적의 신재생 전력구매계약(PPA)과 발전원 포트폴리오를 제안하는 에너지 솔루션 컨설턴트입니다.',
      sub1: '신재생에너지연구원', sub2: '탄소중립 전략가',
      feedback_elem: '사람들에게 알뜰하고 깨끗한 에너지를 선물하는 친절한 안내자예요!',
      feedback_sec: '에너지 시장의 경제성과 탄소 감축 효과를 다각도로 분석하여 최적의 도입 전략을 제안하는 컨설팅 감각이 탁월합니다.'
    },
    {
      category: '기후에너지', score_min: 50, score_max: 79, job_name: '에너지효율진단사',
      desc_elem: '보이지 않게 새어나가는 전기를 열화상 카메라로 쏙쏙 찾아내어 전기도둑을 잡는 에너지 탐정!',
      desc_sec: '대형 빌딩과 산업 공정의 열·전력 소비 패턴을 정밀 진단하여 BEMS(건물에너지관리시스템) 기반의 최적 절감 솔루션을 도출하는 기술 평가사입니다.',
      sub1: '친환경건축가', sub2: '그린에너지컨설턴트',
      feedback_elem: '낭비되는 에너지를 하나도 놓치지 않고 꼼꼼히 잡아내는 탐정님!',
      feedback_sec: '공학적 계측 데이터를 기반으로 숨겨진 에너지 손실을 발굴하고 공정 효율을 극대화하는 정밀 분석 역량이 우수합니다.'
    },
    {
      category: '기후에너지', score_min: 50, score_max: 79, job_name: '친환경건축가',
      desc_elem: '여름에는 저절로 시원하고 겨울에는 따뜻해서 에어컨을 덜 틀어도 되는 친환경 초록집 건축가!',
      desc_sec: '패시브 하우스 설계 기법과 저탄소 건자재, 옥상 녹화를 결합하여 제로에너지빌딩(ZEB) 1등급 인증을 구현하는 친환경 건축 설계사입니다.',
      sub1: '스마트시티기획자', sub2: '에너지효율진단사',
      feedback_elem: '자연과 하나 되어 숨 쉬는 아늑하고 착한 건물을 짓는 예술가예요!',
      feedback_sec: '단열·일사 취득 등 열환경 시뮬레이션과 친환경 건축 공법을 결합하여 탄소 배출을 획기적으로 낮추는 설계 능력이 돋보입니다.'
    },
    {
      category: '기후에너지', score_min: 0, score_max: 49, job_name: '기후변화감시요원',
      desc_elem: '하늘 위 인공위성과 기상 관측소에서 온실가스와 이상기후를 24시간 쉬지 않고 감시하는 눈!',
      desc_sec: '기후 재난 취약 지구의 이산화탄소 농도와 대기 정체를 실시간 모니터링하여 조기 경보를 발령하고 기후 격차를 완화하는 긴급 방재 요원입니다.',
      sub1: '신재생에너지연구원', sub2: '탄소중립 전략가',
      feedback_elem: '이상기후의 위험을 미리 알아채고 사람들을 지켜주는 밤낮 없는 파수꾼!',
      feedback_sec: '기후 위기 최전선에서 온실가스 데이터를 상시 추적하여 사회적 안전망을 방어하는 긴급 위기대응 잠재력이 돋보입니다.'
    },
    {
      category: '기후에너지', score_min: 0, score_max: 49, job_name: '탄소배출권거래중개사',
      desc_elem: '탄소를 줄여서 모은 착한 점수를 기업들끼리 시장에서 서로 정직하게 사고팔 수 있게 돕는 시장 매니저!',
      desc_sec: '탄소배출권(ETS) 시장의 가격 변동성과 규제 리스크를 헷징(Hedging)하고 친환경 프로젝트의 탄소 크레딧 유동화를 지원하는 파이낸스 전문가입니다.',
      sub1: '탄소중립 전략가', sub2: '그린에너지컨설턴트',
      feedback_elem: '착한 환경 점수를 알뜰하게 거래해 시장에 활력을 불어넣는 시장 대장!',
      feedback_sec: '기후 문제를 금융·시장 메커니즘과 결합하여 자본을 녹색 투자로 유도하는 금융 공학적 블루오션 개척 역량이 뛰어납니다.'
    },

    // 자원순환 (8)
    {
      category: '자원순환', score_min: 80, score_max: 100, job_name: '순환경제컨설턴트',
      desc_elem: '물건을 만들 때부터 버릴 때까지 쓰레기가 하나도 안 나오도록 마법 같은 재활용 루프를 만드는 순환 대장!',
      desc_sec: '생산-소비-회수-재제조의 전 과정 평가(LCA)를 분석하여 자원 낭비를 0으로 만드는 순환경제 비즈니스 모델을 기업에 수립하는 컨설턴트입니다.',
      sub1: '생분해소재연구원', sub2: '폐기물자원화연구원',
      feedback_elem: '쓰레기를 보물로 바꾸는 완벽한 자원 순환 고리를 만드는 설계자예요!',
      feedback_sec: '선형적 자원 소비 모델을 순환형 생태계로 전환시키는 거시적 LCA 평가 및 공급망 혁신 능력이 뛰어납니다.'
    },
    {
      category: '자원순환', score_min: 80, score_max: 100, job_name: '생분해소재연구원',
      desc_elem: '땅에 묻으면 몇 달 만에 흙과 비료로 변해 자연으로 돌아가는 친환경 플라스틱을 발명하는 화학 박사!',
      desc_sec: '옥수수 전분, 해조류 등 바이오매스 원료를 합성하여 기존 석유계 플라스틱 물성을 대체하는 고기능성 생분해 바이오 플라스틱(PHA/PLA) 개발자입니다.',
      sub1: '친환경포장재개발자', sub2: '순환경제컨설턴트',
      feedback_elem: '썩지 않는 플라스틱 문제를 한 번에 해결할 멋진 미래 발명가예요!',
      feedback_sec: '고분자 화학 기술을 응용하여 난분해성 폐기물 문제를 근본적으로 혁신하는 원천 기술 개발 역량이 탁월합니다.'
    },
    {
      category: '자원순환', score_min: 50, score_max: 79, job_name: '폐기물자원화연구원',
      desc_elem: '버려지는 음식물 쓰레기와 가축 분뇨를 깨끗한 가스 연료와 따뜻한 전기로 변신시키는 연금술사!',
      desc_sec: '유기성 폐기물의 혐기성 소화를 통한 바이오가스 추출 및 폐플라스틱 열분해유 화학적 재활용 공정을 연구하는 자원화 엔지니어입니다.',
      sub1: '도시광부', sub2: '순환경제컨설턴트',
      feedback_elem: '쓸모없다고 버려진 것들에서 새로운 가치를 찾아내는 마법사예요!',
      feedback_sec: '폐기물의 화학적·에너지적 재활용 공정을 최적화하여 혐오 시설을 에너지 허브로 탈바꿈시키는 공학적 기량이 돋보입니다.'
    },
    {
      category: '자원순환', score_min: 50, score_max: 79, job_name: '업사이클링디자이너',
      desc_elem: '낡은 소방호스와 현수막, 헌 옷을 세상에 단 하나뿐인 멋진 가방과 인형으로 재탄생시키는 패션 예술가!',
      desc_sec: '폐자재의 물성과 심미적 가치를 재해석하여 탄소발자국을 최소화하고 상업적 경쟁력을 갖춘 지속가능 제품을 창조하는 산업 디자이너입니다.',
      sub1: '제로웨이스트활동가', sub2: '친환경포장재개발자',
      feedback_elem: '버려진 물건에 새로운 생명과 아름다움을 불어넣는 따뜻한 예술가예요!',
      feedback_sec: '환경성과 심미적 완성도를 결합하여 소비자의 친환경 구매 전환을 촉진하는 창의적 디자인 씽킹 역량이 뛰어납니다.'
    },
    {
      category: '자원순환', score_min: 50, score_max: 79, job_name: '친환경포장재개발자',
      desc_elem: '택배 상자 속 스티로폼과 뽁뽁이 대신 버섯 균사체와 종이로 안전하고 무해한 포장재를 만드는 포장 전문가!',
      desc_sec: '전자상거래 물류에 최적화된 테이프 프리(Tape-free) 박스, 완충용 펄프 몰드 및 수용성 코팅제를 설계하여 택배 폐기물을 획기적으로 줄이는 기술자입니다.',
      sub1: '생분해소재연구원', sub2: '업사이클링디자이너',
      feedback_elem: '택배 쓰레기 걱정 없이 물건을 안전하게 지켜주는 똑똑한 포장 박사님!',
      feedback_sec: '물류 현장의 현실적 단가 및 내구성 요구조건을 충족하면서 플라스틱 포장재를 완벽히 대체하는 실용적 개발력이 돋보입니다.'
    },
    {
      category: '자원순환', score_min: 0, score_max: 49, job_name: '도시광부',
      desc_elem: '버려진 스마트폰과 폐배터리 속에서 번쩍이는 금과 희귀한 보물 금속을 쏙쏙 캐내는 미래의 광부!',
      desc_sec: '폐배터리와 전자 폐기물(E-waste)에서 리튬, 니켈, 코발트 등 핵심 희소금속을 95% 이상 회수하여 공급망 불안을 해소하는 블랙매스 습식 제련 기술자입니다.',
      sub1: '폐기물자원화연구원', sub2: '순환경제컨설턴트',
      feedback_elem: '버려진 전자제품 속 숨은 보물을 찾아내는 가장 씩씩한 미래의 광부!',
      feedback_sec: '자원 안보 위기 현장에서 핵심 원자재의 국내 자립률을 높이는 대체 불가능한 긴급 기술 역량을 보여줍니다.'
    },
    {
      category: '자원순환', score_min: 0, score_max: 49, job_name: '제로웨이스트활동가',
      desc_elem: '포장지 없는 착한 상점을 열고 일회용 컵 대신 텀블러 쓰기 운동을 마을 사람들과 함께 펼치는 환경 영웅!',
      desc_sec: '지역사회 내 리필 스테이션 인프라를 기획하고 탈플라스틱 소비자 조례 제정 및 자원순환 풀뿌리 거버넌스를 이끄는 사회적 기업가입니다.',
      sub1: '업사이클링디자이너', sub2: '자원순환코디네이터',
      feedback_elem: '이웃들과 손잡고 쓰레기 없는 마을을 만들어가는 다정한 환경 실천가!',
      feedback_sec: '제도적 공백을 시민 실천과 풀뿌리 네트워크로 극복하여 자원순환 문화를 현장에 뿌리내리게 하는 실천력이 탁월합니다.'
    },
    {
      category: '자원순환', score_min: 0, score_max: 49, job_name: '자원순환코디네이터',
      desc_elem: '재활용 정거장에서 어떤 플라스틱이 다시 새 물건이 될 수 있는지 이웃들에게 친절하게 가르쳐주는 분리배출 선생님!',
      desc_sec: '지자체 스마트 분리배출 IoT 시스템 운영 데이터를 분석하고 수거 동선 최적화 및 주민 보상 인센티브 정책을 운영하는 자원순환 현장 관리자입니다.',
      sub1: '도시광부', sub2: '제로웨이스트활동가',
      feedback_elem: '올바른 분리수거 방법을 친절하게 알려주어 쓰레기를 자원으로 되살리는 선생님!',
      feedback_sec: '재활용 수거 체계의 병목 지점을 정밀 진단하고 주민 참여를 이끌어내는 현장 중심 데이터 거버넌스 역량이 우수합니다.'
    }
  ],

  initializeJobsDB: function(ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.JOBS);
    if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.JOBS);

    sheet.clear();
    var headers = CONFIG.HEADERS.JOBS;
    sheet.appendRow(headers);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#059669');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    var rows = JobService.MASTER_JOBS.map(function(item) {
      return [
        item.category, item.score_min, item.score_max, item.job_name,
        item.desc_elem, item.desc_sec, item.sub1, item.sub2,
        item.feedback_elem, item.feedback_sec
      ];
    });

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    for (var i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }

    return { success: true, totalCount: rows.length, sheetName: CONFIG.SHEET_NAMES.JOBS };
  },

  getJobsMaster: function(ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.JOBS);
    if (!sheet || sheet.getLastRow() <= 1) {
      JobService.initializeJobsDB(spreadsheet);
      sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.JOBS);
    }

    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) return JobService.MASTER_JOBS;

    var headers = values[0];
    var jobs = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var job = {};
      for (var c = 0; c < headers.length; c++) {
        job[headers[c]] = row[c];
      }
      jobs.push(job);
    }
    return jobs;
  }
};

// ==========================================
// 4. CLASS SERVICE
// ==========================================
var ClassService = {
  getOrCreateMetaSheet: function(ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.META);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.META, 0);
      sheet.clear();
      var headers = CONFIG.HEADERS.META;
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#047857');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    return sheet;
  },

  createClass: function(params, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    var school = (params.schoolName || '').trim();
    var grade = parseInt(params.grade, 10);
    var classNum = parseInt(params.classNum, 10);
    var gradeTier = (params.gradeTier || 'ELEM').toUpperCase();
    var pin = (params.pin || '1234').toString().trim();

    if (!school || isNaN(grade) || isNaN(classNum)) {
      throw { code: CONFIG.ERRORS.VALIDATION_FAILED, message: '학교명, 학년, 반 정보를 정확히 입력해 주세요.' };
    }

    var cleanSchool = school.replace(/[\/\\?*:[\]]/g, '');
    var sheetName = cleanSchool + '_' + grade + '_' + classNum;
    var dateStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
    var classId = 'CLS_' + dateStr + '_' + cleanSchool + '_' + grade + '_' + classNum;

    return LockManager.withLock(function() {
      var metaSheet = ClassService.getOrCreateMetaSheet(spreadsheet);
      var metaData = metaSheet.getDataRange().getValues();

      var existingRowIndex = -1;
      for (var i = 1; i < metaData.length; i++) {
        if (metaData[i][0] === classId || metaData[i][6] === sheetName) {
          existingRowIndex = i + 1;
          break;
        }
      }

      var nowStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      if (existingRowIndex > 0) {
        metaSheet.getRange(existingRowIndex, 6).setValue(pin);
      } else {
        metaSheet.appendRow([
          classId, school, grade, classNum, gradeTier, pin, sheetName, false, nowStr
        ]);
      }

      var classSheet = spreadsheet.getSheetByName(sheetName);
      if (!classSheet) {
        classSheet = spreadsheet.insertSheet(sheetName);
        classSheet.clear();
        var headers = CONFIG.HEADERS.CLASS_STUDENT;
        classSheet.appendRow(headers);
        var headerRange = classSheet.getRange(1, 1, 1, headers.length);
        headerRange.setBackground('#059669');
        headerRange.setFontColor('#FFFFFF');
        headerRange.setFontWeight('bold');
        classSheet.setFrozenRows(1);
        for (var c = 1; c <= headers.length; c++) {
          classSheet.autoResizeColumn(c);
        }
      }

      return {
        classId: classId, sheetName: sheetName, schoolName: school,
        grade: grade, classNum: classNum, gradeTier: gradeTier, isUnlocked: false
      };
    });
  },

  getClassStatus: function(classId, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    var metaSheet = ClassService.getOrCreateMetaSheet(spreadsheet);
    var data = metaSheet.getDataRange().getValues();

    var target = null;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === classId) {
        target = {
          classId: data[i][0], schoolName: data[i][1], grade: data[i][2],
          classNum: data[i][3], gradeTier: data[i][4], sheetName: data[i][6],
          isUnlocked: Boolean(data[i][7])
        };
        break;
      }
    }

    if (!target) {
      throw { code: CONFIG.ERRORS.CLASS_NOT_FOUND, message: '존재하지 않는 학급 코드입니다: ' + classId };
    }

    var classSheet = spreadsheet.getSheetByName(target.sheetName);
    target.totalSubmitted = (classSheet && classSheet.getLastRow() > 1) ? classSheet.getLastRow() - 1 : 0;
    return target;
  },

  toggleResultLock: function(classId, pin, unlock, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();

    return LockManager.withLock(function() {
      var metaSheet = ClassService.getOrCreateMetaSheet(spreadsheet);
      var data = metaSheet.getDataRange().getValues();

      var targetRow = -1;
      var savedPin = '';
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === classId) {
          targetRow = i + 1;
          savedPin = (data[i][5] || '').toString();
          break;
        }
      }

      if (targetRow < 0) {
        throw { code: CONFIG.ERRORS.CLASS_NOT_FOUND, message: '학급을 찾을 수 없습니다.' };
      }

      var inputPin = (pin || '').toString().trim();
      if (inputPin !== savedPin && inputPin !== CONFIG.MASTER_PIN) {
        throw { code: CONFIG.ERRORS.AUTH_FAILED, message: '교사 비밀번호가 일치하지 않습니다.' };
      }

      var unlockFlag = Boolean(unlock);
      metaSheet.getRange(targetRow, 8).setValue(unlockFlag);

      return { classId: classId, isUnlocked: unlockFlag };
    });
  }
};

// ==========================================
// 5. SIMULATION UPSERT SERVICE
// ==========================================
var SimService = {
  submitSimulation: function(params, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();

    var classId = (params.classId || '').trim();
    var studentKey = (params.studentKey || '').trim();
    var studentNo = (params.studentNo || '').toString().trim();
    var studentName = (params.studentName || '').trim();
    var topic = (params.topic || '').trim();

    if (!classId || !studentKey || !studentName || !topic) {
      throw { code: CONFIG.ERRORS.VALIDATION_FAILED, message: '필수 제출 정보가 누락되었습니다.' };
    }

    var policy = params.policy || {};
    var budget = parseInt(policy.budget, 10) || 0;
    var regul = parseInt(policy.regulation, 10) || 0;
    var rnd = parseInt(policy.techRnd, 10) || 0;

    var totalScore = parseInt(params.totalScore, 10);
    if (isNaN(totalScore)) totalScore = 0;
    totalScore = Math.max(0, Math.min(100, totalScore));

    var matchedJob = (params.matchedJob || '').trim();
    var subJobs = Array.isArray(params.subJobs) ? params.subJobs.join(', ') : (params.subJobs || '').toString().trim();

    return LockManager.withLock(function() {
      var classInfo = ClassService.getClassStatus(classId, spreadsheet);
      var classSheet = spreadsheet.getSheetByName(classInfo.sheetName);
      if (!classSheet) {
        throw { code: CONFIG.ERRORS.CLASS_NOT_FOUND, message: '학급 시트가 없습니다: ' + classInfo.sheetName };
      }

      var nowStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      var rowData = [
        nowStr, studentKey, studentNo, studentName, topic,
        budget, regul, rnd, totalScore, matchedJob, subJobs
      ];

      var data = classSheet.getDataRange().getValues();
      var targetRow = -1;
      for (var r = 1; r < data.length; r++) {
        if (data[r][1] === studentKey) {
          targetRow = r + 1;
          break;
        }
      }

      var upsertType = 'INSERT';
      if (targetRow > 1) {
        classSheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
        upsertType = 'UPDATE';
      } else {
        classSheet.appendRow(rowData);
      }

      return {
        classId: classId, studentKey: studentKey, upsertType: upsertType,
        totalScore: totalScore, matchedJob: matchedJob, timestamp: nowStr
      };
    });
  }
};

// ==========================================
// 6. STATS SERVICE
// ==========================================
var StatsService = {
  getClassStats: function(classId, pin, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    var metaSheet = ClassService.getOrCreateMetaSheet(spreadsheet);
    var metaData = metaSheet.getDataRange().getValues();

    var classInfo = null;
    var savedPin = '';
    for (var i = 1; i < metaData.length; i++) {
      if (metaData[i][0] === classId) {
        savedPin = (metaData[i][5] || '').toString();
        classInfo = {
          classId: metaData[i][0], schoolName: metaData[i][1], grade: metaData[i][2],
          classNum: metaData[i][3], gradeTier: metaData[i][4], sheetName: metaData[i][6],
          isUnlocked: Boolean(metaData[i][7])
        };
        break;
      }
    }

    if (!classInfo) {
      throw { code: CONFIG.ERRORS.CLASS_NOT_FOUND, message: '학급을 찾을 수 없습니다: ' + classId };
    }

    var inputPin = (pin || '').toString().trim();
    if (inputPin !== savedPin && inputPin !== CONFIG.MASTER_PIN) {
      throw { code: CONFIG.ERRORS.AUTH_FAILED, message: '교사 비밀번호가 일치하지 않습니다.' };
    }

    var classSheet = spreadsheet.getSheetByName(classInfo.sheetName);
    var students = [];
    var topicCounts = { '산림생태': 0, '해양생태': 0, '기후에너지': 0, '자원순환': 0 };
    var scoreTiers = { high: 0, mid: 0, low: 0 };
    var jobFrequency = {};
    var scoreSum = 0;

    if (classSheet && classSheet.getLastRow() > 1) {
      var rows = classSheet.getDataRange().getValues();
      for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        var timestamp = row[0];
        var studentKey = row[1];
        var studentNo = row[2];
        var studentName = row[3];
        var topic = row[4];
        var score = parseInt(row[8], 10) || 0;
        var matchedJob = row[9] || '';
        var subJobs = row[10] || '';

        if (topicCounts.hasOwnProperty(topic)) topicCounts[topic]++;
        else topicCounts[topic] = 1;

        scoreSum += score;
        if (score >= 80) scoreTiers.high++;
        else if (score >= 50) scoreTiers.mid++;
        else scoreTiers.low++;

        if (matchedJob) jobFrequency[matchedJob] = (jobFrequency[matchedJob] || 0) + 1;

        students.push({
          timestamp: timestamp, studentKey: studentKey, studentNo: studentNo,
          studentName: studentName, topic: topic, totalScore: score,
          matchedJob: matchedJob, subJobs: subJobs
        });
      }
    }

    var topJobs = [];
    for (var jobName in jobFrequency) {
      if (jobFrequency.hasOwnProperty(jobName)) {
        topJobs.push({ jobName: jobName, count: jobFrequency[jobName] });
      }
    }
    topJobs.sort(function(a, b) { return b.count - a.count; });

    var totalStudents = students.length;
    var averageScore = totalStudents > 0 ? Math.round((scoreSum / totalStudents) * 10) / 10 : 0;

    return {
      classInfo: classInfo,
      summary: {
        totalStudents: totalStudents,
        averageScore: averageScore,
        topicCounts: topicCounts,
        scoreTiers: scoreTiers,
        topJobs: topJobs
      },
      students: students
    };
  }
};

// ==========================================
// 7. MAIN ENTRYPOINTS (doGet / doPost)
// ==========================================
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    switch (action) {
      case 'ping':
        return createResponse(true, action, {
          status: 'online', app: 'Green-it Platform', version: '1.0.0', serverTime: new Date().toISOString()
        });
      case 'getJobs':
        return createResponse(true, action, JobService.getJobsMaster(), '30개 직업 데이터를 성공적으로 조회했습니다.');
      case 'getClassStatus':
        if (!e.parameter.classId) throw { code: CONFIG.ERRORS.VALIDATION_FAILED, message: 'classId가 필요합니다.' };
        return createResponse(true, action, ClassService.getClassStatus(e.parameter.classId));
      case 'getClassStats':
        if (!e.parameter.classId || !e.parameter.pin) throw { code: CONFIG.ERRORS.VALIDATION_FAILED, message: 'classId와 pin이 필요합니다.' };
        return createResponse(true, action, StatsService.getClassStats(e.parameter.classId, e.parameter.pin));
      default:
        throw { code: CONFIG.ERRORS.INVALID_ACTION, message: '지원하지 않는 GET 액션: ' + action };
    }
  } catch (err) {
    return createResponse(false, action, err);
  }
}

function doPost(e) {
  var action = 'unknown';
  try {
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      try { requestData = JSON.parse(e.postData.contents); } 
      catch (parseErr) { throw { code: CONFIG.ERRORS.VALIDATION_FAILED, message: '유효한 JSON 본문이 아닙니다.' }; }
    }
    action = requestData.action || (e && e.parameter && e.parameter.action) || 'unknown';

    switch (action) {
      case 'initDb':
        return createResponse(true, action, JobService.initializeJobsDB(), '직업 마스터 데이터베이스가 초기화되었습니다.');
      case 'createClass':
        return createResponse(true, action, ClassService.createClass(requestData), '새 학급이 개설되었습니다.');
      case 'toggleResultLock':
        return createResponse(true, action, ClassService.toggleResultLock(requestData.classId, requestData.pin, requestData.unlock), '결과 보기 상태가 변경되었습니다.');
      case 'submitSimulation':
        return createResponse(true, action, SimService.submitSimulation(requestData), '시뮬레이션 결과가 안전하게 저장되었습니다.');
      default:
        throw { code: CONFIG.ERRORS.INVALID_ACTION, message: '지원하지 않는 POST 액션: ' + action };
    }
  } catch (err) {
    return createResponse(false, action, err);
  }
}

function initDatabase() {
  Logger.log('=== 그린잇! 직업 데이터베이스 초기화 시작 ===');
  var res = JobService.initializeJobsDB();
  Logger.log('초기화 완료: ' + JSON.stringify(res));
  return res;
}

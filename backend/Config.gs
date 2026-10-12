/**
 * Config.gs - 그린잇! (Green-it!) 백엔드 전역 설정 및 상수
 */

const CONFIG = {
  // 시스템 시트 이름 상수
  SHEET_NAMES: {
    META: '_CLASS_META_',
    JOBS: '_JOBS_MASTER_'
  },

  // 기본 관리자 마스터 PIN (학교 교사용 비상 PIN)
  MASTER_PIN: '9999',

  // LockService 대기 시간 (밀리초)
  LOCK_TIMEOUT_MS: 10000,

  // 시트별 헤더 정의
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

  // 에러 코드 정의
  ERRORS: {
    INVALID_ACTION: 'ERR_INVALID_ACTION',
    CLASS_NOT_FOUND: 'ERR_CLASS_NOT_FOUND',
    AUTH_FAILED: 'ERR_AUTH_FAILED',
    LOCK_TIMEOUT: 'ERR_LOCK_TIMEOUT',
    VALIDATION_FAILED: 'ERR_VALIDATION_FAILED',
    INTERNAL_ERROR: 'ERR_INTERNAL_ERROR'
  }
};

/**
 * 표준 JSON 응답 생성기
 */
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

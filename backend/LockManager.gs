/**
 * LockManager.gs - Google Apps Script 동시성 제어 래퍼
 * 
 * 30명 이상의 학생이 동시에 제출할 때 구글 시트 쓰기 락 충돌과 데이터 덮어쓰기를 100% 방지합니다.
 */

var LockManager = {
  /**
   * 락을 획득하고 콜백 함수를 실행한 뒤 반드시 락을 해제합니다.
   * @param {Function} callback - 락 보호 구역 내에서 실행할 로직
   * @param {number} [timeoutMs] - 최대 대기 시간 (밀리초)
   * @returns {*} callback의 반환값
   */
  withLock: function(callback, timeoutMs) {
    var timeout = timeoutMs || CONFIG.LOCK_TIMEOUT_MS;
    var lock = LockService.getDocumentLock();
    
    // 만약 문서 락이 불가능한 독립 실행형 스크립트인 경우 스크립트 락으로 폴백
    if (!lock) {
      lock = LockService.getScriptLock();
    }

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

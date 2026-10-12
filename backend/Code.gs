/**
 * Code.gs - 그린잇! (Green-it!) Google Apps Script 메인 웹 앱 진입점
 * 
 * HTTP GET 및 POST 요청을 수신하여 해당 도메인 서비스로 안전하게 라우팅합니다.
 */

/**
 * HTTP GET 요청 핸들러 (조회 전용)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';

  try {
    switch (action) {
      case 'ping':
        return createResponse(true, action, {
          status: 'online',
          app: 'Green-it Platform Backend',
          version: '1.0.0',
          serverTime: new Date().toISOString()
        });

      case 'getJobs':
        var jobs = JobService.getJobsMaster();
        return createResponse(true, action, jobs, '30개 직업 데이터를 성공적으로 조회했습니다.');

      case 'getClassStatus':
        var classId = e.parameter.classId;
        if (!classId) {
          throw { code: CONFIG.ERRORS.VALIDATION_FAILED, message: 'classId 파라미터가 필요합니다.' };
        }
        var status = ClassService.getClassStatus(classId);
        return createResponse(true, action, status);

      case 'getClassStats':
        var targetClassId = e.parameter.classId;
        var pin = e.parameter.pin;
        if (!targetClassId || !pin) {
          throw { code: CONFIG.ERRORS.VALIDATION_FAILED, message: 'classId 및 pin 파라미터가 필요합니다.' };
        }
        var stats = StatsService.getClassStats(targetClassId, pin);
        return createResponse(true, action, stats);

      default:
        throw {
          code: CONFIG.ERRORS.INVALID_ACTION,
          message: '지원하지 않는 GET 액션입니다: ' + action
        };
    }
  } catch (err) {
    return createResponse(false, action, err);
  }
}

/**
 * HTTP POST 요청 핸들러 (데이터 생성, 수정, 락 변경)
 */
function doPost(e) {
  var action = 'unknown';

  try {
    // 요청 본문 파싱 (CORS text/plain 지원)
    var requestData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        requestData = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        throw {
          code: CONFIG.ERRORS.VALIDATION_FAILED,
          message: '유효한 JSON 요청 본문이 아닙니다.'
        };
      }
    }

    action = requestData.action || (e && e.parameter && e.parameter.action) || 'unknown';

    switch (action) {
      case 'initDb':
        var initResult = JobService.initializeJobsDB();
        return createResponse(true, action, initResult, '직업 마스터 데이터베이스가 초기화되었습니다.');

      case 'createClass':
        var classResult = ClassService.createClass(requestData);
        return createResponse(true, action, classResult, '새로운 학급과 전용 시트가 개설되었습니다.');

      case 'toggleResultLock':
        var lockResult = ClassService.toggleResultLock(
          requestData.classId,
          requestData.pin,
          requestData.unlock
        );
        return createResponse(true, action, lockResult, '학생 결과 보기 상태가 변경되었습니다.');

      case 'submitSimulation':
        var submitResult = SimService.submitSimulation(requestData);
        return createResponse(true, action, submitResult, '시뮬레이션 결과가 안전하게 저장되었습니다.');

      default:
        throw {
          code: CONFIG.ERRORS.INVALID_ACTION,
          message: '지원하지 않는 POST 액션입니다: ' + action
        };
    }
  } catch (err) {
    return createResponse(false, action, err);
  }
}

/**
 * 교사용 초기 설정 원클릭 테스트 함수
 * (Google Apps Script 편집기에서 'initDatabase'를 선택하고 [실행]을 누르면 즉시 DB가 세팅됩니다)
 */
function initDatabase() {
  Logger.log('=== 그린잇! 직업 데이터베이스 초기화 시작 ===');
  var res = JobService.initializeJobsDB();
  Logger.log('초기화 완료: ' + JSON.stringify(res));
  return res;
}

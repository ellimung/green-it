/**
 * SimService.gs - 학생 정책 시뮬레이션 결과 멱등성(Upsert) 저장 서비스
 */

var SimService = {
  /**
   * 학생이 제출한 시뮬레이션 결과를 학급 전용 시트에 저장합니다.
   * 동일 학생이 재제출할 경우 기존 행을 찾아 업데이트(Upsert)합니다.
   * @param {Object} params - 제출 데이터 페이로드
   */
  submitSimulation: function(params, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();

    // 필수 항목 검증
    var classId = (params.classId || '').trim();
    var studentKey = (params.studentKey || '').trim();
    var studentNo = (params.studentNo || '').toString().trim();
    var studentName = (params.studentName || '').trim();
    var topic = (params.topic || '').trim();

    if (!classId || !studentKey || !studentName || !topic) {
      throw {
        code: CONFIG.ERRORS.VALIDATION_FAILED,
        message: '학급 코드, 학생 식별키, 이름, 주제 정보가 누락되었습니다.'
      };
    }

    var policy = params.policy || {};
    var budget = parseInt(policy.budget, 10) || 0;
    var regul = parseInt(policy.regulation, 10) || 0;
    var rnd = parseInt(policy.techRnd, 10) || 0;

    var totalScore = parseInt(params.totalScore, 10);
    if (isNaN(totalScore)) totalScore = 0;
    // 0~100 범위 보정
    totalScore = Math.max(0, Math.min(100, totalScore));

    var matchedJob = (params.matchedJob || '').trim();
    var subJobs = Array.isArray(params.subJobs) 
      ? params.subJobs.join(', ') 
      : (params.subJobs || '').toString().trim();

    // Lock을 획득하여 다중 제출 충돌 방지
    return LockManager.withLock(function() {
      // 1. 해당 학급의 시트 이름 조회
      var classInfo = ClassService.getClassStatus(classId, spreadsheet);
      var classSheet = spreadsheet.getSheetByName(classInfo.sheetName);

      if (!classSheet) {
        throw {
          code: CONFIG.ERRORS.CLASS_NOT_FOUND,
          message: '학급 시트를 찾을 수 없습니다: ' + classInfo.sheetName
        };
      }

      var nowStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      var rowData = [
        nowStr,
        studentKey,
        studentNo,
        studentName,
        topic,
        budget,
        regul,
        rnd,
        totalScore,
        matchedJob,
        subJobs
      ];

      // 2. studentKey(B열) 기준 기존 행 탐색 (Upsert)
      var data = classSheet.getDataRange().getValues();
      var targetRow = -1;

      for (var r = 1; r < data.length; r++) {
        if (data[r][1] === studentKey) {
          targetRow = r + 1; // 1-indexed
          break;
        }
      }

      var upsertType = 'INSERT';
      if (targetRow > 1) {
        // 기존 행 덮어쓰기 (Update)
        classSheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
        upsertType = 'UPDATE';
      } else {
        // 신규 행 추가 (Insert)
        classSheet.appendRow(rowData);
      }

      return {
        classId: classId,
        studentKey: studentKey,
        upsertType: upsertType,
        totalScore: totalScore,
        matchedJob: matchedJob,
        timestamp: nowStr
      };
    });
  }
};

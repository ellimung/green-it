/**
 * ClassService.gs - 학급 관리 및 전용 시트 동적 생성 서비스
 */

var ClassService = {
  /**
   * _CLASS_META_ 시트를 반환하거나 없으면 생성합니다.
   */
  getOrCreateMetaSheet: function(ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAMES.META);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAMES.META, 0);
      sheet.clear();
      var headers = CONFIG.HEADERS.META;
      sheet.appendRow(headers);

      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#047857'); // Emerald-700
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    return sheet;
  },

  /**
   * 신규 반을 개설하고 전용 데이터 탭을 자동 생성합니다.
   * @param {Object} params - { schoolName, grade, classNum, gradeTier, pin }
   */
  createClass: function(params, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    
    // 유효성 검사
    var school = (params.schoolName || '').trim();
    var grade = parseInt(params.grade, 10);
    var classNum = parseInt(params.classNum, 10);
    var gradeTier = (params.gradeTier || 'ELEM').toUpperCase();
    var pin = (params.pin || '1234').toString().trim();

    if (!school || isNaN(grade) || isNaN(classNum)) {
      throw {
        code: CONFIG.ERRORS.VALIDATION_FAILED,
        message: '학교명, 학년, 반 정보를 정확히 입력해 주세요.'
      };
    }

    // 시트명 및 고유 classId 생성
    // 구글 시트 탭 이름은 특수문자 제약이 있으므로 안전한 문자열로 구성
    var cleanSchool = school.replace(/[\/\\?*:[\]]/g, '');
    var sheetName = cleanSchool + '_' + grade + '_' + classNum;
    
    var dateStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
    var classId = 'CLS_' + dateStr + '_' + cleanSchool + '_' + grade + '_' + classNum;

    // Lock을 걸어 중복 생성 방지
    return LockManager.withLock(function() {
      var metaSheet = ClassService.getOrCreateMetaSheet(spreadsheet);
      var metaData = metaSheet.getDataRange().getValues();

      // 이미 존재하는 classId인지 확인
      var existingRowIndex = -1;
      for (var i = 1; i < metaData.length; i++) {
        if (metaData[i][0] === classId || metaData[i][6] === sheetName) {
          existingRowIndex = i + 1;
          break;
        }
      }

      var nowStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

      if (existingRowIndex > 0) {
        // 기존 반이 이미 있으면 PIN 및 업데이트 일시 갱신
        metaSheet.getRange(existingRowIndex, 6).setValue(pin);
      } else {
        // 신규 반 메타데이터 등록
        metaSheet.appendRow([
          classId,
          school,
          grade,
          classNum,
          gradeTier,
          pin,
          sheetName,
          false, // is_unlocked 기본값: false (잠금)
          nowStr
        ]);
      }

      // 학급 전용 데이터 탭 생성 또는 기존 탭 초기화
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
        classId: classId,
        sheetName: sheetName,
        schoolName: school,
        grade: grade,
        classNum: classNum,
        gradeTier: gradeTier,
        isUnlocked: false
      };
    });
  },

  /**
   * 학급의 현재 접속 및 결과 잠금 상태를 조회합니다.
   */
  getClassStatus: function(classId, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();
    var metaSheet = ClassService.getOrCreateMetaSheet(spreadsheet);
    var data = metaSheet.getDataRange().getValues();

    var target = null;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === classId) {
        target = {
          classId: data[i][0],
          schoolName: data[i][1],
          grade: data[i][2],
          classNum: data[i][3],
          gradeTier: data[i][4],
          sheetName: data[i][6],
          isUnlocked: Boolean(data[i][7])
        };
        break;
      }
    }

    if (!target) {
      throw {
        code: CONFIG.ERRORS.CLASS_NOT_FOUND,
        message: '존재하지 않거나 종료된 학급 코드입니다: ' + classId
      };
    }

    // 제출된 학생 수 집계
    var classSheet = spreadsheet.getSheetByName(target.sheetName);
    var totalSubmitted = 0;
    if (classSheet && classSheet.getLastRow() > 1) {
      totalSubmitted = classSheet.getLastRow() - 1;
    }
    target.totalSubmitted = totalSubmitted;

    return target;
  },

  /**
   * 교사의 결과 보기 허용/잠금 토글 스위치를 변경합니다.
   */
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
        throw {
          code: CONFIG.ERRORS.CLASS_NOT_FOUND,
          message: '학급을 찾을 수 없습니다.'
        };
      }

      // PIN 검증 (입력된 PIN 또는 마스터 PIN 일치 여부)
      var inputPin = (pin || '').toString().trim();
      if (inputPin !== savedPin && inputPin !== CONFIG.MASTER_PIN) {
        throw {
          code: CONFIG.ERRORS.AUTH_FAILED,
          message: '교사 인증 비밀번호(PIN)가 일치하지 않습니다.'
        };
      }

      // H열 (is_unlocked) 갱신
      var unlockFlag = Boolean(unlock);
      metaSheet.getRange(targetRow, 8).setValue(unlockFlag);

      return {
        classId: classId,
        isUnlocked: unlockFlag
      };
    });
  }
};

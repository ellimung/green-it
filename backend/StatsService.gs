/**
 * StatsService.gs - 학급 통계 집계 및 실시간 모니터링 데이터 제공 서비스
 */

var StatsService = {
  /**
   * 학급의 실시간 통계 요약 및 전체 학생 제출 명단을 조회합니다.
   * @param {string} classId - 학급 코드
   * @param {string} pin - 교사 인증 PIN
   */
  getClassStats: function(classId, pin, ss) {
    var spreadsheet = ss || SpreadsheetApp.getActiveSpreadsheet();

    // 1. 학급 정보 조회 및 PIN 검증
    var metaSheet = ClassService.getOrCreateMetaSheet(spreadsheet);
    var metaData = metaSheet.getDataRange().getValues();

    var classInfo = null;
    var savedPin = '';

    for (var i = 1; i < metaData.length; i++) {
      if (metaData[i][0] === classId) {
        savedPin = (metaData[i][5] || '').toString();
        classInfo = {
          classId: metaData[i][0],
          schoolName: metaData[i][1],
          grade: metaData[i][2],
          classNum: metaData[i][3],
          gradeTier: metaData[i][4],
          sheetName: metaData[i][6],
          isUnlocked: Boolean(metaData[i][7])
        };
        break;
      }
    }

    if (!classInfo) {
      throw {
        code: CONFIG.ERRORS.CLASS_NOT_FOUND,
        message: '학급을 찾을 수 없습니다: ' + classId
      };
    }

    var inputPin = (pin || '').toString().trim();
    if (inputPin !== savedPin && inputPin !== CONFIG.MASTER_PIN) {
      throw {
        code: CONFIG.ERRORS.AUTH_FAILED,
        message: '교사 인증 비밀번호(PIN)가 일치하지 않습니다.'
      };
    }

    // 2. 해당 학급 전용 시트 데이터 스캔
    var classSheet = spreadsheet.getSheetByName(classInfo.sheetName);
    var students = [];
    var topicCounts = {
      '산림생태': 0,
      '해양생태': 0,
      '기후에너지': 0,
      '자원순환': 0
    };
    var scoreTiers = {
      high: 0, // 80~100
      mid: 0,  // 50~79
      low: 0   // 0~49
    };
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

        // 토픽 카운트
        if (topicCounts.hasOwnProperty(topic)) {
          topicCounts[topic]++;
        } else {
          topicCounts[topic] = 1;
        }

        // 점수 합계 및 티어 카운트
        scoreSum += score;
        if (score >= 80) scoreTiers.high++;
        else if (score >= 50) scoreTiers.mid++;
        else scoreTiers.low++;

        // 직업 빈도수
        if (matchedJob) {
          jobFrequency[matchedJob] = (jobFrequency[matchedJob] || 0) + 1;
        }

        students.push({
          timestamp: timestamp,
          studentKey: studentKey,
          studentNo: studentNo,
          studentName: studentName,
          topic: topic,
          totalScore: score,
          matchedJob: matchedJob,
          subJobs: subJobs
        });
      }
    }

    // 3. 직업 빈도수 상위 정렬
    var topJobs = [];
    for (var jobName in jobFrequency) {
      if (jobFrequency.hasOwnProperty(jobName)) {
        topJobs.push({
          jobName: jobName,
          count: jobFrequency[jobName]
        });
      }
    }
    topJobs.sort(function(a, b) {
      return b.count - a.count;
    });

    var totalStudents = students.length;
    var averageScore = totalStudents > 0 
      ? Math.round((scoreSum / totalStudents) * 10) / 10 
      : 0;

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

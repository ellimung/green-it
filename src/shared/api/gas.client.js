/**
 * gas.client.js - Google Apps Script 연동 클라이언트 및 오프라인 Mock 데이터 프로바이더
 */

var GasClient = {
  // 사용자가 설정한 GAS 배포 URL (미설정 시 자동 Mock 모드 가동)
  gasUrl: '',
  isMockMode: true,

  init: function(customUrl) {
    if (customUrl && customUrl.trim().length > 10) {
      this.gasUrl = customUrl.trim();
      this.isMockMode = false;
    } else {
      this.isMockMode = true;
    }
  },

  /**
   * API 호출 메서드 (실제 GAS 통신 또는 가상 Mock 응답 처리)
   */
  request: async function(method, action, payload = {}) {
    if (this.isMockMode) {
      return this._handleMockRequest(action, payload);
    }

    try {
      if (method === 'GET') {
        const query = new URLSearchParams({ action, ...payload }).toString();
        const res = await fetch(`${this.gasUrl}?${query}`, { method: 'GET', redirect: 'follow' });
        return await res.json();
      } else {
        const res = await fetch(this.gasUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, ...payload })
        });
        return await res.json();
      }
    } catch (err) {
      console.warn('[GasClient] 실서버 통신 실패, 안전한 Mock 모드로 폴백합니다:', err);
      return this._handleMockRequest(action, payload);
    }
  },

  /**
   * 오프라인/로컬 브라우저 즉시 체험용 Mock 데이터 처리기
   */
  _handleMockRequest: function(action, payload) {
    const storageKey = 'GREEN_IT_MOCK_DB';
    let db = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!db.classes) db.classes = {};
    if (!db.submissions) db.submissions = [];

    // 가상 네트워크 지연 (150ms)
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (action) {
          case 'getJobs':
            resolve({
              success: true,
              action: action,
              data: GreenJobCache.getAllJobs()
            });
            break;

          case 'createClass':
            const classId = `CLS_${Date.now()}_${payload.schoolName}_${payload.grade}_${payload.classNum}`;
            db.classes[classId] = {
              classId: classId,
              schoolName: payload.schoolName,
              grade: payload.grade,
              classNum: payload.classNum,
              gradeTier: payload.gradeTier,
              pin: payload.pin,
              isUnlocked: false
            };
            localStorage.setItem(storageKey, JSON.stringify(db));
            resolve({
              success: true,
              action: action,
              data: db.classes[classId]
            });
            break;

          case 'getClassStatus':
            const targetClass = db.classes[payload.classId] || {
              classId: payload.classId,
              schoolName: '그린잇 체험학급',
              grade: 6,
              classNum: 1,
              isUnlocked: true // 데모 모드에서는 기본 허용
            };
            resolve({
              success: true,
              action: action,
              data: targetClass
            });
            break;

          case 'toggleResultLock':
            if (db.classes[payload.classId]) {
              db.classes[payload.classId].isUnlocked = Boolean(payload.unlock);
              localStorage.setItem(storageKey, JSON.stringify(db));
            }
            resolve({
              success: true,
              action: action,
              data: { classId: payload.classId, isUnlocked: Boolean(payload.unlock) }
            });
            break;

          case 'submitSimulation':
            const existingIdx = db.submissions.findIndex(s => s.studentKey === payload.studentKey);
            const subData = {
              ...payload,
              timestamp: new Date().toLocaleTimeString()
            };
            if (existingIdx >= 0) {
              db.submissions[existingIdx] = subData;
            } else {
              db.submissions.push(subData);
            }
            localStorage.setItem(storageKey, JSON.stringify(db));
            resolve({
              success: true,
              action: action,
              data: {
                studentKey: payload.studentKey,
                upsertType: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
                totalScore: payload.totalScore,
                matchedJob: payload.matchedJob
              }
            });
            break;

          case 'getClassStats':
            const subs = db.submissions.filter(s => !payload.classId || s.classId === payload.classId);
            const topicCounts = { '산림생태': 0, '해양생태': 0, '기후에너지': 0, '자원순환': 0 };
            const scoreTiers = { high: 0, mid: 0, low: 0 };
            let sum = 0;
            subs.forEach(s => {
              if (topicCounts[s.topic] !== undefined) topicCounts[s.topic]++;
              sum += s.totalScore;
              if (s.totalScore >= 80) scoreTiers.high++;
              else if (s.totalScore >= 50) scoreTiers.mid++;
              else scoreTiers.low++;
            });
            resolve({
              success: true,
              action: action,
              data: {
                summary: {
                  totalStudents: subs.length,
                  averageScore: subs.length ? Math.round(sum / subs.length) : 0,
                  topicCounts: topicCounts,
                  scoreTiers: scoreTiers,
                  topJobs: [
                    { jobName: '산림탄소회계사', count: 3 },
                    { jobName: '신재생에너지연구원', count: 2 }
                  ]
                },
                students: subs
              }
            });
            break;

          default:
            resolve({ success: true, action: action, data: {} });
        }
      }, 150);
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GasClient };
}

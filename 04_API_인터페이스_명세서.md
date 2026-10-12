# 04. 그린잇! (Green-it!) API 인터페이스 명세서

본 문서는 **Google Apps Script(GAS) Web App**과 프론트엔드(`index.html`) 간의 데이터 통신 규격을 정의한 **API 인터페이스 명세서**입니다.

---

## 1. 통신 기본 규격 및 프로토콜

* **프로토콜:** HTTPS
* **엔드포인트:** Google Apps Script 웹 앱 배포 URL (`https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`)
* **메시징 아키텍처:** 단일 URL 라우팅 기반의 **JSON-RPC 스타일 Action 디스패칭**
* **데이터 포맷:** `application/json; charset=utf-8`
* **CORS 및 리다이렉트 대응:**
  * GAS 웹 앱은 브라우저에서 요청 시 302 리다이렉트를 수반합니다.
  * 프론트엔드 `fetch()` 호출 시 `redirect: "follow"` 옵션을 기본 적용합니다.
  * 백엔드는 응답 시 `ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON)`을 반환합니다.

---

## 2. 공통 응답 포맷 (Common Response Envelope)

모든 API 응답은 일관된 JSON 래퍼 구조를 따릅니다.

### 성공 응답 포맷
```json
{
  "success": true,
  "action": "액션명",
  "data": { ... },
  "message": "성공 메시지 (옵션)"
}
```

### 실패 응답 포맷
```json
{
  "success": false,
  "action": "액션명",
  "error": {
    "code": "ERR_CODE",
    "message": "사용자 친화적 에러 사유"
  }
}
```

---

## 3. 조회 API 명세 (`doGet`)

### 3.1 30개 직업 마스터 데이터 조회 (`action=getJobs`)
* **설명:** 앱 최초 로딩 시 30개 직업 풀과 이원화 설명문을 일괄 조회하여 클라이언트에 캐싱합니다.
* **HTTP Method:** `GET`
* **Query Parameters:**
  | 파라미터 | 타입 | 필수 | 설명 |
  | :--- | :---: | :---: | :--- |
  | `action` | String | O | 고정값: `getJobs` |

* **Response 예시:**
  ```json
  {
    "success": true,
    "action": "getJobs",
    "data": [
      {
        "category": "산림생태",
        "score_min": 80,
        "score_max": 100,
        "job_name": "산림탄소회계사",
        "desc_elem": "나무와 숲이 빨아들이는 탄소 양을 정확히 세어 지구 온도를 낮추는 숲의 은행원!",
        "desc_sec": "국제 탄소배출권 인증 기준에 기반하여 산림 흡수원 흡수량을 정량 평가·감사하는 탄소 전략 전문가.",
        "sub1": "산림경영기획가",
        "sub2": "도시숲설계가",
        "feedback_elem": "지구를 위한 뛰어난 거시적 설계 감각을 지녔어요!",
        "feedback_sec": "탄소중립 제도와 ESG 거버넌스를 아우르는 전략적 기획 역량이 탁월합니다."
      }
    ]
  }
  ```

---

### 3.2 학급 접속 및 잠금 상태 확인 (`action=getClassStatus`)
* **설명:** 학생 기기에서 해당 반의 존재 여부 및 교사의 [결과 허용] 스위치 상태를 3초 간격으로 확인합니다.
* **HTTP Method:** `GET`
* **Query Parameters:**
  | 파라미터 | 타입 | 필수 | 설명 |
  | :--- | :---: | :---: | :--- |
  | `action` | String | O | 고정값: `getClassStatus` |
  | `classId` | String | O | 조회할 학급 ID (예: `CLS_2026_HAN_6_2`) |

* **Response 예시:**
  ```json
  {
    "success": true,
    "action": "getClassStatus",
    "data": {
      "classId": "CLS_2026_HAN_6_2",
      "schoolName": "한국초등학교",
      "grade": 6,
      "classNum": 2,
      "gradeTier": "ELEM",
      "isUnlocked": false,
      "totalSubmitted": 18
    }
  }
  ```

---

### 3.3 교사용 학급 통합 통계 및 명단 조회 (`action=getClassStats`)
* **설명:** 교사용 대시보드에서 Chart.js 시각화 및 학생 제출 테이블을 실시간 갱신하기 위해 호출합니다.
* **HTTP Method:** `GET`
* **Query Parameters:**
  | 파라미터 | 타입 | 필수 | 설명 |
  | :--- | :---: | :---: | :--- |
  | `action` | String | O | 고정값: `getClassStats` |
  | `classId` | String | O | 학급 고유 ID |
  | `pin` | String | O | 교사 인증 PIN 비밀번호 |

* **Response 예시:**
  ```json
  {
    "success": true,
    "action": "getClassStats",
    "data": {
      "classId": "CLS_2026_HAN_6_2",
      "isUnlocked": false,
      "summary": {
        "totalStudents": 24,
        "averageScore": 78.5,
        "topicCounts": {
          "산림생태": 7,
          "해양생태": 5,
          "기후에너지": 8,
          "자원순환": 4
        },
        "topJobs": [
          { "jobName": "신재생에너지연구원", "count": 5 },
          { "jobName": "산림탄소회계사", "count": 4 },
          { "jobName": "순환경제컨설턴트", "count": 3 }
        ]
      },
      "students": [
        {
          "studentNo": "7",
          "name": "초록별",
          "topic": "산림생태",
          "totalScore": 88,
          "matchedJob": "산림탄소회계사",
          "timestamp": "2026-10-12 15:45:10"
        }
      ]
    }
  }
  ```

---

## 4. 조작 API 명세 (`doPost`)

`doPost` 호출 시 Request Body는 `application/json` 규격의 문자열을 전송합니다.

### 4.1 신규 반 개설 (`action=createClass`)
* **설명:** 교사가 [학교명], [학년], [반]을 입력하고 개설할 때 구글 시트 내 전용 탭을 자동 생성합니다.
* **Request Body:**
  ```json
  {
    "action": "createClass",
    "schoolName": "한국초등학교",
    "grade": 6,
    "classNum": 2,
    "gradeTier": "ELEM",
    "pin": "1234"
  }
  ```
* **Response 예시:**
  ```json
  {
    "success": true,
    "action": "createClass",
    "data": {
      "classId": "CLS_20261012_HAN_6_2",
      "sheetName": "한국초_6_2",
      "joinUrl": "https://.../index.html?role=student&classId=CLS_20261012_HAN_6_2"
    }
  }
  ```

---

### 4.2 결과 보기 잠금/해제 토글 (`action=toggleResultLock`)
* **설명:** 교사가 대시보드에서 [학생 개별 결과 보기 허용] 스위치를 켜거나 끌 때 호출합니다.
* **Request Body:**
  ```json
  {
    "action": "toggleResultLock",
    "classId": "CLS_20261012_HAN_6_2",
    "pin": "1234",
    "unlock": true
  }
  ```
* **Response 예시:**
  ```json
  {
    "success": true,
    "action": "toggleResultLock",
    "data": {
      "classId": "CLS_20261012_HAN_6_2",
      "isUnlocked": true
    }
  }
  ```

---

### 4.3 학생 시뮬레이션 결과 제출 (`action=submitSimulation`)
* **설명:** 학생이 3대 슬라이더 조작 후 [정책 제출]을 클릭할 때 저장합니다. (LockService 및 Upsert 적용)
* **Request Body:**
  ```json
  {
    "action": "submitSimulation",
    "classId": "CLS_20261012_HAN_6_2",
    "studentKey": "CLS_20261012_HAN_6_2_7_초록별",
    "studentNo": "7",
    "studentName": "초록별",
    "topic": "산림생태",
    "policy": {
      "budget": 85,
      "regulation": 70,
      "techRnd": 90
    },
    "totalScore": 88,
    "matchedJob": "산림탄소회계사",
    "subJobs": "산림경영기획가, 도시숲설계가"
  }
  ```
* **Response 예시:**
  ```json
  {
    "success": true,
    "action": "submitSimulation",
    "data": {
      "studentKey": "CLS_20261012_HAN_6_2_7_초록별",
      "upsertType": "INSERT",
      "timestamp": "2026-10-12 15:48:22"
    }
  }
  ```

---

## 5. 표준 에러 코드 체계

| 에러 코드 | 원인 및 설명 | 대응 가이드 |
| :--- | :--- | :--- |
| `ERR_INVALID_ACTION` | 지원하지 않는 `action` 이름 전송 | 클라이언트 액션명 오타 확인 |
| `ERR_CLASS_NOT_FOUND` | 유효하지 않거나 종료된 `classId` | 접속 링크 및 QR 코드 재확인 안내 |
| `ERR_AUTH_FAILED` | 교사 PIN 비밀번호 불일치 | 비밀번호 재입력 모달 노출 |
| `ERR_LOCK_TIMEOUT` | 동시 접속 폭증으로 10초 내 락 획득 실패 | 1~2초 후 클라이언트 자동 재시도 |
| `ERR_VALIDATION_FAILED` | 필수 파라미터 누락 또는 점수 범위 초과 | 입력 폼 유효성 재검증 후 전송 |
| `ERR_INTERNAL_GAS` | 구글 시트 접근 한도 또는 내부 스크립트 에러 | 비상용 화면 캡처 저장 유도 |

---

## 6. 프론트엔드 Fetch 클라이언트 구현 권장 패턴

```javascript
// 프론트엔드 통신 헬퍼 함수
async function callGreenItApi(method = 'GET', action, paramsOrBody = {}) {
  const GAS_URL = window.GREEN_IT_CONFIG.GAS_URL;
  
  if (method === 'GET') {
    const query = new URLSearchParams({ action, ...paramsOrBody }).toString();
    const res = await fetch(`${GAS_URL}?${query}`, { method: 'GET', redirect: 'follow' });
    return await res.json();
  } else {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // GAS CORS 회피 트릭
      body: JSON.stringify({ action, ...paramsOrBody })
    });
    return await res.json();
  }
}
```

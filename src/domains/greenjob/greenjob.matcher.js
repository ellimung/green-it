/**
 * greenjob.matcher.js - 점수 티어 및 환경 주제 기반 30개 그린잡 매칭 엔진
 */

var GreenJobMatcher = {
  /**
   * 시뮬레이션 결과(주제 + 점수)를 바탕으로 메인 직업 1개와 서브 직업 2개를 매칭합니다.
   * @param {string} category - '산림생태' | '해양생태' | '기후에너지' | '자원순환'
   * @param {number} totalScore - 0 ~ 100 점수
   * @param {string} [gradeTier='ELEM'] - 'ELEM' (초등) | 'SEC' (중·고등)
   */
  match: function(category, totalScore, gradeTier) {
    var tier = (gradeTier || 'ELEM').toUpperCase();
    var allJobs = (typeof GreenJobCache !== 'undefined') 
      ? GreenJobCache.getAllJobs() 
      : [];

    // 1. 해당 카테고리 필터링
    var categoryJobs = allJobs.filter(function(j) {
      return j.category === category;
    });

    if (categoryJobs.length === 0) {
      // 카테고리 매칭 실패 시 전체 풀에서 탐색
      categoryJobs = allJobs;
    }

    // 2. 점수 구간(score_min <= totalScore <= score_max) 매칭
    var matchedCandidates = categoryJobs.filter(function(j) {
      return totalScore >= j.score_min && totalScore <= j.score_max;
    });

    // 만약 구간 매칭이 비어있으면 가장 가까운 직업 선택
    if (matchedCandidates.length === 0) {
      matchedCandidates = categoryJobs;
    }

    // 메인 직업 선택 (후보 중 첫 번째 또는 시드 기반)
    var mainJobRaw = matchedCandidates[0];

    // 학교급(초등 vs 중고등)에 따른 이원화 문구 결정
    var isElem = (tier === 'ELEM');
    var description = isElem ? mainJobRaw.desc_elem : mainJobRaw.desc_sec;
    var feedback = isElem ? mainJobRaw.feedback_elem : mainJobRaw.feedback_sec;

    var tierBadge = '현장 실천가';
    var tierColor = 'emerald';
    if (totalScore >= 80) {
      tierBadge = isElem ? '최고의 환경 리더' : '미래 ESG 전략가';
      tierColor = 'amber';
    } else if (totalScore < 50) {
      tierBadge = isElem ? '용감한 긴급 구조대' : '블루오션 개척자';
      tierColor = 'rose';
    }

    return {
      category: category,
      totalScore: totalScore,
      gradeTier: tier,
      tierBadge: tierBadge,
      tierColor: tierColor,
      mainJob: {
        name: mainJobRaw.job_name,
        category: mainJobRaw.category,
        description: description,
        feedback: feedback,
        scoreRange: `${mainJobRaw.score_min} ~ ${mainJobRaw.score_max}점`
      },
      subJobs: [
        mainJobRaw.sub1,
        mainJobRaw.sub2
      ]
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GreenJobMatcher };
}

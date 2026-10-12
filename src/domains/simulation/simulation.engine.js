/**
 * simulation.engine.js - 환경 정책 시뮬레이션 점수 산출 및 지표 계산 엔진
 */

var SimulationEngine = {
  /**
   * 3대 정책 슬라이더 수치를 바탕으로 종합 점수(0~100)와 서브 지표들을 도출합니다.
   * @param {string} topicId - 'FOREST' | 'OCEAN' | 'ENERGY' | 'RECYCLE'
   * @param {Object} policy - { budget: number, regulation: number, techRnd: number }
   * @returns {Object} { totalScore, scoreTier, indicators, balanceFactor, stdDev }
   */
  calculate: function(topicId, policy) {
    var topic = (typeof TOPICS_DATA !== 'undefined' ? TOPICS_DATA[topicId] : null);
    if (!topic) {
      throw new Error('유효하지 않은 환경 주제 ID입니다: ' + topicId);
    }

    var b = Math.max(0, Math.min(100, parseInt(policy.budget, 10) || 0));
    var r = Math.max(0, Math.min(100, parseInt(policy.regulation, 10) || 0));
    var t = Math.max(0, Math.min(100, parseInt(policy.techRnd, 10) || 0));

    var weights = topic.weights;
    var baseScore = (b * weights.budget) + (r * weights.regulation) + (t * weights.techRnd);

    // 정책 편중도(표준편차) 계산
    var mean = (b + r + t) / 3;
    var variance = ((b - mean) * (b - mean) + (r - mean) * (r - mean) + (t - mean) * (t - mean)) / 3;
    var stdDev = Math.sqrt(variance);

    // 밸런스 팩터(B) 적용: 고른 정책에는 5% 가산, 극단적 편중 정책에는 10% 감점
    var balanceFactor = 1.0;
    var balanceMessage = '안정적인 정책 분포입니다.';
    if (stdDev <= 20) {
      balanceFactor = 1.05;
      balanceMessage = '예산·규제·기술이 조화를 이룬 균형 잡힌 명품 정책입니다 (+5% 시너지).';
    } else if (stdDev > 40) {
      balanceFactor = 0.90;
      balanceMessage = '특정 정책에만 극단적으로 편중되어 현실적 리스크가 감지되었습니다 (-10%).';
    }

    var rawTotal = Math.round(baseScore * balanceFactor);
    var totalScore = Math.max(0, Math.min(100, rawTotal));

    // 점수 구간 티어 판정
    var scoreTier = 'MID';
    var tierTitle = '현장 실천가 및 브릿지 중재 전문가';
    if (totalScore >= 80) {
      scoreTier = 'HIGH';
      tierTitle = '미래 전략가 및 시스템 설계자';
    } else if (totalScore < 50) {
      scoreTier = 'LOW';
      tierTitle = '긴급 위기대응가 및 블루오션 개척자';
    }

    // 4대 환경 지표 세부 시뮬레이션 계산 (Chart.js 방사형/막대 그래프용)
    var carbonReduction = Math.round((b * 0.3 + r * 0.35 + t * 0.35));
    var ecologicalHealth = Math.round((b * 0.4 + r * 0.45 + t * 0.15));
    var economicSustainability = Math.round((b * 0.25 + r * 0.35 + t * 0.4));
    var techInnovation = Math.round((b * 0.15 + r * 0.15 + t * 0.7));

    return {
      topicId: topicId,
      categoryName: topic.categoryName,
      inputs: { budget: b, regulation: r, techRnd: t },
      totalScore: totalScore,
      scoreTier: scoreTier,
      tierTitle: tierTitle,
      balanceFactor: balanceFactor,
      balanceMessage: balanceMessage,
      stdDev: Math.round(stdDev * 10) / 10,
      indicators: {
        carbonReduction: Math.max(0, Math.min(100, carbonReduction)),
        ecologicalHealth: Math.max(0, Math.min(100, ecologicalHealth)),
        economicSustainability: Math.max(0, Math.min(100, economicSustainability)),
        techInnovation: Math.max(0, Math.min(100, techInnovation))
      }
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SimulationEngine };
}

/**
 * Multi-Factor AI Prioritization Engine
 * Integrates:
 * 1. Physical Damage Severity (Pothole depth / crack width)
 * 2. Traffic Density & Congestion (Arterial vs residential)
 * 3. Road Lifecycle Aging (Roads past designed lifespan from Kaggle dataset)
 * 4. Microclimate Rapid Fluctuation (Flash rain, thermal swings, runoff saturation)
 * 5. Crowd & Telemetry Confirmations
 */

function calculateAIPriority({
  type = 'pothole',
  severity = 'HIGH',
  dimensions = { depth_cm: 8, width_cm: 40 },
  road = null,
  climateZone = null,
  verificationCount = 1
}) {
  // 1. Physical Damage Severity Base Score (0-35 points)
  let damageScore = 20;
  const depth = Number(dimensions.depth_cm) || 6;
  const width = Number(dimensions.width_cm) || 30;

  if (type === 'bridge_crack' || type === 'wall_crack') {
    // Structural issues carry inherently high civic risk
    damageScore = severity === 'CRITICAL' ? 35 : severity === 'HIGH' ? 30 : 22;
  } else {
    // Potholes & road cracks
    if (depth >= 12 || width >= 60) {
      damageScore = 35; // Critical crater
    } else if (depth >= 8 || width >= 40) {
      damageScore = 28; // High depth
    } else if (depth >= 5 || width >= 25) {
      damageScore = 20; // Moderate
    } else {
      damageScore = 12; // Minor surface spall
    }
  }

  // 2. Traffic Congestion & Area Multiplier (0-25 points)
  let trafficScore = 15;
  let trafficDesc = 'Moderate traffic route';

  if (road) {
    if (road.traffic_congestion_tier === 'CRITICAL' || road.traffic_multiplier >= 1.45) {
      trafficScore = 25;
      trafficDesc = `High-density critical arterial corridor (${road.traffic_volume_pcu_day?.toLocaleString() || '120k+'} PCU/day)`;
    } else if (road.traffic_congestion_tier === 'HIGH' || road.traffic_multiplier >= 1.3) {
      trafficScore = 20;
      trafficDesc = `Heavy traffic corridor (${road.traffic_volume_pcu_day?.toLocaleString() || '80k'} PCU/day)`;
    } else if (road.traffic_congestion_tier === 'MODERATE') {
      trafficScore = 14;
      trafficDesc = 'Moderate collector road';
    } else {
      trafficScore = 8;
      trafficDesc = 'Low-speed residential sector';
    }
  }

  // 3. Road Asset Age & Design Lifespan Degradation (0-20 points)
  let roadAgeScore = 5;
  let ageDesc = 'Road within expected lifespan';

  if (road) {
    const age = road.current_age_years || (new Date().getFullYear() - (road.construction_year || 2018));
    const lifespan = road.design_lifespan_years || 10;
    const isOverdue = age >= lifespan;
    const overdueYears = Math.max(0, age - lifespan);

    if (isOverdue) {
      if (overdueYears >= 2) {
        roadAgeScore = 20; // Severely overdue road asset
        ageDesc = `CRITICAL: Road is ${age} yrs old (${overdueYears} yrs past its ${lifespan}-yr designed limit)`;
      } else {
        roadAgeScore = 15;
        ageDesc = `WARNING: Road has reached its ${lifespan}-yr designed lifespan (${age} yrs old)`;
      }
    } else if (age >= lifespan - 1) {
      roadAgeScore = 10;
      ageDesc = `Road is nearing lifecycle expiry (${age}/${lifespan} yrs)`;
    } else {
      roadAgeScore = 5;
      ageDesc = `Road is within lifespan (${age}/${lifespan} yrs)`;
    }
  }

  // 4. Climate Volatility & Flash Rain Runoff Impact (0-15 points)
  let climateScore = 4;
  let climateDesc = 'Stable microclimate conditions';

  if (climateZone) {
    if (climateZone.rapid_fluctuation_detected && climateZone.climate_volatility_index >= 75) {
      climateScore = 15;
      climateDesc = `Rapid weather volatility (${climateZone.volatility_type}) with ${climateZone.current_weather?.rainfall_last_24h_mm || 50}mm rainfall accelerating sub-base washouts`;
    } else if (climateZone.rapid_fluctuation_detected || climateZone.climate_volatility_index >= 60) {
      climateScore = 10;
      climateDesc = `Moderate climate stress with active precipitation in ward`;
    } else {
      climateScore = 4;
      climateDesc = 'Low weather erosion impact';
    }
  }

  // 5. Crowd & Patrol Confirmations (0-5 points)
  const confirmations = Math.min(5, Math.max(0, (verificationCount - 1)));
  const confirmationScore = confirmations;

  // Composite AI Score (0 - 100)
  const totalScore = Math.min(100, Math.round(damageScore + trafficScore + roadAgeScore + climateScore + confirmationScore));

  // Determine Priority Tier and Target SLA
  let priorityTier = 'P3_MEDIUM';
  let targetSlaHours = 48;
  let label = 'Medium Priority';

  if (totalScore >= 90) {
    priorityTier = 'P1_IMMEDIATE';
    targetSlaHours = 12;
    label = 'P1 Immediate Emergency Action';
  } else if (totalScore >= 75) {
    priorityTier = 'P2_HIGH';
    targetSlaHours = 24;
    label = 'P2 High Priority';
  } else if (totalScore >= 50) {
    priorityTier = 'P3_MEDIUM';
    targetSlaHours = 72;
    label = 'P3 Medium Priority (Scheduled)';
  } else {
    priorityTier = 'P4_ROUTINE';
    targetSlaHours = 168; // 7 days
    label = 'P4 Routine Maintenance';
  }

  // AI Reasoning Narrative
  const reasoning = `${label} [Score ${totalScore}/100]: ${trafficDesc} + ${damageScore} pts damage severity (${type === 'pothole' ? `${depth}cm depth` : 'structural fracture'}) + ${ageDesc} + ${climateDesc} + ${verificationCount} crowd/sensor verification(s).`;

  return {
    ai_priority_score: totalScore,
    ai_calculated_priority: priorityTier,
    target_sla_hours: targetSlaHours,
    ai_reasoning: reasoning,
    score_breakdown: {
      damage_severity_points: damageScore,
      traffic_congestion_points: trafficScore,
      road_age_degradation_points: roadAgeScore,
      climate_volatility_points: climateScore,
      verification_confirmations_points: confirmationScore
    }
  };
}

module.exports = {
  calculateAIPriority
};

/**
 * Geospatial Calculation & De-duplication Engine
 * Uses the Haversine formula to compute great-circle distances between GPS coordinates.
 */

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Checks if a candidate coordinate is within the proximity threshold of any existing active defect.
 * Threshold is typically 20 meters (accounting for GPS drift and pothole circumference).
 */
function findDuplicateDefect(defects, candidateLat, candidateLng, maxRadiusMeters = 22) {
  let closestDefect = null;
  let minDistance = Infinity;

  for (const defect of defects) {
    if (!defect.location || typeof defect.location.lat !== 'number') continue;
    // Only compare against non-resolved or recently reported issues
    if (defect.status === 'Resolved') continue;

    const distance = calculateHaversineDistance(
      candidateLat,
      candidateLng,
      defect.location.lat,
      defect.location.lng
    );

    if (distance <= maxRadiusMeters && distance < minDistance) {
      minDistance = distance;
      closestDefect = {
        ...defect,
        distanceMeters: Math.round(distance * 10) / 10
      };
    }
  }

  return closestDefect;
}

/**
 * Finds the closest municipal road asset to the provided GPS coordinates.
 */
function findClosestRoad(roads, lat, lng) {
  let closestRoad = null;
  let minDistance = Infinity;

  for (const road of roads) {
    if (!road.coordinates) continue;
    const distance = calculateHaversineDistance(
      lat,
      lng,
      road.coordinates.lat,
      road.coordinates.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestRoad = {
        ...road,
        distanceFromRoadCenterMeters: Math.round(distance)
      };
    }
  }

  return closestRoad;
}

module.exports = {
  calculateHaversineDistance,
  findDuplicateDefect,
  findClosestRoad
};

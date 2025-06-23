export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export function getCurrentLocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: "Geolocation is not supported by this browser"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject({
          code: error.code,
          message: error.message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function isWithinGeofence(
  currentLat: number,
  currentLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(currentLat, currentLon, centerLat, centerLon);
  return distance <= radiusMeters;
}

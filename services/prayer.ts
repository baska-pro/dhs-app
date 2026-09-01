// Prayer time calculation engine based on solar celestial coordinates and Kemenag standard

export interface PrayerSchedule {
  Subuh: string;
  Terbit: string;
  Dzuhur: string;
  Ashar: string;
  Maghrib: string;
  Isya: string;
}

export interface PrayerCountdown {
  nextPrayer: string;
  nextTime: string;
  timeRemaining: string; // e.g. "02:15:30"
  currentPrayer: string;
  progressPercent: number;
}

function dsin(d: number) { return Math.sin(d * (Math.PI / 180)); }
function dcos(d: number) { return Math.cos(d * (Math.PI / 180)); }
function dtan(d: number) { return Math.tan(d * (Math.PI / 180)); }
function darcsin(x: number) { return Math.asin(x) * (180 / Math.PI); }
function darccos(x: number) { return Math.acos(x) * (180 / Math.PI); }
function darctan2(y: number, x: number) { return Math.atan2(y, x) * (180 / Math.PI); }
function darccot(x: number) { return darctan2(1, x); }

export function calculatePrayerTimes(
  date: Date = new Date(),
  lat: number = -6.2088, // Default Jakarta
  lng: number = 106.8456,
  timezone: number = 7, // GMT+7
  offsets: Record<string, number> = {}
): PrayerSchedule {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

  // Approximate solar coordinates
  const B = (360 / 365) * (dayOfYear - 81);
  const eot = 9.87 * dsin(2 * B) - 7.53 * dcos(B) - 1.5 * dsin(B); // Equation of time in minutes
  const decl = 23.45 * dsin((360 / 365) * (dayOfYear - 81)); // Solar declination

  // Solar noon
  const noon = 12 + (timezone * 15 - lng) / 15 - eot / 60;

  // Calculation parameters (Kemenag standard: Subuh angle 20°, Isya angle 18°)
  const subuhAngle = 20;
  const isyaAngle = 18;

  // Hour angles
  const getHourAngle = (angle: number) => {
    const val = (-dsin(angle) - dsin(lat) * dsin(decl)) / (dcos(lat) * dcos(decl));
    if (val > 1 || val < -1) return 0;
    return darccos(val) / 15;
  };

  const getAsharHourAngle = () => {
    // Altitude of sun at Ashar: cot(alpha) = 1 + tan(|lat - decl|) => alpha = arccot(1 + tan(|lat - decl|))
    const asharAlt = darccot(1 + dtan(Math.abs(lat - decl)));
    const val = (dsin(asharAlt) - dsin(lat) * dsin(decl)) / (dcos(lat) * dcos(decl));
    if (val > 1 || val < -1) return 0;
    return darccos(val) / 15;
  };

  const sunAngle = 0.833; // for sunrise/sunset
  const sunHourAngle = getHourAngle(sunAngle);
  const subuhHourAngle = getHourAngle(subuhAngle);
  const isyaHourAngle = getHourAngle(isyaAngle);
  const asharHourAngle = getAsharHourAngle();

  const toTimeString = (decimalHours: number, offsetMin: number = 0): string => {
    let totalMinutes = decimalHours * 60 + offsetMin + 2; // +2 min ikhtiyat standard
    while (totalMinutes < 0) totalMinutes += 24 * 60;
    while (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return {
    Subuh: toTimeString(noon - subuhHourAngle, offsets.Subuh || 0),
    Terbit: toTimeString(noon - sunHourAngle, 0),
    Dzuhur: toTimeString(noon, offsets.Dzuhur || 0),
    Ashar: toTimeString(noon + asharHourAngle, offsets.Ashar || 0),
    Maghrib: toTimeString(noon + sunHourAngle, offsets.Maghrib || 0),
    Isya: toTimeString(noon + isyaHourAngle, offsets.Isya || 0),
  };
}

export function getPrayerCountdown(schedule: PrayerSchedule, now: Date = new Date()): PrayerCountdown {
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const parseTime = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const prayers = [
    { name: 'Subuh', min: parseTime(schedule.Subuh) },
    { name: 'Terbit', min: parseTime(schedule.Terbit) },
    { name: 'Dzuhur', min: parseTime(schedule.Dzuhur) },
    { name: 'Ashar', min: parseTime(schedule.Ashar) },
    { name: 'Maghrib', min: parseTime(schedule.Maghrib) },
    { name: 'Isya', min: parseTime(schedule.Isya) },
  ];

  let nextIdx = prayers.findIndex(p => p.min > currentMinutes);
  let prevIdx = -1;

  if (nextIdx === -1) {
    // Next prayer is tomorrow Subuh
    nextIdx = 0;
    prevIdx = prayers.length - 1;
  } else if (nextIdx === 0) {
    prevIdx = prayers.length - 1;
  } else {
    prevIdx = nextIdx - 1;
  }

  const nextPrayerObj = prayers[nextIdx];
  const prevPrayerObj = prayers[prevIdx];

  let diffMinutes = nextPrayerObj.min - currentMinutes;
  if (diffMinutes < 0) diffMinutes += 24 * 60;

  const totalSegmentMinutes = nextPrayerObj.min >= prevPrayerObj.min
    ? nextPrayerObj.min - prevPrayerObj.min
    : (nextPrayerObj.min + 24 * 60) - prevPrayerObj.min;

  const elapsed = totalSegmentMinutes - diffMinutes;
  const progressPercent = Math.min(100, Math.max(0, (elapsed / (totalSegmentMinutes || 1)) * 100));

  const totalSecs = Math.floor(diffMinutes * 60);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const timeRemaining = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return {
    nextPrayer: nextPrayerObj.name,
    nextTime: schedule[nextPrayerObj.name as keyof PrayerSchedule] || '',
    timeRemaining,
    currentPrayer: prevPrayerObj.name,
    progressPercent
  };
}

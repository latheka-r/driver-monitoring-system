// All monitoring data is stored ONLY in the browser (localStorage), scoped
// per user id. No webcam frames, images, or raw landmarks are ever stored —
// only aggregate session statistics, matching the privacy requirements.

export interface SessionSummary {
  id: string;
  userId: string;
  date: string; // ISO string
  durationSeconds: number;
  averageEAR: number;
  lowestEAR: number;
  longestEyeClosureSec: number;
  blinkCount: number;
  yawnCount: number;
  averageMAR: number;
  maxMAR: number;
  averageHeadPitch: number;
  maxDownwardPitch: number;
  warningCount: number;
  maxDrowsinessIndex: number;
  status: 'Low' | 'Moderate' | 'High' | 'Critical';
}

const HISTORY_KEY_PREFIX = 'dms_history_';

export function saveSession(session: SessionSummary) {
  const key = HISTORY_KEY_PREFIX + session.userId;
  const existing = getSessions(session.userId);
  existing.unshift(session);
  localStorage.setItem(key, JSON.stringify(existing));
}

export function getSessions(userId: string): SessionSummary[] {
  const key = HISTORY_KEY_PREFIX + userId;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SessionSummary[];
  } catch {
    return [];
  }
}

export function getSessionById(userId: string, id: string): SessionSummary | undefined {
  return getSessions(userId).find((s) => s.id === id);
}

export function computeAggregateStats(userId: string) {
  const sessions = getSessions(userId);
  const totalSessions = sessions.length;
  const totalTimeSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalAlerts = sessions.reduce((sum, s) => sum + s.warningCount, 0);
  const totalYawns = sessions.reduce((sum, s) => sum + s.yawnCount, 0);
  const totalBlinks = sessions.reduce((sum, s) => sum + s.blinkCount, 0);
  const avgEAR =
    totalSessions > 0
      ? sessions.reduce((sum, s) => sum + s.averageEAR, 0) / totalSessions
      : 0;

  return {
    totalSessions,
    totalTimeSeconds,
    totalAlerts,
    totalYawns,
    totalBlinks,
    avgEAR
  };
}

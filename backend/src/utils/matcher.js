function normalize(text) {
  if (!text) return '';
  return String(text).toLowerCase();
}

function tokenize(text) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function arrayify(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Compute a lightweight match score (0-100) and reasons for a clinical trial
// using patient profile fields: conditions[], location (string)
function scoreTrialForPatient(patientProfile, trial) {
  const reasons = [];
  let score = 0;

  const patientConditions = arrayify(patientProfile?.conditions).map(normalize);
  const trialText = [trial.title, trial.description, trial.conditions]
    .map((t) => (Array.isArray(t) ? t.join(' ') : t))
    .map(normalize)
    .join(' ');

  // Condition overlap (up to 60 points)
  let conditionHits = 0;
  for (const cond of patientConditions) {
    if (cond && trialText.includes(cond)) {
      conditionHits += 1;
    }
  }
  if (patientConditions.length > 0) {
    const condScore = Math.min(60, Math.round((conditionHits / patientConditions.length) * 60));
    if (condScore > 0) {
      score += condScore;
      reasons.push(`Matches your condition${patientConditions.length > 1 ? 's' : ''}`);
    }
  }

  // Status/phase signal (up to 20 points)
  const status = normalize(trial.status);
  if (status.includes('recruit')) {
    score += 15;
    reasons.push('Actively recruiting');
  } else if (status.includes('not yet recruiting')) {
    score += 8;
    reasons.push('Opening soon');
  }
  const phase = normalize(trial.phase);
  if (phase.includes('phase 3') || phase.includes('phase iii')) {
    score += 5;
    reasons.push('Late-phase study');
  }

  // Location proximity (up to 20 points) – simple string match
  const patientLocation = normalize(patientProfile?.user_location || patientProfile?.location);
  const trialLocation = normalize(trial.location || trial.locations || '');
  if (patientLocation && trialLocation && (trialLocation.includes(patientLocation) || patientLocation.includes(trialLocation))) {
    score += 20;
    reasons.push('Near your location');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // De-duplicate reasons and keep top 3
  const uniqueReasons = Array.from(new Set(reasons)).slice(0, 3);
  return { score, reasons: uniqueReasons };
}

module.exports = { scoreTrialForPatient };



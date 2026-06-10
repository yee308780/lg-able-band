const typeRank = {
  EMERGENCY: 4,
  DANGER: 3,
  LOCATION: 2,
  LIFE: 1,
}

const severityRank = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export function selectPriorityAlert(alerts) {
  if (alerts.length === 0) {
    return null
  }

  return [...alerts].sort(compareAlerts)[0]
}

function compareAlerts(left, right) {
  const leftScore = scoreAlert(left)
  const rightScore = scoreAlert(right)

  if (leftScore !== rightScore) {
    return rightScore - leftScore
  }

  return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
}

function scoreAlert(alert) {
  const unreadBonus = alert.status === 'UNREAD' ? 2 : 0
  return (typeRank[alert.type] || 0) * 10 + (severityRank[alert.severity] || 0) + unreadBonus
}

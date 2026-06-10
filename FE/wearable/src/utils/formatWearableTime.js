export function formatWearableTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '시간 미상'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(date)
}

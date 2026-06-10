export const livingSignalMock = {
  threshold: 0.8,
  workflow: [
    '사용자가 휴대폰 마이크로 알림음을 녹음하고 이름과 유형을 등록합니다.',
    '등록된 샘플은 embedding으로 변환되어 같은 소리의 기준값으로 저장됩니다.',
    '주변 소리 듣기를 시작하면 실시간으로 마이크 입력과 등록 샘플을 비교합니다.',
    '유사도가 threshold 이상이면 등록한 알림음 이름으로 감지 결과를 보여줍니다.',
  ],
  detections: [
    {
      eventId: 'detect-seed-1',
      predicted: true,
      registeredSoundName: '우리 아파트 방송음',
      soundType: 'apartment_announcement',
      soundTypeLabel: '아파트 방송',
      similarity: 0.91,
      detectedAt: '2026-06-10T14:42:00+09:00',
    },
  ],
  sounds: [
    {
      soundId: 'living-signal-1',
      registeredSoundName: '우리 아파트 방송음',
      soundType: 'apartment_announcement',
      soundTypeLabel: '아파트 방송',
      notes: '방송 시작 전에 짧게 울리는 안내음을 직접 녹음해 둔 상태입니다.',
      updatedAt: '2026-06-10T13:10:00+09:00',
      recordings: [
        {
          recordingId: 'recording-1',
          label: 'apt-chime-1',
          createdAt: '2026-06-10T13:00:00+09:00',
          durationSec: 2.4,
          audioDataUrl: '',
          embedding: [0.29, 0.36, 0.41, 0.48, 0.43, 0.34, 0.27, 0.18],
        },
        {
          recordingId: 'recording-2',
          label: 'apt-chime-2',
          createdAt: '2026-06-10T13:04:00+09:00',
          durationSec: 2.1,
          audioDataUrl: '',
          embedding: [0.31, 0.38, 0.4, 0.46, 0.41, 0.33, 0.25, 0.17],
        },
      ],
    },
    {
      soundId: 'living-signal-2',
      registeredSoundName: '현관 초인종',
      soundType: 'doorbell',
      soundTypeLabel: '초인종',
      notes: '현관 벨이 울렸을 때 바로 초인종으로 읽어주기 위한 샘플입니다.',
      updatedAt: '2026-06-10T11:20:00+09:00',
      recordings: [
        {
          recordingId: 'recording-3',
          label: 'doorbell-1',
          createdAt: '2026-06-10T11:10:00+09:00',
          durationSec: 1.8,
          audioDataUrl: '',
          embedding: [0.22, 0.27, 0.44, 0.51, 0.38, 0.23, 0.12, 0.08],
        },
      ],
    },
  ],
}

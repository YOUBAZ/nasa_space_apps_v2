import { formatDistance, formatMissionTime, formatDelay } from '../../src/ui/flight/format'

describe('flight readouts', () => {
  it('mission time reads naturally from seconds to years', () => {
    expect(formatMissionTime(45)).toBe('45 s')
    expect(formatMissionTime(150)).toBe('2 min 30 s')
    expect(formatMissionTime(6 * 3600)).toBe('6 h')
    expect(formatMissionTime(3 * 86400)).toBe('3 days')
    expect(formatMissionTime(210 * 86400)).toBe('7 months')
    expect(formatMissionTime(1800 * 86400)).toBe('4.9 years')
  })
  it('distance switches from kilometres to millions of kilometres', () => {
    expect(formatDistance(100)).toBe('100 km')
    expect(formatDistance(384_400)).toBe('384,400 km')
    expect(formatDistance(225_000_000)).toBe('225 million km')
    expect(formatDistance(1_500_000)).toBe('1.5 million km')
  })
  it('signal delay goes from instant to minutes', () => {
    expect(formatDelay(0.002)).toBe('instant')
    expect(formatDelay(1.3)).toBe('1.3 s')
    expect(formatDelay(750)).toBe('12.5 min')
    expect(formatDelay(2595)).toBe('43 min')
  })
})

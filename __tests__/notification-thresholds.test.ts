import {
  isFillingFast,
  milestoneReached,
  FILLING_FAST_MIN_CAPACITY,
} from '@/lib/notifications/thresholds'

describe('filling fast', () => {
  it('fires only when genuinely nearly gone', () => {
    expect(isFillingFast(100, 86)).toBe(true) // 14 left of 100
    expect(isFillingFast(100, 80)).toBe(false) // 20 left is not "almost gone"
  })

  it('stays quiet for small events where a few tickets left is normal', () => {
    // 3 of 20 left is 15%, but shouting urgency about a 20-seat event is noise.
    expect(isFillingFast(20, 17)).toBe(false)
    expect(isFillingFast(FILLING_FAST_MIN_CAPACITY, FILLING_FAST_MIN_CAPACITY - 1)).toBe(true)
  })

  it('does not treat sold out as filling fast', () => {
    // Sold out is a different message; urgency about buying is useless then.
    expect(isFillingFast(100, 100)).toBe(false)
    expect(isFillingFast(100, 105)).toBe(false) // oversold guard
  })

  it('ignores nonsense inputs rather than dividing by zero', () => {
    expect(isFillingFast(0, 0)).toBe(false)
    expect(isFillingFast(NaN, 5)).toBe(false)
    expect(isFillingFast(100, NaN)).toBe(false)
  })
})

describe('organizer milestones', () => {
  it('reports the highest threshold crossed, not each one on the way', () => {
    // A burst of sales should say "sold out", not walk the organizer through
    // 50% and 75% first.
    expect(milestoneReached(100, 100)).toBe(1)
    expect(milestoneReached(100, 80)).toBe(0.75)
    expect(milestoneReached(100, 50)).toBe(0.5)
  })

  it('stays silent below the first milestone', () => {
    expect(milestoneReached(100, 49)).toBeNull()
    expect(milestoneReached(100, 0)).toBeNull()
  })

  it('handles an event with no capacity set', () => {
    expect(milestoneReached(0, 10)).toBeNull()
  })
})

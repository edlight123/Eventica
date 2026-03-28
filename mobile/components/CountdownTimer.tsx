import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface CountdownTimerProps {
  targetDate: Date;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds };
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const { colors, isDark } = useTheme();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(targetDate));

  useEffect(() => {
  const { colors } = useTheme();
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const isOver = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  if (isOver) return null;

  // Show days/hours/minutes when > 1 day; show hours/minutes/seconds when < 1 day
  const showDays = timeLeft.days >= 1;

  const units = showDays
    ? [
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Mins', value: timeLeft.minutes },
      ]
    : [
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Mins', value: timeLeft.minutes },
        { label: 'Secs', value: timeLeft.seconds },
      ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.surface : '#F0FDFA', borderColor: colors.primary + '33' }]}>
      <Text style={[styles.heading, { color: colors.primary }]}>⏳ Event starts in</Text>
      <View style={styles.unitsRow}>
        {units.map((unit, idx) => (
          <React.Fragment key={unit.label}>
            <View style={[styles.unitBox, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.unitValue, { color: colors.primary }]}>
                {String(unit.value).padStart(2, '0')}
              </Text>
              <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>{unit.label}</Text>
            </View>
            {idx < units.length - 1 && (
              <Text style={[styles.separator, { color: colors.primary }]}>:</Text>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unitBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 64,
  },
  unitValue: {
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  unitLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separator: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 2,
    marginBottom: 16,
  },
});

'use client';

import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
  ctaLabel: string;
}

interface GettingStartedTrackerProps {
  hasCreatedEvent: boolean;
  isVerified: boolean;
  hasPayoutSetup: boolean;
}

export default function GettingStartedTracker({
  hasCreatedEvent,
  isVerified,
  hasPayoutSetup,
}: GettingStartedTrackerProps) {
  const { t } = useTranslation();

  const steps: Step[] = [
    {
      id: 'create-event',
      title: t('organizer.gettingStarted.createEvent', 'Create Your First Event'),
      description: t(
        'organizer.gettingStarted.createEventDesc',
        'Set up your event with details, tickets, and pricing'
      ),
      completed: hasCreatedEvent,
      href: '/organizer/events/new',
      ctaLabel: t('organizer.gettingStarted.createEventCta', 'Create Event'),
    },
    {
      id: 'verify',
      title: t('organizer.gettingStarted.getVerified', 'Get Verified'),
      description: t(
        'organizer.gettingStarted.getVerifiedDesc',
        'Verify your identity to unlock ticket sales'
      ),
      completed: isVerified,
      href: '/organizer/verify',
      ctaLabel: t('organizer.gettingStarted.getVerifiedCta', 'Start Verification'),
    },
    {
      id: 'payout',
      title: t('organizer.gettingStarted.setupPayouts', 'Set Up Payouts'),
      description: t(
        'organizer.gettingStarted.setupPayoutsDesc',
        'Add your bank or mobile money to receive earnings'
      ),
      completed: hasPayoutSetup,
      href: '/organizer/settings/payouts',
      ctaLabel: t('organizer.gettingStarted.setupPayoutsCta', 'Add Payout Method'),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  // Find the next incomplete step
  const nextStep = steps.find((s) => !s.completed);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('organizer.gettingStarted.title', 'Getting Started')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {completedCount === steps.length
                ? t('organizer.gettingStarted.allComplete', "You're all set! 🎉")
                : t('organizer.gettingStarted.progress', '{{completed}} of {{total}} steps complete', {
                    completed: completedCount,
                    total: steps.length,
                  })}
            </p>
          </div>
          <div className="text-2xl font-bold text-primary-600">
            {Math.round(progressPercent)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-100">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`p-4 flex items-center gap-4 transition-colors ${
              step.completed
                ? 'bg-gray-50/50'
                : nextStep?.id === step.id
                ? 'bg-primary-50/30'
                : ''
            }`}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {step.completed ? (
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              ) : (
                <div className="relative">
                  <Circle className="w-8 h-8 text-gray-300" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-500">
                    {index + 1}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-medium ${
                  step.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}
              >
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
            </div>

            {/* Action */}
            {!step.completed && (
              <Link
                href={step.href}
                className={`flex-shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  nextStep?.id === step.id
                    ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {step.ctaLabel}
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}

            {step.completed && (
              <span className="flex-shrink-0 text-sm text-green-600 font-medium">
                {t('common.complete', 'Complete')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

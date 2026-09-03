'use client';

import { Calendar, Sparkles, Users, TrendingUp, ArrowRight, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import GettingStartedTracker from './GettingStartedTracker';

interface WelcomeDashboardProps {
  organizerName?: string;
  hasCreatedEvent: boolean;
  isVerified: boolean;
  hasPayoutSetup: boolean;
}

export default function WelcomeDashboard({
  organizerName,
  hasCreatedEvent,
  isVerified,
  hasPayoutSetup,
}: WelcomeDashboardProps) {
  const { t } = useTranslation();

  const firstName = organizerName?.split(' ')[0] || t('organizer.welcome.defaultName', 'there');

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-500/15 to-brand-600/10 rounded-2xl mb-4">
          <Sparkles className="w-8 h-8 text-brand-300" />
        </div>
        <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.02] text-white mb-2">
          {t('organizer.welcome.greeting', 'Welcome, {{name}}!', { name: firstName })}
        </h1>
        <p className="text-white/60 max-w-md mx-auto">
          {t(
            'organizer.welcome.subtitle',
            "Let's get you set up to start hosting amazing events in Haiti"
          )}
        </p>
      </div>

      {/* Getting Started Tracker */}
      <GettingStartedTracker
        hasCreatedEvent={hasCreatedEvent}
        isVerified={isVerified}
        hasPayoutSetup={hasPayoutSetup}
      />

      {/* Primary CTA - Only show if no events yet */}
      {!hasCreatedEvent && (
        <div className="bg-brand-700 rounded-2xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-semibold mb-2">
                {t('organizer.welcome.createFirst', 'Ready to create your first event?')}
              </h2>
              <p className="text-brand-50 text-sm">
                {t(
                  'organizer.welcome.createFirstDesc',
                  "It only takes a few minutes. You can save as draft and publish when you're ready."
                )}
              </p>
            </div>
            <Link
              href="/organizer/events/new"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white/[0.03] text-brand-300 px-6 py-3 rounded-xl font-semibold hover:bg-brand-500/10 transition-colors shadow-lg"
            >
              {t('organizer.welcome.createEventBtn', 'Create Event')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] rounded-xl p-5  shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-brand-300" />
          </div>
          <h3 className="font-semibold text-white mb-1">
            {t('organizer.welcome.benefit1Title', 'Easy Event Creation')}
          </h3>
          <p className="text-sm text-white/60">
            {t(
              'organizer.welcome.benefit1Desc',
              'Create beautiful event pages with multiple ticket tiers in minutes'
            )}
          </p>
        </div>

        <div className="bg-white/[0.03] rounded-xl p-5  shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-brand-300" />
          </div>
          <h3 className="font-semibold text-white mb-1">
            {t('organizer.welcome.benefit2Title', 'Real-time Analytics')}
          </h3>
          <p className="text-sm text-white/60">
            {t(
              'organizer.welcome.benefit2Desc',
              'Track sales, attendance, and revenue with live dashboards'
            )}
          </p>
        </div>

        <div className="bg-white/[0.03] rounded-xl p-5  shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-brand-300" />
          </div>
          <h3 className="font-semibold text-white mb-1">
            {t('organizer.welcome.benefit3Title', 'Attendee Management')}
          </h3>
          <p className="text-sm text-white/60">
            {t(
              'organizer.welcome.benefit3Desc',
              'Check-in guests, send updates, and manage your audience'
            )}
          </p>
        </div>
      </div>

      {/* Help Link */}
      <div className="text-center pb-4">
        <Link
          href="/help/organizers"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-brand-300 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          {t('organizer.welcome.needHelp', 'Need help getting started? View our guide')}
        </Link>
      </div>
    </div>
  );
}

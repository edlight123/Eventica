'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Badge from './ui/Badge';

interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  imageUrl: string;
  location: string;
  category: string;
  price?: number;
  isFeatured?: boolean;
  isVIP?: boolean;
}

interface FeaturedCarouselProps {
  events: Event[];
  autoPlayInterval?: number;
}

export default function FeaturedCarousel({ 
  events, 
  autoPlayInterval = 5000 
}: FeaturedCarouselProps) {
  const { t } = useTranslation('common');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || events.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isAutoPlaying, events.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
    setIsAutoPlaying(false);
  };

  if (!events || events.length === 0) {
    return null;
  }

  const currentEvent = events[currentIndex];

  return (
    <div className="relative w-full h-[350px] sm:h-[450px] md:h-[550px] rounded-2xl sm:rounded-3xl overflow-hidden group">
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0">
        <Image
          src={currentEvent.imageUrl}
          alt={currentEvent.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority
        />
        {/* Refined gradient for better image visibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Content - Optimized positioning */}
      <div className="relative h-full flex flex-col justify-center px-4 py-6 sm:px-8 sm:py-10 md:px-12 md:py-12">
        <div className="max-w-2xl space-y-2.5 sm:space-y-3 md:space-y-4">
          {/* Streamlined Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="primary" size="md" icon={<Sparkles className="w-3 h-3" />}>
              Featured
            </Badge>
            <Badge variant="neutral" size="sm">
              {currentEvent.category}
            </Badge>
          </div>

          {/* Title - Better scaling */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            {currentEvent.title}
          </h1>

          {/* Description - Hidden on small mobile */}
          <p className="hidden sm:block text-sm md:text-base lg:text-lg text-gray-100 line-clamp-2 max-w-xl">
            {currentEvent.description}
          </p>

          {/* Event Details - Compact format */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-white/90 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-300" />
              <span className="font-medium">
                {format(new Date(currentEvent.date), 'MMM d, yyyy')}
              </span>
            </div>
            <span className="text-white/40">•</span>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-300" />
              <span className="font-medium">{currentEvent.location}</span>
            </div>
          </div>

          {/* CTA Buttons - Refined */}
          <div className="flex items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Link href={`/events/${currentEvent.id}`}>
              <button className="px-5 py-2.5 sm:px-7 sm:py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm sm:text-base font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-brand-600 hover:to-brand-700 transition-all duration-300 hover:scale-105 active:scale-95">
                {t('ticket.get_tickets')}
              </button>
            </Link>
            <Link href={`/events/${currentEvent.id}`}>
              <button className="px-5 py-2.5 sm:px-7 sm:py-3 bg-white/15 backdrop-blur-sm text-white text-sm sm:text-base font-semibold rounded-xl border border-white/30 hover:bg-white/25 transition-all duration-300">
                {t('common.details')}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {events.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all duration-300"
            aria-label="Previous event"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all duration-300"
            aria-label="Next event"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {events.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                h-2 rounded-full transition-all duration-300
                ${index === currentIndex 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/40 hover:bg-white/60'
                }
              `}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

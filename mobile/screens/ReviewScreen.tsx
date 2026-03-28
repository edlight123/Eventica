import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { backendFetch } from '../lib/api/backend';

export default function ReviewScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { ticketId, eventId, eventTitle } = route.params;
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [organizerRating, setOrganizerRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [ticketId, eventId]);

  const fetchData = async () => {
    try {
      // Fetch ticket details
      if (ticketId) {
        const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
        if (ticketDoc.exists()) {
          setTicket({ id: ticketDoc.id, ...ticketDoc.data() });
        }
      }

      // Check for existing review
      const response = await backendFetch(`/api/reviews?eventId=${eventId}`);
      const data = await response.json();
      
      if (data.reviews && user) {
        const myReview = data.reviews.find((r: any) => r.user_id === user.uid);
        if (myReview) {
          setExistingReview(myReview);
          setRating(myReview.rating);
          setOrganizerRating(myReview.organizer_rating || 0);
          setComment(myReview.comment || '');
          setWouldRecommend(myReview.would_recommend);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert(t('common.error'), t('review.selectRating') || 'Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      const response = await backendFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          ticketId,
          rating,
          comment: comment.trim() || null,
          organizerRating: organizerRating > 0 ? organizerRating : null,
          wouldRecommend,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      Alert.alert(
        t('common.success'),
        existingReview 
          ? (t('review.updated') || 'Review updated successfully!')
          : (t('review.submitted') || 'Thank you for your review!'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert(t('common.error'), error.message || t('review.submitError') || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, setRatingFn: (r: number) => void, label: string) => (
    <View style={styles.ratingSection}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRatingFn(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={36}
              color={star <= currentRating ? '#FFB800' : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingText}>
        {currentRating > 0 
          ? ['', t('review.ratings.poor') || 'Poor', t('review.ratings.fair') || 'Fair', t('review.ratings.good') || 'Good', t('review.ratings.veryGood') || 'Very Good', t('review.ratings.excellent') || 'Excellent'][currentRating]
          : (t('review.tapToRate') || 'Tap to rate')
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {existingReview ? (t('review.editTitle') || 'Edit Review') : (t('review.title') || 'Leave a Review')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Event Info */}
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{eventTitle || ticket?.event_title}</Text>
          {ticket?.event_date && (
            <Text style={styles.eventDate}>
              {format(new Date(ticket.event_date), 'MMMM dd, yyyy')}
            </Text>
          )}
        </View>

        {/* Event Rating */}
        {renderStars(rating, setRating, t('review.eventRatingLabel') || 'How was the event?')}

        {/* Organizer Rating */}
        {renderStars(organizerRating, setOrganizerRating, t('review.organizerRatingLabel') || 'How was the organizer? (optional)')}

        {/* Would Recommend */}
        <View style={styles.recommendSection}>
          <Text style={styles.ratingLabel}>{t('review.wouldRecommend') || 'Would you recommend this event?'}</Text>
          <View style={styles.recommendButtons}>
            <TouchableOpacity
              style={[
                styles.recommendButton,
                wouldRecommend === true && styles.recommendButtonSelected,
              ]}
              onPress={() => setWouldRecommend(true)}
            >
              <Ionicons
                name="thumbs-up"
                size={24}
                color={wouldRecommend === true ? '#FFF' : colors.success}
              />
              <Text style={[
                styles.recommendButtonText,
                wouldRecommend === true && styles.recommendButtonTextSelected,
              ]}>
                {t('common.yes') || 'Yes'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.recommendButton,
                wouldRecommend === false && styles.recommendButtonSelectedNo,
              ]}
              onPress={() => setWouldRecommend(false)}
            >
              <Ionicons
                name="thumbs-down"
                size={24}
                color={wouldRecommend === false ? '#FFF' : colors.error}
              />
              <Text style={[
                styles.recommendButtonText,
                wouldRecommend === false && styles.recommendButtonTextSelected,
              ]}>
                {t('common.no') || 'No'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.ratingLabel}>{t('review.commentLabel') || 'Share your experience (optional)'}</Text>
          <TextInput
            style={styles.commentInput}
            placeholder={t('review.commentPlaceholder') || 'What did you enjoy? Any suggestions?'}
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitReview}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>
                {existingReview ? (t('review.update') || 'Update Review') : (t('review.submit') || 'Submit Review')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  eventCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  eventDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  ratingSection: {
    margin: 16,
    marginTop: 8,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  recommendSection: {
    margin: 16,
    marginTop: 8,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  recommendButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  recommendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    gap: 8,
  },
  recommendButtonSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  recommendButtonSelectedNo: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  recommendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recommendButtonTextSelected: {
    color: '#FFF',
  },
  commentSection: {
    margin: 16,
    marginTop: 8,
  },
  commentInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});

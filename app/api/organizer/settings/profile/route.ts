import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { adminDb } from '@/lib/firebase/admin';
import { syncPublicProfileAdmin } from '@/lib/firestore/public-profile';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, phone_number } = body;

    // Validate inputs
    if (!full_name || full_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Update user profile in Firestore
    await adminDb.collection('users').doc(user.id).update({
      full_name: full_name.trim(),
      phone_number: phone_number?.trim() || '',
      updated_at: new Date().toISOString(),
    });

    // H4: mirror the SAFE display name into the public projection (phone stays private).
    await syncPublicProfileAdmin(user.id, { full_name: full_name.trim() });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully' 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { recalculateAndUpdateWeights } from '@/lib/ai-learning/server';

export async function POST() {
  try {
    const result = await recalculateAndUpdateWeights();

    if (result.success) {
      return NextResponse.json({
        success: true,
        version: result.version,
        weights: result.newWeights,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to recalculate weights' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', details: String(error) },
      { status: 500 }
    );
  }
}

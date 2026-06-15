import { getLatestWeightsFromDb } from '@/lib/ai-learning/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const weights = await getLatestWeightsFromDb();
    return NextResponse.json(weights);
  } catch (error) {
    console.error('Error fetching weights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weights' },
      { status: 500 }
    );
  }
}

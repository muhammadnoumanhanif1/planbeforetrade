// src/features/smart-trading-engine/signalLifecycle.ts

import { createClient } from '@/lib/supabase-client';

export enum SignalStatus {
  WAITING = 'WAITING',
  READY = 'READY',
  TRIGGERED = 'TRIGGERED',
  CLOSED = 'CLOSED',
}

export async function updateSignalStatus(signalId: string, status: SignalStatus, result_R?: number) {
  const supabase = createClient();
  
  const updateData: { status: SignalStatus; closed_at?: string; result_R?: number } = { status };

  if (status === SignalStatus.CLOSED) {
    updateData.closed_at = new Date().toISOString();
    if (result_R) {
        updateData.result_R = result_R;
    }
  }

  const { error } = await supabase
    .from('signals')
    .update(updateData)
    .eq('id', signalId);

  if (error) {
    console.error(`Error updating signal ${signalId} to ${status}:`, error);
    throw new Error(`Failed to update signal status.`);
  }

  console.log(`Signal ${signalId} updated to ${status}`);
}

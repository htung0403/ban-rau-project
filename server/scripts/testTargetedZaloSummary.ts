// Set environment variable BEFORE importing/requiring the service
process.env.ZALO_ENABLE_SENDS = 'true';

// Use require to avoid hoisting issues with import
const { zaloService } = require('../src/modules/notifications/zalo.service');
const { supabaseService } = require('../src/config/supabase');
const { logger } = require('../src/utils/logger');

const normalizePhoneForAuth = (phone: string): string | null => {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '84' + clean.slice(1);
  }
  if (!clean.startsWith('84')) {
    clean = '84' + clean;
  }
  return '+' + clean;
};

async function test() {
  const customerId = '696cce8e-0cbc-4712-990a-b32f480daf0c';
  console.log(`Starting manual Zalo summary test for customer ${customerId}`);
  
  try {
    // Manually override enableSends because the instance was already created at the top level of the module
    (zaloService as any).enableSends = true;
    
    await zaloService.sendDailySummaries(
      supabaseService, 
      logger, 
      normalizePhoneForAuth, 
      customerId
    );
    console.log('Finished manual Zalo summary test');
  } catch (err) {
    console.error('Test failed:', err);
  }
  process.exit(0);
}

test();

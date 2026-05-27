const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dzdwijfsofcsexwuyrtv.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZHdpamZzb2Zjc2V4d3V5cnR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcyODk5NSwiZXhwIjoyMDk1MzA0OTk1fQ.4rPO-E6ixO6ulr-gU504G4Riz4l04L6OlidD_axopko';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  console.log('Querying questions...');
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, student_id, status, raw_text, image_url, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching questions:', error);
  } else {
    console.log(`Found ${questions.length} questions:`);
    questions.forEach((q, i) => {
      console.log(`[${i}] ID: ${q.id}, Student: ${q.student_id}, Status: ${q.status}, Text: "${q.raw_text}"`);
    });
  }

  console.log('\nQuerying recovery_missions...');
  const { data: missions, error: mError } = await supabase
    .from('recovery_missions')
    .select('id, question_id, current_step, is_completed, steps');

  if (mError) {
    console.error('Error fetching missions:', mError);
  } else {
    console.log(`Found ${missions.length} recovery missions:`);
    missions.forEach((m, i) => {
      console.log(`[${i}] ID: ${m.id}, Question: ${m.question_id}, Step: ${m.current_step}, Completed: ${m.is_completed}`);
    });
  }
}

main();

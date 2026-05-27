const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dzdwijfsofcsexwuyrtv.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZHdpamZzb2Zjc2V4d3V5cnR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcyODk5NSwiZXhwIjoyMDk1MzA0OTk1fQ.4rPO-E6ixO6ulr-gU504G4Riz4l04L6OlidD_axopko';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const studentId = 'c4d3e724-8b5f-4509-abdf-1d3279b920dd';

async function main() {
  console.log('Querying questions...');
  const { data: questions, error } = await supabase
    .from("questions")
    .select("id, status, raw_text, recovery_missions(id, steps, is_completed)")
    .eq("student_id", studentId);

  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }

  console.log(`Found ${questions.length} questions.`);

  const conceptCounts = {};
  let completedCount = 0;

  questions.forEach((q) => {
    const missions = q.recovery_missions;
    const isCompleted = missions?.some(m => m.is_completed) || q.status === "resolved";
    if (isCompleted) completedCount++;

    // Extract concept name from steps or raw text
    let conceptName = "오답 문제";
    if (missions && missions.length > 0 && Array.isArray(missions[0].steps) && missions[0].steps.length > 0) {
      conceptName = (missions[0].steps[0].title || "")
        .replace(/^(1단계|생각 열기|설명하기|정리하기):\s*/, "");
    } else if (q.raw_text) {
      conceptName = q.raw_text.trim();
      if (conceptName.length > 15) conceptName = conceptName.slice(0, 15) + "...";
    }
    
    conceptCounts[conceptName] = (conceptCounts[conceptName] || 0) + 1;
    console.log(`Question raw_text: "${q.raw_text}" -> conceptName: "${conceptName}", missions steps count: ${missions?.[0]?.steps?.length || 0}`);
  });

  const sortedConcepts = Object.entries(conceptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  console.log('sortedConcepts:', sortedConcepts);

  const topConcept = sortedConcepts[0]?.[0] || "오답";
  const isFractions = topConcept.includes("분수") || topConcept.includes("피자");
  const isGeometry = topConcept.includes("삼각형") || topConcept.includes("각") || topConcept.includes("도형");

  console.log('isFractions:', isFractions);
  console.log('isGeometry:', isGeometry);
  console.log('topConcept:', topConcept);
}

main();

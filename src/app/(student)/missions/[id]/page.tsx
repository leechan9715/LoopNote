import { notFound } from "next/navigation";

import { MissionLearningClient } from "@/components/mission/MissionLearningClient";
import { getMissionDetail } from "@/services/data";
import { createServerSupabaseClient } from "@/services/supabase";

interface MissionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MissionDetailPage({ params }: MissionDetailPageProps) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const mission = await getMissionDetail(supabase, id);

  if (!mission || mission.hints.length === 0) {
    notFound();
  }

  return <MissionLearningClient mission={mission} />;
}

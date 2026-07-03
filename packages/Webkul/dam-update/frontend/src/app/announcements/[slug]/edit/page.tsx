"use client";

import { useParams } from "next/navigation";

import { AnnouncementForm } from "@/components/announcement/announcement-form";

export default function EditAnnouncementPage() {
  const params = useParams<{ slug: string }>();
  return <AnnouncementForm slug={params.slug} />;
}

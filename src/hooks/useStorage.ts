"use client";

import { useCallback, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/services/supabase";

const DEFAULT_QUESTION_BUCKET = "questions";

export interface UploadImageInput {
  file: Blob;
  studentId: string;
  bucket?: string;
}

export interface UploadedImage {
  bucket: string;
  path: string;
  publicUrl: string;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function createQuestionImagePath(studentId: string): string {
  const safeStudentId = sanitizePathSegment(studentId);
  const timestamp = Date.now();
  const randomSuffix = crypto.randomUUID();

  return `${safeStudentId}/${timestamp}-${randomSuffix}.jpg`;
}

function getStorageErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "이미지를 업로드하지 못했어요. 네트워크와 버킷 권한을 확인해 주세요.";
}

export function useStorage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(
    async ({
      bucket = DEFAULT_QUESTION_BUCKET,
      file,
      studentId,
    }: UploadImageInput): Promise<UploadedImage> => {
      setIsUploading(true);
      setError(null);

      try {
        if (!studentId) {
          throw new Error("로그인한 학생 정보가 필요해요.");
        }

        const path = createQuestionImagePath(studentId);
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(path);

        if (!publicUrl) {
          throw new Error("업로드된 이미지 URL을 만들지 못했어요.");
        }

        return {
          bucket,
          path,
          publicUrl,
        };
      } catch (uploadError) {
        const message = getStorageErrorMessage(uploadError);
        setError(message);
        throw new Error(message);
      } finally {
        setIsUploading(false);
      }
    },
    [supabase]
  );

  return {
    error,
    isUploading,
    uploadImage,
  };
}

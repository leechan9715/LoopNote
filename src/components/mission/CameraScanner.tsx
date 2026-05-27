"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Typography } from "@/components/common";

type CameraFacingMode = "environment" | "user";
type CameraStatus = "requesting" | "streaming" | "captured" | "error";

export interface CapturedCameraImage {
  blob: Blob;
  dataUrl: string;
}

export interface CameraScannerProps {
  isUploading?: boolean;
  onCapture?: (image: CapturedCameraImage) => void;
  onClose?: () => void;
}

function getCameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "카메라를 여는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  }

  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "카메라 권한이 필요해요. 브라우저 설정에서 카메라 사용을 허용해 주세요.";
  }

  if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
    return "사용할 수 있는 카메라를 찾지 못했어요. 다른 기기에서 다시 시도해 주세요.";
  }

  if (error.name === "NotReadableError") {
    return "다른 앱이 카메라를 사용 중일 수 있어요. 카메라를 닫고 다시 시도해 주세요.";
  }

  return "카메라를 시작하지 못했어요. 권한과 브라우저 설정을 확인해 주세요.";
}

export function CameraScanner({
  isUploading = false,
  onCapture,
  onClose,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("environment");
  const [status, setStatus] = useState<CameraStatus>("requesting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCapturedImage(null);
    setErrorMessage(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("이 브라우저에서는 카메라 촬영을 지원하지 않아요.");
      return;
    }

    setStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          height: { ideal: 1080 },
          width: { ideal: 1440 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("streaming");
    } catch (error) {
      stopCamera();
      setStatus("error");
      setErrorMessage(getCameraErrorMessage(error));
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void startCamera();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleSwitchCamera = useCallback(() => {
    setCapturedImage(null);
    setErrorMessage(null);
    setStatus("requesting");
    setFacingMode((currentFacingMode) =>
      currentFacingMode === "environment" ? "user" : "environment"
    );
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setStatus("error");
      setErrorMessage("카메라 화면이 아직 준비되지 않았어요. 잠시 후 다시 눌러주세요.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setStatus("error");
      setErrorMessage("사진을 저장할 수 없어요. 브라우저를 새로고침한 뒤 다시 시도해 주세요.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setStatus("error");
          setErrorMessage("사진 파일을 만들지 못했어요. 다시 촬영해 주세요.");
          return;
        }

        setCapturedImage(dataUrl);
        setStatus("captured");
        stopCamera();
        onCapture?.({ blob, dataUrl });
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture, stopCamera]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setStatus("error");
        setErrorMessage("이미지 파일만 올릴 수 있어요.");
        event.target.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        if (typeof e.target?.result !== "string") {
          setStatus("error");
          setErrorMessage("사진 파일을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.");
          return;
        }

        const dataUrl = e.target.result;
        setCapturedImage(dataUrl);
        setStatus("captured");
        setErrorMessage(null);
        stopCamera();
        onCapture?.({ blob: file, dataUrl });
      };

      reader.onerror = () => {
        setStatus("error");
        setErrorMessage("사진 파일을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.");
      };

      reader.readAsDataURL(file);
      event.target.value = "";
    },
    [onCapture, stopCamera]
  );

  return (
    <section className="flex max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography as="h2" variant="h2" className="text-slate-950">
            오답 스캔
          </Typography>
          <Typography as="p" variant="body" className="mt-1 text-slate-700">
            문제를 찍거나 사진을 올려주세요!
          </Typography>
        </div>
        {onClose ? (
          <button
            aria-label="카메라 닫기"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xl font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border-4 border-sky-200 bg-slate-950">
        {capturedImage ? (
          <div
            aria-label="촬영된 문제 미리보기"
            className="h-full w-full bg-cover bg-center"
            role="img"
            style={{ backgroundImage: `url(${capturedImage})` }}
          />
        ) : (
          <video
            ref={videoRef}
            aria-label="카메라 미리보기"
            autoPlay
            className="h-full w-full object-cover"
            muted
            playsInline
          />
        )}

        {status === "requesting" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 px-6 text-center">
            <Typography as="p" variant="body" className="text-white">
              카메라를 준비하고 있어요.
            </Typography>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-6 text-center">
            <Typography as="p" variant="body" className="text-white">
              {errorMessage}
            </Typography>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {status === "captured" ? (
          <>
            <Button
              disabled={isUploading}
              onClick={() => void startCamera()}
              variant="secondary"
            >
              다시 찍기
            </Button>
            <Button disabled={true} variant="outline">
              업로드 완료
            </Button>
          </>
        ) : (
          <>
            <Button
              disabled={status === "requesting" || isUploading}
              onClick={handleSwitchCamera}
              variant="outline"
            >
              카메라 전환
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <div className="flex h-full min-h-12 items-center justify-center rounded-full border-2 border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50">
                파일 올리기
              </div>
            </label>
          </>
        )}
      </div>

      {status !== "captured" && (
        <Button
          disabled={status !== "streaming" || isUploading}
          isLoading={isUploading}
          onClick={handleCapture}
          variant="primary"
          fullWidth
        >
          {isUploading ? "저장 중" : "촬영하기"}
        </Button>
      )}

      {status === "captured" ? (
        <Typography as="p" variant="caption" className="text-center font-extrabold text-emerald-700">
          사진이 준비됐어요. 다음 단계에서 문제를 읽어올 수 있어요.
        </Typography>
      ) : null}

      {status === "error" ? (
        <Button fullWidth onClick={() => void startCamera()} variant="secondary">
          다시 시도하기
        </Button>
      ) : null}
    </section>
  );
}

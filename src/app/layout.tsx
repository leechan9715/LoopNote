import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "루프노트 (LoopNote) - 우리 아이 맞춤형 오답 회복 튜터",
  description: "초등학생의 학습 회복을 돕는 오답 노트와 맞춤형 힌트 미션 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}


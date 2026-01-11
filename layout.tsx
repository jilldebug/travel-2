import type { Metadata, Viewport } from "next";
import "./globals.css"; // 確保這行保留，否則 CSS 會失效

// 1. 設定 App 的身份證 (Metadata)
export const metadata: Metadata = {
  title: "我的旅行 App",
  description: "2026 行程規劃與記帳",
  manifest: "/manifest.json", // 連結你放在 public 的檔案
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "旅行規劃",
  },
};

// 2. 設定手機螢幕縮放限制 (Viewport)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        {/* 針對 iPhone 的額外優化 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DUDI Control Center — Quản lý Tài khoản, Nhóm FB & Nội dung AI",
  description: "Hệ thống quản trị tập trung tài khoản ChatGPT, Facebook Fanpage, Groups và kho nội dung tự động",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="light">
      <body className="antialiased min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

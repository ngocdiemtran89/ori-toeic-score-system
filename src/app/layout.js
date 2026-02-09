// src/app/layout.js
import "./globals.css";

export const metadata = {
  title: "ORI TOEIC Score System",
  description: "Hệ thống báo điểm TOEIC tự động - ORI Education",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

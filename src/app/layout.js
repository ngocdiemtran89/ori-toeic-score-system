// src/app/layout.js
import "./globals.css";

export const metadata = {
  title: "ORI TOEIC Score System",
  description: "Hệ thống báo điểm TOEIC tự động - ORI Education",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Great+Vibes&family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}

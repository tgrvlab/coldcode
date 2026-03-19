import "./globals.css";
import 'sheryjs/dist/Shery.css';
import { Analytics } from "@vercel/analytics/next"


export const metadata = {
  title: "Cold Code | Premium Developer Snippets",
  description: "Share your code, inspire others. Cold Code is the most aesthetic way to share snippets.",
};

import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased selection:bg-(--accent) selection:text-white">
        {children}
        <Toaster position="bottom-right" reverseOrder={false} />
      </body>
    </html>
  );
}

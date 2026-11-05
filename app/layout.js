import './globals.css';

export const metadata = {
  title: 'Kaspi портал',
  description: 'Поиск ниш и расчёт прибыли для магазина на Kaspi',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

/** HTML kontekstiga qo'yiladigan foydalanuvchi matnini xavfsizlashtiradi */
export const escapeHtml = (value: any): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** alert + redirect qiluvchi xavfsiz inline script hosil qiladi */
export const alertScript = (message: string, redirectUrl: string): string => {
  const safeMessage = JSON.stringify(String(message)).replace(/</g, "\\u003c");
  const safeUrl = JSON.stringify(String(redirectUrl)).replace(/</g, "\\u003c");
  return `<script>alert(${safeMessage}); window.location.replace(${safeUrl});</script>`;
};

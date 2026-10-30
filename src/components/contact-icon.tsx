export type ContactIconKind = "location" | "phone" | "email" | "clock" | "message" | "calendar" | "close" | "arrow";

export function ContactIcon({ kind }: { kind: ContactIconKind }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind === "location" && <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>}
    {kind === "phone" && <path d="m8 3 2 5-3 2a15 15 0 0 0 7 7l2-3 5 2v4a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h4Z"/>}
    {kind === "email" && <><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/></>}
    {kind === "clock" && <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>}
    {kind === "message" && <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-1L3 21l1.7-5a8.5 8.5 0 1 1 16.3-4.5Z"/><path d="M8 11.5h.01m4-.01h.01m4-.01h.01" strokeWidth="2.5"/></>}
    {kind === "calendar" && <><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h3m2 0h3m-8 3h3"/></>}
    {kind === "close" && <path d="m6 6 12 12M6 18 18 6"/>}
    {kind === "arrow" && <path d="m9 5 7 7-7 7"/>}
  </svg>;
}

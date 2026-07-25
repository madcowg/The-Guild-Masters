import React from "react";

export function Logo() {
    return (
      <svg
        className="logo"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="The Guild Masters"
      >
        <circle cx="24" cy="24" r="21" />
        <circle cx="24" cy="24" r="17.5" strokeWidth="1" />
        <circle
          cx="24"
          cy="24"
          r="19.4"
          strokeWidth="1.4"
          strokeDasharray="1.6 4.4"
        />
        <path d="M14 33 v-9 l4 -3.2 v-3.8 h3 v1.6 l3 -2.6 3 2.6 v-1.6 h3 v3.8 l4 3.2 v9 z" />
        <path d="M21.5 33 v-5 a2.5 2.5 0 0 1 5 0 v5" />
        <path d="M24 16.4 v-5.4 l5 1.7 -5 1.7" />
      </svg>
    );
  }
export function StatIcon({ s }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {
          {
            STR: (
              <React.Fragment>
                <rect x="4.6" y="2.8" width="6.2" height="6.2" rx="2.1" />
                <path d="M4.6 6.4 H9.4" />
                <path d="M4.6 9 V16.3 C4.6 18.5 6.2 20 8.5 20 H21.2 V14.8 C21.2 10.6 18.7 7.9 15.6 7.9 C13.3 7.9 11.5 9.3 10.8 11.4 V9" />
              </React.Fragment>
            ),
            DEX: (
              <React.Fragment>
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                <path d="M16 8 2 22" />
                <path d="M17.5 15H9" />
              </React.Fragment>
            ),
            CON: (
              <React.Fragment>
                <path d="M12 20 C6.5 15.5 4 12.5 4 9.5 a4 4 0 0 1 8 -1.5 a4 4 0 0 1 8 1.5 c0 3 -2.5 6 -8 10.5 z" />
              </React.Fragment>
            ),
            INT: (
              <React.Fragment>
                <path d="M12 6 C10 4 6 4 4 5 v13 c2 -1 6 -1 8 1 c2 -2 6 -2 8 -1 V5 c-2 -1 -6 -1 -8 1 z" />
                <path d="M12 6 v13" />
              </React.Fragment>
            ),
            WIS: (
              <React.Fragment>
                <path d="M2.5 12 C5 7.5 8.5 5.5 12 5.5 s7 2 9.5 6.5 C19 16.5 15.5 18.5 12 18.5 s-7 -2 -9.5 -6.5 z" />
                <circle cx="12" cy="12" r="2.6" />
              </React.Fragment>
            ),
            CHA: (
              <React.Fragment>
                <path d="M4 5 q8 4.5 16 0 v7 a8 8 0 0 1 -16 0 z" />
                <path d="M8.5 11.5 h1.5 M14 11.5 h1.5 M9.5 15 q2.5 1.8 5 0" />
              </React.Fragment>
            ),
          }[s]
        }
      </svg>
    );
  }
export function BellIcon() {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 10.5 a6 6 0 0 1 12 0 c0 4 1.4 5.6 2.2 6.5 H3.8 C4.6 16.1 6 14.5 6 10.5 z" />
        <path d="M10.2 19.8 a2.1 2.1 0 0 0 3.6 0" />
      </svg>
    );
  }
export function NavIcon({ k }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {
          {
            boards: (
              <React.Fragment>
                <rect x="5" y="4" width="14" height="16" rx="1.5" />
                <path d="M9 8 h6 M9 12 h6 M9 16 h4" />
              </React.Fragment>
            ),
            quests: (
              <React.Fragment>
                <path d="M6 4 h12 v14 a2 2 0 0 1 -2 2 H8 a2 2 0 0 1 -2 -2 z" />
                <path d="M9 9 h6 M9 13 h6" />
              </React.Fragment>
            ),
            party: (
              <React.Fragment>
                <circle cx="9" cy="8" r="3" />
                <circle cx="16" cy="9.5" r="2.4" />
                <path d="M4 19 c0 -3 2.5 -5 5 -5 s5 2 5 5 M14.5 14.8 c2.8 0 4.5 1.8 4.5 4.2" />
              </React.Fragment>
            ),
            sheet: (
              <React.Fragment>
                <path d="M12 3 l7 3 v5 c0 5 -3 8 -7 10 c-4 -2 -7 -5 -7 -10 V6 z" />
              </React.Fragment>
            ),
            tavern: (
              <React.Fragment>
                <rect x="6" y="6" width="9" height="13" rx="1.5" />
                <path d="M15 9 h2.5 a2.5 2.5 0 0 1 0 7 H15 M6 6 c1.5 -1.8 7.5 -1.8 9 0" />
              </React.Fragment>
            ),
            hall: (
              <React.Fragment>
                <path d="M4 20 h16 M5 17 h14 M12 4 L4 9 h16 z M7 9 v8 M12 9 v8 M17 9 v8" />
              </React.Fragment>
            ),
          }[k]
        }
      </svg>
    );
  }

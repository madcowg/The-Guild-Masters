import React from "react";
import { RANKS, RANK_COLORS, CARD_NUMERALS } from "../constants.js";
import { StatIcon } from "../icons.jsx";
export function QuestCard({
    q: quest,
    i: index,
    locked,
    saved,
    onOpen,
  }) {
    let rankColor = RANK_COLORS[quest.rank];
    return (
      <button
        className={"tarot " + (locked ? "locked" : "")}
        onClick={onOpen}
        style={{
          "--rc": rankColor,
        }}
      >
        <div className={"tarot-inner" + (quest.barter ? " barter" : "")}>
          <div className="tarot-top">
            <span>{CARD_NUMERALS[index % CARD_NUMERALS.length]}</span>
            <span
              className="tarot-rank"
              style={{
                color: rankColor,
              }}
            >
              {quest.rank}
            </span>
          </div>
          <div className="tarot-art">
            {Object.keys(quest.stats).map((u) => (
              <span key={u} className="tarot-stat">
                <StatIcon s={u} />
                <em>{u}</em>
              </span>
            ))}
          </div>
          <div className="tarot-title">{quest.title}</div>
          <div className="tarot-type">
            {quest.type}
            {quest.barter ? " \xB7 Barter" : ""}
          </div>
          <div className="tarot-reward">
            {quest.barter ? "In Trade" : `${quest.scrip} Scrip`}
          </div>
          {saved && <div className="tarot-saved">Saved</div>}
          {quest.mine && <div className="tarot-mine">Your posting</div>}
        </div>
        {locked && <RopeBindings rank={quest.rank} color={rankColor} />}
      </button>
    );
  }

  function RopeBindings({ rank, color }) {
    let rankIdx = RANKS.indexOf(rank),
      wraps = rankIdx <= 2 ? 1 : rankIdx <= 4 ? 2 : 3,
      Wrap = ({ d: f, w: o = 1 }) => (
        <React.Fragment>
          <path
            d={f}
            stroke="#140E17"
            strokeWidth={8.5 * o}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={f}
            stroke={color}
            strokeWidth={5.5 * o}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={f}
            stroke="#140E17"
            strokeWidth={5.5 * o}
            fill="none"
            strokeLinecap="round"
            strokeDasharray="2.4 4.2"
            opacity=".35"
          />
        </React.Fragment>
      ),
      Boss = ({ cx: f, cy: o }) => (
        <React.Fragment>
          <circle
            cx={f}
            cy={o}
            r="6"
            stroke="#140E17"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={f}
            cy={o}
            r="6"
            stroke={color}
            strokeWidth="5"
            fill="none"
          />
          <Wrap w={0.8} d={`M${f - 3} ${o + 5} q-4 12 -10 16`} />
          <Wrap w={0.8} d={`M${f + 4} ${o + 4} q3 12 8 17`} />
        </React.Fragment>
      ),
      Fray = ({ x: f, y: o }) => (
        <path
          d={`M${f} ${o} l-3 4 M${f} ${o} l0 5 M${f} ${o} l3 4`}
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity=".95"
        />
      );
    return (
      <div
        className="tarot-chains"
        aria-label={`Bound \u2014 Rank ${rank} required`}
      >
        <svg
          viewBox="0 0 100 160"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <Wrap d="M-2 90 Q50 95 102 90" />
          {wraps >= 2 && <Wrap d="M-2 48 Q50 53 102 48" />}
          {wraps >= 2 && <Wrap d="M40 -2 Q37 80 41 162" />}
          {wraps >= 3 && <Wrap d="M62 -2 Q65 80 61 162" />}
          {wraps === 1 && (
            <React.Fragment>
              <Boss cx={50} cy={92} />
              <Fray x={37} y={113} />
              <Fray x={62} y={113} />
            </React.Fragment>
          )}
          {wraps === 2 && (
            <React.Fragment>
              <Boss cx={39} cy={92} />
              <Fray x={26} y={113} />
              <Fray x={51} y={113} />
            </React.Fragment>
          )}
          {wraps === 3 && (
            <React.Fragment>
              <circle
                cx="51"
                cy="70"
                r="10.5"
                stroke="#140E17"
                strokeWidth="7.5"
                fill="none"
              />
              <circle
                cx="51"
                cy="70"
                r="10.5"
                stroke={color}
                strokeWidth="4.5"
                fill="none"
              />
              <circle
                cx="51"
                cy="70"
                r="4"
                stroke="#140E17"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="51"
                cy="70"
                r="4"
                stroke={color}
                strokeWidth="3.5"
                fill="none"
              />
              <Wrap w={0.8} d="M45 79 q-5 13 -11 17" />
              <Wrap w={0.8} d="M57 79 q5 13 11 17" />
              <Fray x={34} y={96} />
              <Fray x={68} y={96} />
            </React.Fragment>
          )}
        </svg>
      </div>
    );
  }


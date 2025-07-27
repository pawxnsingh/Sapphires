import React, { useEffect, useId, useRef, useState } from "react";

export default function HeaderWithSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);
  const open = () => setSidebarOpen(true);
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  useEffect(() => {
    if (sidebarOpen) window.addEventListener("keydown", escHandler as any);
    return () => window.removeEventListener("keydown", escHandler as any);
  }, [sidebarOpen]);

  // Unique ids so multiple instances won't collide
  const flowerA = `${useId()}-flower-a`;
  const flowerB = `${useId()}-flower-b`;
  const flowerA2 = `${useId()}-flower-a2`;
  const flowerB2 = `${useId()}-flower-b2`;
  const plusA = `${useId()}-plus-a`;
  const plusB = `${useId()}-plus-b`;

  return (
    <div>
      {/* Local CSS variables to match gradients if your theme doesn't define them */}
      <style>{`
        :root {
          --color-flower-start: #7b5cff;
          --color-flower-end: #20e3b2;
          --morph-icon-start: #7b5cff;
          --morph-icon-end: #20e3b2;
        }
      `}</style>

      {/* Hidden defs once per component: noise symbol for <use xlinkHref="#svg-noise"/> references */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          {/* A tileable procedural noise symbol */}
          <symbol id="svg-noise" viewBox="0 0 100 100">
            <filter id="noiseFilter">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="2"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              filter="url(#noiseFilter)"
            />
          </symbol>
        </defs>
      </svg>

      <div className="py-3 max-w-[99%] mx-auto w-full flex justify-between">
        <div className="flex items-center justify-between">
          {/* Left cluster: toggle + animated brand + sidebar */}
          <div className="flex items-center gap-1">
            {/* Toggle */}
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-neutral-800/60 transition-all duration-300 rounded-md"
              data-state={sidebarOpen ? "open" : "closed"}
              data-slot="tooltip-trigger"
              onClick={open}
              aria-label="Open sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 288 282"
                width=""
                height=""
              >
                <polygon
                  points="155,102 224,194 151,252 90,194"
                  fill="#ffffff"
                />
              </svg>
            </button>

            {/* Sidebar Panel */}
            <div
              className={
                "fixed top-0 left-0 h-screen w-72 overflow-y-auto backdrop-blur-[5px] bg-[#0b0b0c]/90 transform transition-transform duration-300 ease-in-out border-r border-neutral-800 shadow-sm shadow-black/20 z-50 " +
                (sidebarOpen ? "translate-x-0" : "-translate-x-full")
              }
              role="dialog"
              aria-modal="true"
            >
              <div className="flex flex-col px-3.5 pt-4">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <a className="flex items-center gap-2" href="/">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 288 282"
                      width="40"
                      height="50"
                    >
                      <polygon
                        points="155,102 224,194 151,252 90,194"
                        fill="#ffffff"
                      />
                    </svg>

                    <span className="text-xl font-medium">my sites</span>
                  </a>
                  <button
                    className="w-8 h-8 flex items-center justify-center text-neutral-400 rounded-md hover:bg-neutral-800/60 transition-all duration-150"
                    aria-label="Close sidebar"
                    onClick={close}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-arrow-left"
                      aria-hidden
                    >
                      <path d="m12 19-7-7 7-7" />
                      <path d="M19 12H5" />
                    </svg>
                  </button>
                </div>

                {/* New project */}
                <button className="w-full flex items-center text-center text-sm justify-center bg-neutral-800/50 px-2 py-1.5 rounded-md cursor-pointer hover:bg-neutral-700/50 transition-all duration-150 my-4 gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 99 99"
                    aria-hidden
                    width={14}
                    height={14}
                  >
                    <path
                      fill={`url(#${plusA})`}
                      d="M98.59 49.09 49.91.41a.579.579 0 0 0-.82 0L.41 49.09a.579.579 0 0 0 0 .82l48.68 48.68a.579.579 0 0 0 .82 0l48.68-48.68a.579.579 0 0 0 0-.82Z"
                    />
                    <path
                      fill={`url(#${plusB})`}
                      fillOpacity="0.6"
                      d="M98.59 49.09 49.91.41a.579.579 0 0 0-.82 0L.41 49.09a.579.579 0 0 0 0 .82l48.68 48.68a.579.579 0 0 0 .82 0l48.68-48.68a.579.579 0 0 0 0-.82Z"
                      style={{ mixBlendMode: "multiply" }}
                    />
                    <defs>
                      <linearGradient
                        id={plusA}
                        x1="60.816"
                        x2="38.263"
                        y1="20.902"
                        y2="87.976"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset=".199" stopColor="#F7BDF8" />
                        <stop offset="1" stopColor="#2F3CC0" />
                      </linearGradient>
                      <pattern
                        id={plusB}
                        width="2.857"
                        height="2.857"
                        patternContentUnits="objectBoundingBox"
                      >
                        <use xlinkHref="#svg-noise" transform="scale(.00571)" />
                      </pattern>
                    </defs>
                  </svg>
                  New project
                </button>

                {/* Recents */}
                <div className="flex flex-col">
                  <div className="text-sm text-neutral-400 mb-2 italic">
                    Recents
                  </div>
                  <div className="flex flex-col max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar gap-1.5">
                    {[
                      {
                        id: "ed867b19-8701-490d-97a6-201cc38ebdf6",
                        label: "Figma Website Clone",
                        active: false,
                      },
                      {
                        id: "eb9f0765-2e53-40e9-97d6-f179636255cf",
                        label: "Lovable Dev Clone",
                        active: false,
                      },
                      {
                        id: "7a9b2e12-7f6b-47ff-a78f-dffdbec42811",
                        label: "Cursor.com Clone",
                        active: true,
                      },
                      {
                        id: "bc0b55ef-39dc-405b-aaf8-fd341467a74b",
                        label: "Vercel Website Clone",
                        active: false,
                      },
                      {
                        id: "ecacb794-bfcc-4ea1-b9fe-66d511daac1d",
                        label: "Orchid Website Clone",
                        active: false,
                      },
                      {
                        id: "0bf91f5a-2418-472f-bcc4-236b5bd1299d",
                        label: "Cluely Website Clone",
                        active: false,
                      },
                    ].map((p) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between py-2 text-sm rounded-md transition-all duration-150 text-left group ${p.active ? "bg-neutral-800/60 px-2" : "hover:bg-neutral-800/40 hover:px-2"}`}
                      >
                        <a
                          className="flex items-center gap-2 flex-grow"
                          aria-label={`Open project ${p.label}`}
                          href={`/projects/${p.id}`}
                        >
                          {/* Keep text exactly; the original had icon blobs left which were decorative */}
                          <span className="truncate text-neutral-400 group-hover:text-neutral-100 transition-all duration-150">
                            {p.label}
                          </span>
                        </a>
                        <button
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-neutral-800/60 transition-opacity"
                          aria-label="More options"
                          type="button"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-ellipsis"
                            aria-hidden
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="19" cy="12" r="1" />
                            <circle cx="5" cy="12" r="1" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="py-12" />
                </div>
              </div>
            </div>

            {/* Click-away overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={close}
                aria-hidden
              />
            )}
          </div>

          {/* Middle chevron + title button cluster stays as in your snippet */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-chevron-right text-neutral-400"
            aria-hidden
          >
            <path d="m9 18 6-6-6-6" />
          </svg>

          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded="false"
            data-state="closed"
            data-slot="popover-trigger"
            className="flex items-center gap-1 px-1 py-0.5 rounded-md hover:bg-neutral-800/60 transition-all duration-300 cursor-pointer group"
          >
            <div className="text-sm font-medium">
              <span className="whitespace-pre-wrap">
                {"Cursor.com Clone\n"}
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-chevron-down text-neutral-400 w-0 h-0 group-data-[state=open]:w-3.5 group-data-[state=open]:h-3.5 group-hover:w-3.5 group-hover:h-3.5 transition-all duration-300"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {/* Right action cluster with charcoal styles */}
        <div className="flex items-center gap-2">
          <div
            className="relative p-1.5 rounded-md transition-all duration-150 bg-[#0b0b0c] text-neutral-100 border border-neutral-800 hover:bg-neutral-800/60 cursor-pointer"
            aria-label="Remix this chat into a new session"
            data-state="closed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-git-branch-plus"
              aria-hidden
            >
              <path d="M6 3v12" />
              <path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              <path d="M15 6a9 9 0 0 0-9 9" />
              <path d="M18 15v6" />
              <path d="M21 18h-6" />
            </svg>
          </div>

          <button className="flex items-center gap-2 rounded-md text-sm px-2 py-1 border border-neutral-800 hover:bg-neutral-800/60 transition-colors duration-300">
            {/* Decorative plane svg preserved (gradients + patterns still work due to #svg-noise) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 309 152"
              aria-hidden
              className="text-neutral-400"
              width={25}
              height={26}
            >
              <g
                data-svg-origin="298.6579895019531 129.64499282836914"
                transform="matrix(0.99999,-0.00522,0.00522,0.99999,-0.67376,1.56029)"
                style={{
                  translate: "none",
                  rotate: "none",
                  scale: "none",
                  transformOrigin: "0px 0px",
                }}
              >
                <path
                  fill="#F5A9FF"
                  d="m82.78 35.086 215.877 94.559L79 92l3.78-56.914Z"
                />
                <path
                  fill="url(#paint0_linear_2272_56525)"
                  d="m82.78 35.086 215.877 94.559L79 92l3.78-56.914Z"
                />
                <path
                  fill="url(#pattern-scroll-smooth-plane-0)"
                  fillOpacity=".34"
                  d="m82.78 35.086 215.877 94.559L79 92l3.78-56.914Z"
                />
                <path
                  fill="url(#paint1_linear_2272_56525)"
                  d="m82.781 35.085 52.044-23.564 163.833 118.123-215.877-94.56Z"
                />
                <path
                  fill="url(#pattern-scroll-smooth-plane-1)"
                  fillOpacity=".6"
                  d="m82.781 35.085 52.044-23.564 163.833 118.123-215.877-94.56Z"
                  style={{ mixBlendMode: "multiply" }}
                />
              </g>
              <g
                data-svg-origin="298.77699303627014 130.95899963378906"
                transform="matrix(0.99999,0.00522,-0.00522,0.99999,0.68659,-1.55831)"
                style={{
                  translate: "none",
                  rotate: "none",
                  scale: "none",
                  transformOrigin: "0px 0px",
                }}
              >
                <path
                  fill="url(#paint2_linear_2272_56525)"
                  d="M76.828 107.147 291.17 126.73l-216.516 4.229 2.175-23.812Z"
                />
                <path
                  fill="#000"
                  fillOpacity=".2"
                  d="M76.828 107.147 291.17 126.73l-216.516 4.229 2.175-23.812Z"
                />
                <path
                  fill="url(#paint3_linear_2272_56525)"
                  d="M76.828 107.147 291.17 126.73l-216.516 4.229 2.175-23.812Z"
                />
                <path
                  fill="url(#pattern-scroll-smooth-plane-2)"
                  fillOpacity=".34"
                  d="M76.828 107.147 291.17 126.73l-216.516 4.229 2.175-23.812Z"
                />
                <path
                  fill="url(#paint4_linear_2272_56525)"
                  d="M298.777 130.425 1.903 103.302l53.998-44.957 242.876 72.08Z"
                />
                <path
                  fill="url(#pattern-scroll-smooth-plane-3)"
                  fillOpacity=".6"
                  d="M298.777 130.425 1.903 103.302l53.998-44.957 242.876 72.08Z"
                  style={{ mixBlendMode: "multiply" }}
                />
              </g>
              <defs>
                <linearGradient
                  id="paint0_linear_2272_56525"
                  x1="154.593"
                  x2="160.643"
                  y1="48.892"
                  y2="131.658"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset=".199" stopColor="#6F4D70" />
                  <stop offset="1" stopColor="#12195A" />
                </linearGradient>
                <linearGradient
                  id="paint1_linear_2272_56525"
                  x1="66.623"
                  x2="112.939"
                  y1="2.042"
                  y2="199.069"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset=".27" stopColor="#FEC5FB" />
                  <stop offset=".838" stopColor="#00BAE2" />
                </linearGradient>
                <linearGradient
                  id="paint2_linear_2272_56525"
                  x1="112.454"
                  x2="109.954"
                  y1="132.998"
                  y2="94.498"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#2F3CC0" />
                  <stop offset=".706" stopColor="#FFD6EC" />
                </linearGradient>
                <linearGradient
                  id="paint3_linear_2272_56525"
                  x1="246.499"
                  x2="260.599"
                  y1="203"
                  y2="92.441"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset=".199" stopColor="#6F4D70" />
                  <stop offset=".845" stopColor="#12195A" />
                </linearGradient>
                <linearGradient
                  id="paint4_linear_2272_56525"
                  x1="-18.792"
                  x2="-15.789"
                  y1="49.95"
                  y2="152.351"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset=".27" stopColor="#FEC5FB" />
                  <stop offset=".838" stopColor="#00BAE2" />
                </linearGradient>
                <pattern
                  id="pattern-scroll-smooth-plane-0"
                  width="1"
                  height="1"
                  patternContentUnits="objectBoundingBox"
                >
                  <use
                    xlinkHref="#svg-noise"
                    transform="matrix(.00075 0 0 .00225 0 -1)"
                  />
                </pattern>
                <pattern
                  id="pattern-scroll-smooth-plane-1"
                  width=".895"
                  height="1.947"
                  patternContentUnits="objectBoundingBox"
                >
                  <use xlinkHref="#svg-noise" transform="scale(.00179 .0039)" />
                </pattern>
                <pattern
                  id="pattern-scroll-smooth-plane-2"
                  width="1"
                  height="1"
                  patternContentUnits="objectBoundingBox"
                >
                  <use
                    xlinkHref="#svg-noise"
                    transform="matrix(.00075 0 0 .00676 0 -4)"
                  />
                </pattern>
                <pattern
                  id="pattern-scroll-smooth-plane-3"
                  width=".671"
                  height="4.025"
                  patternContentUnits="objectBoundingBox"
                >
                  <use
                    xlinkHref="#svg-noise"
                    transform="scale(.00134 .00805)"
                  />
                </pattern>
              </defs>
            </svg>
            Upgrade Plan
          </button>

          <div
            data-testid="main-publish-btn"
            className="flex items-center gap-2 px-2 py-1 rounded-md border border-neutral-800 text-sm cursor-pointer hover:bg-neutral-800/60 transition-all duration-200"
          >
            <div className="w-5">
              <MotionPathIcon />
            </div>
            <span>Publish Site</span>
          </div>

          <button className="flex items-center gap-1.5 text-sm hover:text-white transition-all duration-300 cursor-pointer px-2 py-1.5 rounded-md hover:bg-neutral-800/60">
            <svg
              id="svg-stage"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 100 100"
              fill="none"
              className="overflow-visible"
              style={{ width: 14, height: 14 }}
            >
              <defs>
                <linearGradient
                  id="grad"
                  x1="0"
                  y1="0"
                  x2="99"
                  y2="99"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0.2" stopColor="var(--morph-icon-start)" />
                  <stop offset="0.7" stopColor="var(--morph-icon-end)" />
                </linearGradient>
              </defs>
              <path
                id="shape1"
                fill="url(#grad)"
                d="M50,1l49,49L50,99L1,50L50,1z"
              />
            </svg>
            <span>Open Editor</span>
          </button>

          <button className="rounded-md p-1 flex items-center justify-center gap-2 text-sm hover:bg-neutral-800/60 transition-all duration-200 cursor-pointer">
            <img
              alt="user-avatar"
              width="20"
              height="20"
              className="rounded-full w-5.5 h-5.5"
              src="https://yt3.ggpht.com/yti/ANjgQV-wG1z_fA8ASLi1_aDKd97XlYISQbDJkVcbW_OCJE2PYNA=s88-c-k-c0x00ffffff-no-rj"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MotionPathIcon() {
  return (
    <svg viewBox="0 0 140 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient
          id="svg-plugin-motionpath-a"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="rotate(-39.251 54.456 40.755) scale(98.1428 105.786)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".161" stopColor="#DBC3E7" />
          <stop offset=".688" stopColor="#695EF5" />
          <stop offset=".917" stopColor="#3829FA" />
        </radialGradient>
        <radialGradient
          id="svg-plugin-motionpath-c"
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(-8.5808 -19.75805 15.88126 -6.89713 125.081 14.889)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".161" stopColor="#DBC3E7" />
          <stop offset=".688" stopColor="#695EF5" />
          <stop offset=".917" stopColor="#3829FA" />
        </radialGradient>
        <pattern
          id="svg-plugin-motionpath-b"
          width="1.613"
          height="4.545"
          patternContentUnits="objectBoundingBox"
        >
          <use xlinkHref="#svg-noise" transform="scale(.00323 .0091)" />
        </pattern>
        <pattern
          id="svg-plugin-motionpath-d"
          width="14.286"
          height="14.286"
          patternContentUnits="objectBoundingBox"
        >
          <use xlinkHref="#svg-noise" transform="scale(.02857)" />
        </pattern>

        {/* Noise definition used by patterns */}
        <symbol id="svg-noise" viewBox="0 0 100 100">
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            filter="url(#noiseFilter)"
          />
        </symbol>
      </defs>

      <path
        fill="url(#svg-plugin-motionpath-a)"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.5 36.08C.5 40.454 3.988 44 8.291 44H33.54c3.533 0 6.914-1.463 9.362-4.052l19.478-20.6 17.34 18.338a12.838 12.838 0 0 0 18.543.186l23.956-24.352c3.043-3.093 3.043-8.107 0-11.2a7.701 7.701 0 0 0-11.018 0L89.117 24.768 71.741 6.392a12.84 12.84 0 0 0-18.723 0L32.434 28.16H8.29C3.988 28.16.5 31.706.5 36.08Z"
      />
      <path
        fill="url(#svg-plugin-motionpath-b)"
        fillOpacity=".6"
        fillRule="evenodd"
        clipRule="evenodd"
        style={{ mixBlendMode: "multiply" }}
        d="M.5 36.08C.5 40.454 3.988 44 8.291 44H33.54c3.533 0 6.914-1.463 9.362-4.052l19.478-20.6 17.34 18.338a12.838 12.838 0 0 0 18.543.186l23.956-24.352c3.043-3.093 3.043-8.107 0-11.2a7.701 7.701 0 0 0-11.018 0L89.117 24.768 71.741 6.392a12.84 12.84 0 0 0-18.723 0L32.434 28.16H8.29C3.988 28.16.5 31.706.5 36.08Z"
      />
      <path
        fill="url(#svg-plugin-motionpath-c)"
        d="M123.5 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
      />
      <path
        fill="url(#svg-plugin-motionpath-d)"
        fillOpacity=".6"
        style={{ mixBlendMode: "multiply" }}
        d="M123.5 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
      />
    </svg>
  );
}

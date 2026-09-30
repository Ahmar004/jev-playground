# Jev's Playground: Requirements

Name of web app: "Jev's Playground"

Summary:
A playground to learn System 1 models like Jev through games, experiements, quizzes built directly into the website, and it also lets the user let Jev and a frontier LLM do the same job (any game/task) directly on the website so user can learn where Jev breaks where Jev works tremendously well, so to grasp a stronger understanding on the use cases of System One models of Jev. We have to make the site really interactive, playful and so much interesting plus easier to navigate and awesome to spend time in.

Jev's Playground is an interactive website that teaches people where System One models like Jev work well, where they break, and where a frontier LLM is the better tool. Users learn through games, experiments, and quizzes, and can watch Jev and an LLM do the same task side by side. The site must be really interesting, super fun & playful, easy to navigate, and able to serve 1,000+ people at the same time.

This document lists requirements only. Design and implementation details belong in the separate specification.

---

## 1. Users

| ID | User | Needs |
|---|---|---|
| 0 | Beginner (no API keys) | Learn the difference with no setup and no API keys, through games, experiments, and quizzes, without writing code. Uses Beginner mode. |
| 1 | Developer (own API keys) | Run real experiments in real time with their own API keys and models. Uses Developer mode. |

---

## 2. How the site runs models

| ID | Requirement |
|---|---|
| 2 | The site has two modes: **Beginner mode** (pre-computed content, no keys needed) and **Developer mode** (real-time calls with the user's own API keys). Any user can switch between the two modes easily. |
| 3 | In Beginner mode, all built-in content (levels, games, quizzes, demo comparisons) is pre-computed using the project owner's own Jev and LLM keys, then replayed in the browser. Public visitors never trigger calls on the owner's keys. |
| 4 | Beginner mode comparisons are pre-computed with Claude Haiku 4.5, Claude Sonnet 5.5, and Claude Opus 5.5. |
| 5 | Beginner mode results are real recorded outputs, including real latency, token counts, and cost. They are never invented or edited. |
| 6 | Every Beginner mode result is labelled "Beginner mode" and shows the model ID and the date it was recorded. |
| 7 | Beginner mode results animate at the recorded speed, so users feel the real difference in latency. |
| 8 | The owner can re-record all content when a model version changes, without code changes. |
| 9 | In Developer mode, users paste their own keys (Jev and/or an LLM provider) and run tasks in real time. Every response comes from the actual provider APIs. |
| 10 | With their own LLM key, users can choose from the models that key has access to. |
| 11 | Supported LLM providers include Anthropic. |
| 12 | Supported LLM providers also include OpenAI and Google. |
| 13 | Developer mode results are labelled "Developer mode" to distinguish them from Beginner mode results. |
| 14 | Every built-in game can be played in Beginner mode, and also in Developer mode when the user has pasted the needed keys. |

### User key safety

| ID | Requirement |
|---|---|
| 15 | User keys are never stored in a database, never logged, and never sent to analytics. |
| 16 | By default, keys are kept only in browser memory and are cleared when the tab closes. |
| 17 | Where a provider allows it, Developer mode calls go directly from the browser to the provider, so the key never reaches the project's server. |
| 18 | Where a provider does not allow browser calls, the server forwards the request without storing or logging the key, and the site says so plainly. |
| 19 | The key screen explains in plain language what happens to the key, where it's sent, and how to revoke it. |
| 20 | Users can remove their keys with one click. |
| 21 | Invalid keys, missing permissions, and rate-limit errors from providers are shown as clear, friendly messages. |
| 22 | The owner's keys are used on the server only for a limited time, to pre-compute Beginner mode content, and are never exposed to the browser. Once all Beginner mode content has been computed and recorded, the owner's keys are removed from the server as well. |

---

## 3. Learning path

| ID | Requirement |
|---|---|
| 23 | The site has a guided learning path of levels. No level is locked: users are free to explore anything, in any order. |
| 24 | Every level follows the same loop: **Learn** (short concept), **Predict** (user guesses the outcome), **Play** (the game runs), **Reveal** (what happened and why, with real numbers). |
| 25 | The Reveal step compares the user's prediction with the actual result. |
| 26 | Every Reveal shows speed, cost, and accuracy for each model involved. |
| 27 | Every Reveal links to the relevant TypeSafe documentation page. |
| 28 | Users can skip a level or revisit any level. |
| 29 | Levels include cases where Jev clearly wins, cases where the LLM clearly wins, and cases where plain code is best. Jev must visibly lose where it is weak. |

### Levels

| ID | Level | The user learns |
|---|---|---|
| 30 | **Speed Race**: classify many items; Jev and the LLM race. | Jev is built for fast, cheap judgments at scale. |
| 31 | **Write Me a Haiku**: ask both to write text. | Jev does not generate text; that's System Two work. |
| 32 | **Count the Fruits / Which Date First?**: Jev struggles, then the user applies the fix. | Keep counting, math, and dates in code. |
| 33 | **How Sure Are You?**: user rates confidence and compares with Jev's. | What calibrated confidence is and why it matters. |
| 34 | **Break It Down**: split a broad question into small ones. | Atomic questions combined in code. |
| 35 | **The Router**: sort tasks into Jev, LLM, or code and run the pipeline. | Picking the right tool for each job. |
| 36 | **Spot the Phish**: many signals checked at once, each explained. | Asking many questions in one request. |
| 37 | **Trick Jev**: try to fool Jev with wording. | Literal reading and precise instructions. |

---

## 4. Jev vs LLM games

| ID | Requirement |
|---|---|
| 38 | The site includes some really interesting games, each covering a different use case, that Jev and a frontier LLM play against each other in real time while users watch them compete. |

---

## 5. Arena (side by side)

| ID | Requirement |
|---|---|
| 39 | Users can pick a preset task and see Jev and an LLM do it side by side. |
| 40 | Preset tasks work in Beginner mode with no keys. |
| 41 | In Developer mode, users can edit inputs or write their own task and run it in real time. |
| 42 | In Developer mode, users with an LLM key can pick which model to compare against. |
| 43 | Results show each model's answer, Jev's probabilities and confidence, latency, and cost. |
| 44 | If an LLM returns output that can't be parsed into the expected format, this is shown, not hidden. |
| 45 | A batch mode runs one task on many items to show speed and cost at scale. |
| 46 | Users can share a comparison result via link. |

---

## 6. Sandbox (hands-on with Jev)

| ID | Requirement |
|---|---|
| 47 | Users can write a state and add Choice, Score, and Noul questions. |
| 48 | Beginners can use a simple form; advanced users can edit raw JSON. |
| 49 | Ready-made templates are available and can be explored in Beginner mode without keys. |
| 50 | Running custom questions requires Developer mode with the user's own Jev key. |
| 51 | Answers, probabilities, and confidence are shown visually. |
| 52 | The Sandbox warns when a question matches a known Jev weakness (counting, dates, generation, very long input). |
| 53 | Input size is checked against Jev's limits before sending. |
| 54 | Users can copy their setup as code. |

---

## 7. Sign-in, quizzes and progress

| ID | Requirement |
|---|---|
| 55 | Sign-in is a separate page shown right at the start. No other page of the site can be reached without signing in. |
| 56 | A short "which tool fits?" quiz at the start and a matching one at the end of the path. |
| 57 | Quizzes are optional and never enforced. |
| 58 | Users can see the solutions to every quiz. |
| 59 | Users who take both quizzes see how much their score improved from start to end. |
| 60 | Every quiz answer comes with a short explanation. |
| 61 | Each level ends with a quick 1–2 question check. |
| 62 | Progress is saved to the user's account. |
| 63 | Users earn XP and badges, and get a completion card at the end. |
| 64 | Timed games have leaderboards. |

---

## 8. Navigation and look

| ID | Requirement |
|---|---|
| 65 | After signing in, a new user reaches their first game in one click. |
| 66 | Every main section is reachable in one click from any page. |
| 67 | Progress through the learning path is always visible. |
| 68 | The site feels playful: animations, celebrations, friendly wording. |
| 69 | The site is light on text: diagrams, charts, and pictures are used wherever feasible. |
| 70 | Two themes: **Dark**, inspired by GitHub's dark theme but lighter; **Light**, inspired by Shopeendo, with a cream background, white cards, and green/orange accents. |
| 71 | The theme follows the device setting by default, and the user's choice is remembered. |
| 72 | Jev and the LLM each have one consistent color across the whole site, always paired with a label or icon. |
| 73 | Works well on both desktop and mobile. The UI scales with the screen and browser window size, so the site stays nice and easy to navigate on any device, screen size, or window size. |
| 74 | All explanations are in plain English, with a glossary for technical terms. |

---

## 9. Quality requirements

### Scale and performance

Serving 1,000+ people at once is achievable because Beginner mode content is pre-computed on the owner's keys, and Developer mode runs on users' own keys at no cost to the owner.

| ID | Requirement |
|---|---|
| 75 | The site serves at least 1,000 simultaneous users without errors or noticeable slowdown. |
| 76 | Beginner mode does not depend on any model API being available. |
| 77 | Load in Developer mode is spread across users' own provider limits, not a shared limit. |
| 78 | Scale is verified with a load test before launch, and the results are published. |
| 79 | Pages load in under 2 seconds on a typical phone connection. |
| 80 | Long-running Developer mode calls show progress; the site never appears frozen. |

### Reliability

| ID | Requirement |
|---|---|
| 81 | If a provider is down, the affected Developer mode features show a clear message and offer the Beginner mode version. |
| 82 | Errors are explained in plain language with a way to retry. |

### Security and privacy

| ID | Requirement |
|---|---|
| 83 | Only the minimum needed to sign in is collected; no other personal information is required. |
| 84 | Users are told that everything shown in Beginner mode is pre-computed, while in Developer mode every call happens in real time and every response comes from the actual provider APIs, using the user's own keys. |
| 85 | Analytics are anonymous and never include keys or user-entered task text. |
| 86 | User-entered text and model outputs are always displayed as plain text, never run as code or HTML. |
| 87 | Public content (leaderboard names, shared links) is protected against abuse. |

### Accessibility

| ID | Requirement |
|---|---|
| 88 | Meets WCAG 2.1 AA in both themes. |
| 89 | Everything, including drag-and-drop games, works with keyboard and touch. |
| 90 | Color is never the only way information is shown. |
| 91 | Animations respect the user's reduced-motion setting. |

### Honesty and accuracy

| ID | Requirement |
|---|---|
| 92 | Comparisons use the same inputs and the same expected output format for both models. |
| 93 | The method behind every comparison is described publicly. |

---

## 10. Constraints

| ID | Constraint |
|---|---|
| 94 | Built and shipped within the 8x Playmakers sprint, with a delivery time of 4 days. |
| 95 | Runs locally on localhost for now, with Supabase as provided by 8x. No deployment on Vercel for now. |
| 96 | Jev accepts text input only, and performs best in English. |
| 97 | Jev's rate limits and context limits apply to Developer mode Jev calls. |
| 98 | AI coding-agent logs are kept during development (8x evaluates them). |

---

## 11. Open questions

1. Does TypeSafe's API allow calls directly from the browser? This decides requirement 17 vs. 18 for Jev keys.

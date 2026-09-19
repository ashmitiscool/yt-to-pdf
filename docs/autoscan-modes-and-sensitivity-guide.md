# 🎛️ Auto-Scan Modes & Sensitivity Guide

This guide explains how **Sensitivity** and **Capture Mode** work in **YT to PDF**, how the different combinations behave, and when to use each combination for optimal presentation slide extraction.

---

## 📑 Table of Contents

1. [The Two Controls Explained](#1-the-two-controls-explained)
2. [Combination Matrix](#2-combination-matrix)
3. [Detailed Behavior Breakdown](#3-detailed-behavior-breakdown)
4. [Quick Decision Cheat-Sheet](#4-quick-decision-cheat-sheet)

---

## 1. The Two Controls Explained

YT to PDF provides two orthogonal controls in the Slide Deck Drawer options ribbon:

```
┌────────────────────────────────────────────────────────┐
│  Sensitivity: [ Balanced (Standard) ▼ ]                │
│  Mode:        [ Final Slides (Clean) ▼ ]               │
└────────────────────────────────────────────────────────┘
```

* **Sensitivity (`High`, `Balanced`, `Low`)** controls **WHAT** gets noticed:
  * Determines how subtle or large a visual change needs to be before the engine treats it as meaningful presentation content rather than background noise, mouse cursors, or video compression jitter.
* **Mode (`Final Slides`, `All Steps`)** controls **HOW** that content is stored:
  * Determines whether to overwrite the current slide with the updated complete version (`Final Slides`), or append it as a new separate slide card in the deck (`All Steps`).

---

## 2. Combination Matrix

| Mode | Sensitivity | How It Behaves | Best Use Case |
|---|---|---|---|
| **Final Slides (Clean)** *(Default)* | **Balanced (Medium)** *(Default)* | **⭐ The Golden Default:** Captures 1 slide per topic, updating it live as bullets/drawings appear so you get the final, 100% complete slide without duplicates. | **90% of standard lectures, university courses, tech presentations, and business decks.** |
| **Final Slides (Clean)** | **High** | Ultra-responsive to tiny text/math additions (e.g., single math equation lines, single lines of code), but still merges them into **1 final complete slide**. | **Math/Physics derivations, programming tutorials, and terminal/IDE screen shares.** |
| **Final Slides (Clean)** | **Low** | Strict; only captures major layout/theme shifts, completely ignoring small annotations or minor additions. | **High-level keynote talks, summary overviews, or videos with lots of presenter movement.** |
| **All Steps (Incremental)** | **Balanced (Medium)** | Creates a step-by-step visual timeline, saving a separate slide card for each bullet point reveal. | **Complex architectural diagrams or workflows where understanding the step-by-step reveal order is important.** |
| **All Steps (Incremental)** | **High** | Captures every single incremental stroke, drawing line, and bullet as an individual frame (maximum density). | **Hand-drawn iPad lectures, Khan Academy-style digital whiteboard videos, or sketching tutorials.** |
| **All Steps (Incremental)** | **Low** | Captures only major layout changes as individual cards. | **Fast-paced videos where you want only major chapter transitions.** |

---

## 3. Detailed Behavior Breakdown

### Mode 1: Final Slides (Clean) — Recommended Default

When an instructor presents a slide over 2 minutes, revealing bullets progressively:
```
0:10 ➔ Slide 1 appears with Bullet 1
0:30 ➔ Bullet 2 is added
0:50 ➔ Bullet 3 & Diagram are added
1:15 ➔ Instructor flips to Slide 2
```
* **At 0:10**: Slide 1 is created with Bullet 1.
* **At 0:30**: Slide 1 thumbnail is updated in-place with Bullet 1 + 2.
* **At 0:50**: Slide 1 thumbnail is updated in-place with Bullet 1 + 2 + 3 + Diagram.
* **At 1:15**: Slide 1 is finalized with its **100% complete content**, and Slide 2 begins.
* **Result in Deck**: Exactly 1 clean, complete slide.

---

### Mode 2: All Steps (Incremental)

* **At 0:10**: Slide 1 created (Bullet 1).
* **At 0:30**: Slide 2 created (Bullet 1 + 2).
* **At 0:50**: Slide 3 created (Bullet 1 + 2 + 3 + Diagram).
* **At 1:15**: Slide 4 created (Slide 2).
* **Result in Deck**: A flipbook progression showing how the slide was built over time.

---

## 4. Quick Decision Cheat-Sheet

* 🎓 **"I just want a clean PDF with 1 page per slide as if the teacher gave me the slide deck file:"**  
  $\rightarrow$ Leave on **`Final Slides (Clean)` + `Balanced`** *(Default)*.

* 💻 **"The instructor is live-coding or writing math equations on one screen and I want the final code without duplicate frames:"**  
  $\rightarrow$ Set to **`Final Slides (Clean)` + `High`**.

* 📝 **"I'm studying step-by-step math proofs or diagram builds and want to see the order of reveals:"**  
  $\rightarrow$ Set to **`All Steps (Incremental)` + `Balanced`**.

* 🎨 **"The instructor is drawing freehand on an iPad / digital whiteboard (e.g. Khan Academy):"**  
  $\rightarrow$ Set to **`All Steps (Incremental)` + `High`**.

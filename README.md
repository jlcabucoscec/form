# CEC Form Submission Tool

A static web tool hosted on **GitHub Pages** that lets you paste student failure report data and automatically submit it to a Google Form — no server required.

## 🚀 How to Use

1. Open the GitHub Pages URL (or `index.html` locally)
2. Paste the **Google Form `/formResponse` URL** in the URL field at the top
   - Change the form URL from `/viewform` → `/formResponse`
3. Paste student data in the left panel (one student per block, blocks separated by a blank line)
4. Click **Parse Entries** — entries appear in the queue on the right
5. Click **⚡ Submit All** — each row is submitted with a 1.5s delay

## 📋 Paste Format

Each student is one block. Separate multiple students with a **blank line**:

```
LAST NAME: JAYME
FIRST NAME: HANNY ROSE L.
COURSE: BSIT
YEAR: 2025-2026
SUBJECT CODE: IT ADET 22
TERM FAILED: FINALS
PROVIDE THE REASON FOR THE STUDENT'S FAILURE: The student's grades in Semifinals were below passing grade.
WHEN IT WAS STARTED?: Semifinals
ACTION TAKEN: Student Awareness

LAST NAME: SANTOS
FIRST NAME: MARIA
COURSE: BEED
...
```

## 🔑 Entry ID Map

| Field | Entry ID |
|-------|----------|
| LAST NAME | `entry.1109815499` |
| FIRST NAME | `entry.705218577` |
| COURSE | `entry.1635498050` |
| YEAR | `entry.YEAR_ID_PLACEHOLDER` ⚠️ |
| SUBJECT CODE | `entry.943988708` |
| SUBJECT TITLE | `entry.560266358` |
| TERM FAILED | `entry.304427281` |
| Reason for Failure | `entry.86770068` |
| When Started | `entry.833249190` |
| Action Taken | `entry.722132350` |

> ⚠️ **YEAR field** — the entry ID for the YEAR/School Year field still needs to be extracted from the form's `data-params`. Update `ENTRY_MAP['YEAR']` in `app.js` once found.

## ⚠️ CORS Note

Google Forms doesn't allow cross-origin reads, so the tool uses `fetch` with `mode: 'no-cors'`. This means:
- The request **fires correctly** to Google
- You **cannot read the response status** from the browser
- Always verify submissions in the linked **Google Sheet**

## 🌐 Deploy to GitHub Pages

1. Push `index.html`, `style.css`, `app.js` to a GitHub repo
2. Go to **Settings → Pages → Source: main branch / root**
3. Your tool is live at `https://yourusername.github.io/repo-name/`

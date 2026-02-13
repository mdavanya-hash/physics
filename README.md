# Form 4 Physics Quiz App (Force & Motion I)

A lightweight web quiz app with:

- Student login/signup using **Firebase Authentication**
- Quiz scoring for **Force & Motion I** questions
- Firestore collections used as tables:
  - `students`
  - `attempts`
  - `results`
- **CSV export** for a student's attempts and scores

## Files

- `index.html` – UI layout
- `styles.css` – styling
- `app.js` – Firebase auth, quiz logic, Firestore writes, CSV export

## Setup

1. Create a Firebase project.
2. Enable **Authentication > Email/Password**.
3. Create **Cloud Firestore** in production/test mode.
4. Update `firebaseConfig` in `app.js` with your Firebase credentials.
5. Serve locally:

```bash
python3 -m http.server 4173
```

6. Open `http://localhost:4173`.

## Firestore data model

### `students` collection
Document ID: `uid`

```json
{
  "uid": "user uid",
  "name": "Student Name",
  "className": "4 Science",
  "email": "student@email.com",
  "lastLoginAt": "timestamp"
}
```

### `attempts` collection
Document ID: auto-generated

```json
{
  "uid": "user uid",
  "name": "Student Name",
  "className": "4 Science",
  "email": "student@email.com",
  "topic": "Force & Motion I",
  "answers": { "q1": "Newton", "q2": "Inertia" },
  "submittedAt": "timestamp"
}
```

### `results` collection
Document ID: auto-generated

```json
{
  "uid": "user uid",
  "attemptId": "attempt document id",
  "topic": "Force & Motion I",
  "score": 4,
  "total": 5,
  "percentage": 80,
  "grade": "Excellent",
  "createdAt": "timestamp"
}
```

## CSV export

Use **Export My Attempts CSV** after login to download
`physics_force_motion_results.csv`.

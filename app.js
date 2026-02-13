import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'REPLACE_WITH_API_KEY',
  authDomain: 'REPLACE_WITH_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_APP_ID',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const questions = [
  {
    id: 1,
    text: 'What is the SI unit of force?',
    options: ['Newton', 'Joule', 'Pascal', 'Watt'],
    answer: 'Newton',
  },
  {
    id: 2,
    text: 'Newton’s First Law is also called the law of…',
    options: ['Acceleration', 'Momentum', 'Inertia', 'Conservation of energy'],
    answer: 'Inertia',
  },
  {
    id: 3,
    text: 'If a 2 kg object accelerates at 3 m/s², the force applied is…',
    options: ['1.5 N', '5 N', '6 N', '9 N'],
    answer: '6 N',
  },
  {
    id: 4,
    text: 'The graph of velocity against time has a gradient equal to…',
    options: ['Distance', 'Displacement', 'Acceleration', 'Force'],
    answer: 'Acceleration',
  },
  {
    id: 5,
    text: 'An object moving at constant velocity has…',
    options: ['No net force', 'Maximum force', 'Zero mass', 'Zero momentum'],
    answer: 'No net force',
  },
];

const $ = (id) => document.getElementById(id);

const authStatus = $('auth-status');
const authCard = $('auth-card');
const quizCard = $('quiz-card');
const quizForm = $('quiz-form');
const resultBox = $('result-box');
const userChip = $('user-chip');

function renderQuiz() {
  quizForm.innerHTML = '';

  questions.forEach((question) => {
    const wrapper = document.createElement('fieldset');
    wrapper.className = 'question';

    const title = document.createElement('h3');
    title.textContent = `${question.id}. ${question.text}`;
    wrapper.appendChild(title);

    question.options.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'option';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `q${question.id}`;
      radio.value = option;

      label.appendChild(radio);
      label.append(option);
      wrapper.appendChild(label);
    });

    quizForm.appendChild(wrapper);
  });
}

async function upsertStudentRecord(user, name, className) {
  const studentRef = doc(db, 'students', user.uid);
  await setDoc(
    studentRef,
    {
      uid: user.uid,
      name: name || user.displayName || 'Unknown Student',
      className: className || 'Unspecified',
      email: user.email,
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function getAnswersFromForm() {
  const answers = {};
  questions.forEach((q) => {
    const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
    answers[`q${q.id}`] = selected ? selected.value : null;
  });
  return answers;
}

function computeScore(answers) {
  let score = 0;
  questions.forEach((q) => {
    if (answers[`q${q.id}`] === q.answer) {
      score += 1;
    }
  });
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);
  return { score, total, percentage };
}

function downloadCSV(filename, rows) {
  const escapedRows = rows.map((row) =>
    row
      .map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`)
      .join(','),
  );
  const csvContent = escapedRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function createAttemptAndResult(user, name, className, answers, scoring) {
  const attemptPayload = {
    uid: user.uid,
    name,
    className,
    email: user.email,
    topic: 'Force & Motion I',
    answers,
    submittedAt: serverTimestamp(),
  };

  const attemptRef = await addDoc(collection(db, 'attempts'), attemptPayload);

  await addDoc(collection(db, 'results'), {
    uid: user.uid,
    attemptId: attemptRef.id,
    topic: 'Force & Motion I',
    score: scoring.score,
    total: scoring.total,
    percentage: scoring.percentage,
    grade: scoring.percentage >= 80 ? 'Excellent' : scoring.percentage >= 50 ? 'Pass' : 'Needs Improvement',
    createdAt: serverTimestamp(),
  });

  return attemptRef.id;
}

$('signup-btn').addEventListener('click', async () => {
  try {
    const email = $('email').value.trim();
    const password = $('password').value;
    const name = $('student-name').value.trim();
    const className = $('student-class').value.trim();

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await upsertStudentRecord(cred.user, name, className);
    authStatus.textContent = 'Account created successfully.';
  } catch (error) {
    authStatus.textContent = `Signup failed: ${error.message}`;
  }
});

$('login-btn').addEventListener('click', async () => {
  try {
    const email = $('email').value.trim();
    const password = $('password').value;
    const name = $('student-name').value.trim();
    const className = $('student-class').value.trim();

    const cred = await signInWithEmailAndPassword(auth, email, password);
    await upsertStudentRecord(cred.user, name, className);
    authStatus.textContent = 'Login successful. You can now take the quiz.';
  } catch (error) {
    authStatus.textContent = `Login failed: ${error.message}`;
  }
});

$('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
  authStatus.textContent = 'Logged out successfully.';
});

$('submit-quiz-btn').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) {
    authStatus.textContent = 'Please login first.';
    return;
  }

  const name = $('student-name').value.trim() || user.displayName || 'Unknown Student';
  const className = $('student-class').value.trim() || 'Unspecified';

  const answers = getAnswersFromForm();
  const unanswered = Object.values(answers).some((value) => value === null);
  if (unanswered) {
    resultBox.classList.remove('hidden');
    resultBox.textContent = 'Please answer all questions before submitting.';
    return;
  }

  const scoring = computeScore(answers);

  try {
    const attemptId = await createAttemptAndResult(user, name, className, answers, scoring);

    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `
      <strong>Score: ${scoring.score}/${scoring.total} (${scoring.percentage}%)</strong><br />
      Attempt ID: ${attemptId}
    `;
  } catch (error) {
    resultBox.classList.remove('hidden');
    resultBox.textContent = `Failed to save result: ${error.message}`;
  }
});

$('export-csv-btn').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) {
    authStatus.textContent = 'Please login to export CSV.';
    return;
  }

  try {
    const attemptsQuery = query(
      collection(db, 'attempts'),
      where('uid', '==', user.uid),
      orderBy('submittedAt', 'desc'),
    );

    const attemptsSnapshot = await getDocs(attemptsQuery);
    const resultQuery = query(collection(db, 'results'), where('uid', '==', user.uid));
    const resultsSnapshot = await getDocs(resultQuery);

    const resultMap = {};
    resultsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      resultMap[data.attemptId] = data;
    });

    const rows = [
      ['attemptId', 'name', 'className', 'email', 'topic', 'score', 'total', 'percentage', 'grade'],
    ];

    attemptsSnapshot.forEach((docSnap) => {
      const attempt = docSnap.data();
      const result = resultMap[docSnap.id] || {};

      rows.push([
        docSnap.id,
        attempt.name,
        attempt.className,
        attempt.email,
        attempt.topic,
        result.score ?? '',
        result.total ?? '',
        result.percentage ?? '',
        result.grade ?? '',
      ]);
    });

    downloadCSV('physics_force_motion_results.csv', rows);
    authStatus.textContent = 'CSV exported successfully.';
  } catch (error) {
    authStatus.textContent = `CSV export failed: ${error.message}`;
  }
});

onAuthStateChanged(auth, (user) => {
  const isLoggedIn = Boolean(user);
  $('logout-btn').classList.toggle('hidden', !isLoggedIn);

  if (isLoggedIn) {
    quizCard.classList.remove('hidden');
    userChip.textContent = `${user.email}`;
    renderQuiz();
  } else {
    quizCard.classList.add('hidden');
    userChip.textContent = '';
    resultBox.classList.add('hidden');
  }

  authCard.classList.remove('hidden');
});

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

exports.sendDueVocabularyReminders = onSchedule({
  schedule: 'every 15 minutes',
  timeZone: 'Asia/Seoul',
  region: 'asia-northeast3'
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const snap = await db.collection('vocabPushUsers')
    .where('enabled', '==', true)
    .where('nextNotificationAt', '<=', now)
    .limit(500)
    .get();

  if (snap.empty) return;
  const batch = db.batch();
  const messages = [];
  const docs = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (!data.token) return;
    messages.push({
      token: data.token,
      notification: {
        title: '단어장 복습 시간',
        body: `복습할 단어 ${Math.max(1, Number(data.dueCount) || 1)}개가 있습니다.`
      },
      webpush: {
        fcmOptions: { link: data.appUrl || '/' },
        notification: {
          icon: `${data.appUrl || ''}icons/icon-192.png`,
          badge: `${data.appUrl || ''}icons/icon-192.png`
        }
      }
    });
    docs.push(doc);
  });

  if (!messages.length) return;
  const response = await admin.messaging().sendEach(messages);
  response.responses.forEach((r, i) => {
    const ref = docs[i].ref;
    if (!r.success && ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code)) {
      batch.update(ref, { enabled: false, token: admin.firestore.FieldValue.delete() });
    } else {
      // 중복 발송을 막기 위해 다음 날 같은 시각 전까지 잠금. 앱이 열리면 정확한 다음 복습 시각으로 다시 동기화됩니다.
      batch.update(ref, {
        lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
        nextNotificationAt: admin.firestore.Timestamp.fromMillis(Date.now() + 23 * 60 * 60 * 1000)
      });
    }
  });
  await batch.commit();
});

const { Preferences } = window.CapacitorPlugins || Capacitor;

// Web Notifications
let notificationsEnabled = false;

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Notifications not supported in this browser');
    return;
  }

  if (Notification.permission === 'granted') {
    notificationsEnabled = true;
    updateNotificationUI();
    showToast('Notifications already enabled');
    return;
  }

  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        notificationsEnabled = true;
        updateNotificationUI();
        showToast('Notifications enabled');
      } else {
        showToast('Notifications denied');
      }
    });
  }
}

function updateNotificationUI() {
  if (notificationsEnabled && Notification.permission === 'granted') {
    document.getElementById('notifEnable').textContent = 'Notifications enabled';
    document.getElementById('notifEnable').disabled = true;
    document.getElementById('notifEnable').style.opacity = '0.6';
    document.getElementById('notifDaily').style.display = 'block';
  }
}

function testNotificationCustom() {
  if (!notificationsEnabled) {
    showToast('Enable notifications first in settings');
    return;
  }

  const delaySeconds = parseInt(document.getElementById('testNotifDelay').value) || 5;
  const delayMs = delaySeconds * 1000;

  scheduleNotification('Test Notification', {
    tag: 'test-notification-' + Date.now(),
    body: 'This is a test. Scheduled ' + delaySeconds + ' seconds ago.'
  }, delayMs);

  showToast('Test notification scheduled for ' + delaySeconds + ' seconds. Close the app now!');
}

function scheduleNotification(title, options, delayMs) {
  if (!notificationsEnabled) return;

  const scheduledTime = Date.now() + delayMs;
  const icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%23F5F5DC" width="180" height="180"/><circle cx="90" cy="90" r="65" fill="%235D4037"/><text x="90" y="140" font-family="serif" font-size="100" font-weight="bold" text-anchor="middle" fill="%23FEFDF8">R</text></svg>';
  const badge = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><circle cx="90" cy="90" r="90" fill="%235D4037"/></svg>';

  // Send to Service Worker for persistent scheduling
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      title: title,
      body: options.body || '',
      tag: options.tag || 'rami-notif',
      icon: icon,
      badge: badge,
      scheduledTime: scheduledTime
    });
  }

  // Also schedule immediate fallback if delay is small
  if (delayMs < 60000) {
    setTimeout(() => {
      new Notification(title, {
        icon: icon,
        badge: badge,
        ...options
      });
    }, delayMs);
  }
}

function setupNotificationSchedules() {
  if (!notificationsEnabled) return;

  keptCache.forEach(kept => {
    // Schedule review reminder 7 days after keeping
    if (kept.duel && !kept.duel.verified) {
      const keptDate = new Date(kept.date);
      const reviewDate = new Date(keptDate);
      reviewDate.setDate(reviewDate.getDate() + 7);
      const delayMs = reviewDate.getTime() - Date.now();

      if (delayMs > 0) {
        scheduleNotification('Time to check your wisdom', {
          tag: 'duel-' + kept.storyId,
          body: 'Your lesson about: ' + kept.lesson.substring(0, 50) + '...'
        }, delayMs);
      }
    }
  });
}

function scheduleReviewReminder(storyId) {
  if (!notificationsEnabled) return;
  const kept = keptCache.find(k => k.storyId === storyId);
  if (!kept) return;

  // 7 days = 7 * 24 * 60 * 60 * 1000 ms
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  scheduleNotification('Review time', {
    tag: 'review-' + storyId,
    body: 'Time to review: ' + kept.title
  }, sevenDaysMs);
}

function scheduleDailyWisdom() {
  if (!notificationsEnabled || keptCache.length === 0) return;

  // Schedule for 9am every day
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const delayMs = tomorrow.getTime() - now.getTime();

  // Schedule first daily notification with service worker
  if (keptCache.length > 0) {
    const random = keptCache[Math.floor(Math.random() * keptCache.length)];
    scheduleNotification('Today\'s Wisdom', {
      tag: 'daily-wisdom',
      body: random.lesson.substring(0, 60) + '...'
    }, delayMs);

    // Schedule again for 24 hours later with service worker
    const nextDayMs = delayMs + (24 * 60 * 60 * 1000);
    setTimeout(() => {
      if (keptCache.length > 0) {
        const nextRandom = keptCache[Math.floor(Math.random() * keptCache.length)];
        scheduleNotification('Today\'s Wisdom', {
          tag: 'daily-wisdom',
          body: nextRandom.lesson.substring(0, 60) + '...'
        }, 24 * 60 * 60 * 1000);
      }
    }, nextDayMs);
  }

  showToast('Daily wisdom scheduled for 9am tomorrow');
}

// Register Service Worker for background notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(error => {
    console.log('Service Worker registration failed:', error);
  });
}

// Convert topicsData into Rami story format
function convertTopicsDataToStories(topicsData) {
  const stories = [];
  let storyId = 0;

  Object.entries(topicsData).forEach(([category, topicData]) => {
    Object.entries(topicData.subtopics || {}).forEach(([subtopic, subtopicData]) => {
      Object.entries(subtopicData.articles || {}).forEach(([title, article]) => {
        const story = {
          id: `topic-${++storyId}`,
          kicker: category,
          title: title,
          meta: article.description || '',
          body: article.content ? [article.content] : [],
          summary: article.description || '',
          angle: article.description || ''
        };
        stories.push(story);
      });
    });
  });

  return stories;
}

// Load stories from topicsData if available
const TOPIC_STORIES = window.topicsData ? convertTopicsDataToStories(window.topicsData) : [];

const BUILTIN = [
    {
        id: "estonia-singing",
        kicker: "A True Story · Courage",
        title: "The Country That Sang Its Way to Freedom",
        meta: "Estonia, 1987–1991 · about four minutes",
        body: [
            "For nearly fifty years, Estonia did not exist on most maps as its own country. It had been swallowed by the Soviet Union, its language pushed to the margins, its old national songs quietly forbidden. To sing certain songs in public was to risk being noticed by the wrong people.",
            "Estonians had always been a singing nation. Since the eighteen-sixties they had gathered for a vast song festival, tens of thousands of voices joined in choir on a single field. Under Soviet rule the festival continued, but the songs that mattered most to them were left off the official list.",
            "Then, in the late nineteen-eighties, something shifted. As the Soviet grip loosened, Estonians began testing the edges of what they were allowed to do. And the thing they reached for was not weapons. It was their voices.",
            "In the summer of nineteen eighty-eight, people gathered at the Tallinn song festival grounds night after night, in the thousands, then the hundreds of thousands, singing the forbidden songs. On some nights a quarter of the entire nation was singing together in the open air.",
            "An artist named Heinz Valk gave it a name that stuck: the Singing Revolution. There were no tanks on their side, no army. There was a melody, and a crowd large enough that no one could be singled out.",
            "The boldest moment came in August nineteen eighty-nine. Across all three Baltic nations, roughly two million people joined hands, forming a human chain more than six hundred kilometres long, from Tallinn in the north to Vilnius in the south.",
            "The Soviet authorities were furious, but there was nothing obvious to crush. You cannot arrest a song. You cannot shoot a chain of people holding hands without the whole world watching.",
            "By nineteen ninety-one, Estonia had restored its independence. It had loosened one of the most powerful empires of the century not by matching its violence, but by refusing to offer any."
        ],
        summary: "Estonia, occupied by the Soviet Union, won back its independence largely through mass nonviolent singing. Hundreds of thousands gathered to sing banned national songs, and two million people across the Baltics formed a human chain. The authorities had nothing to crush, and by 1991 Estonia was free.",
        angle: "The strongest force in the story was that no single person could be punished. Courage stopped being dangerous the moment it became collective. A thing you are afraid to do alone can become unstoppable the moment enough people do it together.",
        prompts: [
            "The Estonians answered tanks with songs. Did that read to you as courage, or as a reckless gamble with their lives?",
            "Two million strangers had to hold hands across three countries for the chain to work. At what point would you have doubted they would all show up?",
            "What surprised you most about an empire being worn down by singing rather than fought off with force?"
        ]
    },
    {
        id: "bell-burnell",
        kicker: "A True Story · Recognition",
        title: "The Student Who Found a Star and Lost the Prize",
        meta: "Cambridge, 1967 · about three minutes",
        body: [
            "In nineteen sixty-seven, a young graduate student named Jocelyn Bell was helping run a new radio telescope outside Cambridge. Her job was to comb through hundreds of metres of paper chart, line by line, looking for anything unusual in the signals from space.",
            "One night she noticed a strange smudge in the data. A signal that pulsed with impossible regularity, ticking like a clock, every one and a third seconds. Nothing natural was supposed to behave like that.",
            "For a while the team half-joked it might be a message from another civilisation. They labelled it LGM-1, for Little Green Men. But Bell kept checking, and soon found a second pulsing source elsewhere in the sky. Two alien broadcasts at once was far less likely than one new kind of star.",
            "What she had found was a pulsar — the spinning, collapsed core of a dead star, sweeping a beam of radiation across the universe like a lighthouse. It was one of the most important discoveries in the history of astronomy.",
            "In nineteen seventy-four, the Nobel Prize in Physics was awarded for the discovery of pulsars. It went to her supervisor and a colleague. Bell, the one who had spotted the signal and refused to dismiss it, was not named.",
            "She did not spend her life bitter. She kept working, kept teaching, and became one of the most respected scientists in Britain. Decades later she was given a three million dollar prize for the discovery — and gave every penny away, to fund scholarships for women, refugees, and minorities entering physics."
        ],
        summary: "As a graduate student, Jocelyn Bell Burnell discovered pulsars by noticing a strange regular signal others might have dismissed. The 1974 Nobel Prize went to her supervisor, not her. She carried on without bitterness, and later gave away a major prize to help under-represented people enter science.",
        angle: "She could not control who got the credit. She could only control the quality of her attention and what she did with what came later. The recognition was taken; the work, and the way she carried herself, never was.",
        prompts: [
            "Bell trusted a faint signal everyone else wrote off as noise. Have you ever been certain of something no one around you would take seriously?",
            "The Nobel went to her supervisor and left her name off entirely. If that had happened to you, what would have been the hardest part to forgive?",
            "She later gave her three-million-dollar prize away to outsiders trying to get in. What did that choice make you feel about her?"
        ]
    },
    {
        id: "radium-girls",
        kicker: "A True Story · Standing Up",
        title: "The Women Who Glowed in the Dark",
        meta: "United States, 1917–1928 · about three minutes",
        body: [
            "In the years around the First World War, hundreds of young women took jobs painting watch dials. The paint contained radium, and it glowed a soft green in the dark. The work was considered clean, even glamorous. Some painted their nails and teeth with it for fun.",
            "To paint the tiny numbers precisely, they were taught to shape the brush tip with their lips. Dip, lip, paint. Hundreds of times a day, they swallowed tiny amounts of one of the most radioactive substances on earth.",
            "Their employers told them it was harmless. The company's own chemists handled the same radium behind lead shields and with tongs, but the women at the tables were given nothing.",
            "Within a few years, the workers began falling ill in horrifying ways. Their teeth loosened and fell out. Their jawbones crumbled. Some doctors, paid by the company, blamed other causes to protect it.",
            "A handful of the dying women decided to fight. Led by a worker named Grace Fryer, they searched for two years before finding a lawyer willing to take the case against a powerful corporation. Several were too weak to raise their arms in the courtroom.",
            "They won. Their case became a landmark, helping establish that a company could be held responsible for the safety of its workers. The standards that came from their suffering went on to protect countless people who would never know their names."
        ],
        summary: "Young women painting glowing radium watch dials were told the paint was safe and taught to lick their brushes. Many died terribly from radiation. A few, led by Grace Fryer, sued and won a landmark case that helped force companies to be responsible for worker safety.",
        angle: "They were lied to, and dying, and had every reason to give up quietly. Instead they spent their last strength making sure it could not happen to the next person. Sometimes the point of standing up is not to save yourself — it is to change the rule for everyone after you.",
        prompts: [
            "The company's chemists handled the radium behind lead shields while the women licked their brushes. At what point would you have stopped believing it was safe?",
            "Grace Fryer spent two years just trying to find a lawyer willing to take the case. Would you have kept knocking on doors that long?",
            "They fought on knowing it was already too late to save themselves. What did that decision stir up in you?"
        ]
    }
];

let currentStory = null;
let recallText = '';
let storageReady = false;

const Storage = {
  async get(key) {
    try {
      if (Preferences) {
        const { value } = await Preferences.get({ key });
        return value ? JSON.parse(value) : null;
      }
    } catch (e) {}
    return JSON.parse(localStorage.getItem(key));
  },
  async set(key, val) {
    const data = JSON.stringify(val);
    try {
      if (Preferences) {
        await Preferences.set({ key, value: data });
      }
    } catch (e) {}
    localStorage.setItem(key, data);
  }
};

let customCache = [];
let keptCache = [];
let favoriteCache = [];
let statsCache = { storiesRead: 0, lessonsWritten: 0, totalReadingTime: 0, lastReadDate: null, currentStreak: 0 };
let reviewCache = [];
let readingPositions = {};
let currentLessonDifficulty = 'medium';
let currentDuelWinner = 'you';

// Dynamic recall prompt + Socratic / Field Notes flow state
let currentPrompt = '';
let currentLessonText = '';
let currentFollowUp = '';
let currentCategory = null;
let currentShelfFilter = 'All';

const FALLBACK_PROMPTS = [
    "Which moment in this story stayed with you most?",
    "What would you have done differently?",
    "What did this story make you feel that you did not expect?"
];

const FIELD_NOTE_CATEGORIES = [
    'Resilience', 'Courage', 'Discipline', 'Relationships', 'Identity',
    'Career', 'Mortality', 'Justice', 'Faith', 'Clarity'
];

// Ten example kept lessons (drawn from real stories in the app) so a fresh
// shelf isn't empty. Two are flagged due-for-review (clay left border).
const EXAMPLE_LESSONS = [
  { storyId:'estonia-singing', title:"The Country That Sang Its Way to Freedom",
    lesson:"Courage stops being dangerous the moment it becomes collective.",
    recall:"A small nation under Soviet rule sang forbidden songs together until the empire had nothing it could arrest.",
    angle:"A thing you are afraid to do alone can become unstoppable the moment enough people do it together.",
    difficulty:'easy', daysAgo:2, due:true },
  { storyId:'bell-burnell', title:"The Student Who Found a Star and Lost the Prize",
    lesson:"Control the quality of your attention; you can't control who takes the credit.",
    recall:"A graduate student noticed a signal everyone else would have dismissed, discovered pulsars, and watched the Nobel go to her supervisor.",
    angle:"The recognition was taken; the work, and the way she carried herself, never was.",
    difficulty:'medium', daysAgo:5, due:true },
  { storyId:'radium-girls', title:"The Women Who Glowed in the Dark",
    lesson:"Sometimes you stand up not to save yourself, but to change the rule for everyone after you.",
    recall:"Dial painters poisoned by radium were told it was safe; a dying few sued and set a landmark safety precedent.",
    angle:"They spent their last strength making sure it could not happen to the next person.",
    difficulty:'hard', daysAgo:8, due:false },
  { storyId:'topic-2', title:"Echoes Beneath the Calgarth Oak",
    lesson:"Healing rarely announces itself; it arrives in clean sheets and a meal served on a real plate.",
    recall:"Orphaned camp survivors brought to the Lake District relearned safety through small, ordinary dignities.",
    angle:"Even after the most devastating winter, life finds a way to reach back toward the sun.",
    difficulty:'medium', daysAgo:11, due:false },
  { storyId:'topic-3', title:"The Ghosts in the White Buses",
    lesson:"Even compromised people can do enormous good — heroism rarely comes with clean hands.",
    recall:"A flawed aristocrat bargained with the Nazis and drove white buses into the camps to pull thousands out.",
    angle:"History rarely offers flawless saints; it gives us flawed people with the audacity to act.",
    difficulty:'medium', daysAgo:14, due:false },
  { storyId:'topic-6', title:"Oskar Schindler and the Messy Truth of Heroism",
    lesson:"Courage doesn't require purity — a hustler who speaks the enemy's language can break the machine from inside.",
    recall:"A war profiteer and party member spent his entire fortune bribing officers to keep his Jewish workers alive.",
    angle:"It did not take a saint to shatter a genocide; it took a man willing to dine with monsters.",
    difficulty:'hard', daysAgo:18, due:false },
  { storyId:'topic-7', title:"Primo Levi: The Chemist Who Distilled Humanity From Hell",
    lesson:"When everything is stripped away, what remains can still be a warm potato passed in the dark.",
    recall:"A young chemist survived Auschwitz on a stranger's smuggled soup and his scientist's detachment.",
    angle:"A bricklayer's silent goodness reminded him a just world still existed outside the wire.",
    difficulty:'medium', daysAgo:21, due:false },
  { storyId:'topic-8', title:"The Manila Envelope That Broke the Silence",
    lesson:"Don't surrender your conscience to authority just because the authority looks legitimate.",
    recall:"A disease tracker found a file exposing a decades-long study that withheld a known cure from poor men.",
    angle:"When we fail to see the humanity in the vulnerable, we lose our own moral bearings.",
    difficulty:'hard', daysAgo:25, due:false },
  { storyId:'topic-5', title:"Shadows on the Train Platform",
    lesson:"Safety can be a sacrifice someone else makes for you — paid quietly, and never repaid.",
    recall:"Parents put their children on blacked-out trains to strangers abroad; most were never seen again.",
    angle:"The blacked-out windows drew a heavy curtain across childhood itself.",
    difficulty:'medium', daysAgo:30, due:false },
  { storyId:'topic-4', title:"The Lighthouse in the Scruff",
    lesson:"The margins sharpen your attention; the fight to stay in the room teaches you to look closer.",
    recall:"An outsider graduate student spotted a faint 'scruff' in the data that others ignored, and found a new kind of star.",
    angle:"The greatest discoveries often come from the people fighting just to stay in the room.",
    difficulty:'easy', daysAgo:35, due:false }
];

function seedExampleLessons() {
  const day = 86400000;
  // Category + personal-connection answer for each example, in the same order.
  const extras = [
    { category: 'Courage',       followUp: "I keep waiting to feel ready before I speak up at work, but readiness may only arrive once a few others step up with me." },
    { category: 'Discipline',    followUp: "I spend too much energy wanting credit; the part I actually control is how carefully I do the work." },
    { category: 'Justice',       followUp: "There is a problem at a place I used to work that I stayed quiet about because it no longer touches me." },
    { category: 'Resilience',    followUp: "After a hard stretch I underestimate how much small, ordinary routines are doing to keep me upright." },
    { category: 'Courage',       followUp: "I write people off for their worst traits and forget good can come from imperfect hands, including mine." },
    { category: 'Courage',       followUp: "I have been waiting to become a good enough person before helping, instead of just helping now." },
    { category: 'Resilience',    followUp: "When things look bleak I forget that small acts of kindness are what actually carry me through." },
    { category: 'Justice',       followUp: "I defer to experts even when something feels plainly wrong; I want to trust my own conscience more." },
    { category: 'Relationships', followUp: "There are sacrifices the people who raised me made that I have never properly acknowledged to them." },
    { category: 'Clarity',       followUp: "Feeling like an outsider in my field makes me look harder, and that is a strength, not only a wound." }
  ];
  const seeded = EXAMPLE_LESSONS.map((d, idx) => ({
    storyId: d.storyId,
    title: d.title,
    prompt: '',
    recall: d.recall,
    lesson: d.lesson,
    followUp: (extras[idx] && extras[idx].followUp) || '',
    category: (extras[idx] && extras[idx].category) || null,
    date: new Date(Date.now() - d.daysAgo * day).toLocaleDateString(),
    keptAt: Date.now() - d.daysAgo * day,
    difficulty: d.difficulty,
    reviews: [],
    lastReviewDate: null,
    duel: { yourLesson: d.lesson, storyAngle: d.angle, winner: 'you', verified: false, accuracy: null },
    reflections: []
  }));
  keptCache = seeded.concat(keptCache);
  EXAMPLE_LESSONS.forEach(d => {
    if (d.due) reviewCache.push({ keptId: d.storyId, reviewDate: new Date(Date.now() - day).toISOString(), reviewed: false });
  });
  Storage.set('osm_kept', keptCache);
  Storage.set('osm_reviews', reviewCache);
  updateKeptCount();
}

async function initStorage() {
  customCache = await Storage.get('osm_custom') || [];
  keptCache = await Storage.get('osm_kept') || [];
  favoriteCache = await Storage.get('osm_favorites') || [];
  statsCache = await Storage.get('osm_stats') || { storiesRead: 0, lessonsWritten: 0, totalReadingTime: 0, lastReadDate: null, currentStreak: 0 };
  reviewCache = await Storage.get('osm_reviews') || [];
  readingPositions = await Storage.get('osm_positions') || {};

  // Populate a fresh shelf with example lessons once, so it isn't empty.
  if (keptCache.length === 0 && !localStorage.getItem('osm_seeded')) {
    seedExampleLessons();
    localStorage.setItem('osm_seeded', '1');
  }

  storageReady = true;
  updateKeptCount();
  renderLibrary();
  showNav('navHome');
  updateSettingsUI();

  const textSize = localStorage.getItem('textSize');
  const theme = localStorage.getItem('theme');
  const nightMode = localStorage.getItem('nightMode');
  if (textSize && textSize !== 'default') setTextSize(textSize);
  if (theme === 'dark') setTheme('dark');
  if (nightMode === 'true') setNightMode(true);

  // Check notification permission
  if ('Notification' in window && Notification.permission === 'granted') {
    notificationsEnabled = true;
    updateNotificationUI();
  }
}

window.addEventListener('scroll', function() {
    const h = document.body.scrollHeight - window.innerHeight;
    const pct = h > 0 ? (window.scrollY / h) * 100 : 0;
    document.getElementById('progress').style.width = pct + '%';
});

let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;
let swipeStarted = false;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
    swipeStarted = false;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    // Only track horizontal swipes to the right
    if (deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
        swipeStarted = true;
        const progress = Math.min(deltaX / window.innerWidth, 1);
        document.documentElement.style.transform = `translateX(${deltaX}px)`;
        document.documentElement.style.opacity = Math.max(1 - progress * 0.3, 0.7);
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (!isSwiping) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Check if swipe is right and far enough
    if (swipeStarted && deltaX > 80 && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Complete the swipe animation
        document.documentElement.style.transition = 'all 0.3s ease-out';
        document.documentElement.style.transform = `translateX(${window.innerWidth}px)`;
        document.documentElement.style.opacity = '0.3';

        setTimeout(() => {
            handleSwipeRight();
            document.documentElement.style.transition = 'none';
            document.documentElement.style.transform = '';
            document.documentElement.style.opacity = '1';
        }, 300);
    } else {
        // Reset animation if swipe wasn't far enough
        document.documentElement.style.transition = 'all 0.2s ease-out';
        document.documentElement.style.transform = 'translateX(0)';
        document.documentElement.style.opacity = '1';
        setTimeout(() => {
            // Clear the inline transform so position:fixed pins to the viewport again.
            document.documentElement.style.transition = 'none';
            document.documentElement.style.transform = '';
        }, 200);
    }

    isSwiping = false;
    swipeStarted = false;
}, { passive: true });

function handleSwipeRight() {
    const storyView = document.getElementById('storyView');
    const step1 = document.getElementById('step1');
    const stepCheck = document.getElementById('stepCheck');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const convertView = document.getElementById('convertView');
    const addView = document.getElementById('addView');
    const shelfView = document.getElementById('shelfView');
    const settingsView = document.getElementById('settingsView');
    const statsView = document.getElementById('statsView');
    const favoritesView = document.getElementById('favoritesView');

    if (storyView.style.display === 'block') {
        goLibrary();
    } else if (step1.classList.contains('active')) {
        goLibrary();
    } else if (stepCheck.classList.contains('active')) {
        goLibrary();
    } else if (step2.classList.contains('active')) {
        goLibrary();
    } else if (step3.classList.contains('active')) {
        goLibrary();
    } else if (convertView.classList.contains('active')) {
        goLibrary();
    } else if (addView.classList.contains('active')) {
        goLibrary();
    } else if (document.getElementById('lessonView').classList.contains('active')) {
        openShelf();
    } else if (shelfView.classList.contains('active')) {
        goLibrary();
    } else if (settingsView.classList.contains('active')) {
        goLibrary();
    } else if (statsView.classList.contains('active')) {
        goLibrary();
    } else if (favoritesView.classList.contains('active')) {
        goLibrary();
    }
}

function getCustom() { return customCache; }
function allStories() { return getCustom().concat(TOPIC_STORIES).concat(BUILTIN); }
function getKept() { return keptCache; }
function isFavorite(id) { return favoriteCache.some(f => f.storyId === id); }
function isKept(id) { return getKept().some(k => k.storyId === id); }
function getFavorites() { return favoriteCache; }

function toggleFavorite(id) {
  const story = allStories().find(s => s.id === id);
  if (!story) return;
  const idx = favoriteCache.findIndex(f => f.storyId === id);
  if (idx >= 0) {
    favoriteCache.splice(idx, 1);
  } else {
    favoriteCache.unshift({ storyId: id, title: story.title, date: new Date().toLocaleDateString() });
  }
  Storage.set('osm_favorites', favoriteCache);
  renderLibrary();
}

function trackReading(storyId, readingTime) {
  statsCache.storiesRead++;
  statsCache.totalReadingTime += readingTime;
  const today = new Date().toLocaleDateString();
  if (statsCache.lastReadDate !== today) {
    if (statsCache.lastReadDate === new Date(Date.now() - 86400000).toLocaleDateString()) {
      statsCache.currentStreak++;
    } else {
      statsCache.currentStreak = 1;
    }
    statsCache.lastReadDate = today;
  }
  Storage.set('osm_stats', statsCache);
}

function trackLesson() {
  statsCache.lessonsWritten++;
  Storage.set('osm_stats', statsCache);
}

function scheduleReview(keptId, daysFromNow) {
  const reviewDate = new Date();
  reviewDate.setDate(reviewDate.getDate() + daysFromNow);
  reviewCache.push({ keptId, reviewDate: reviewDate.toISOString(), reviewed: false });
  Storage.set('osm_reviews', reviewCache);
}

function getDueReviews() {
  const now = new Date();
  return reviewCache.filter(r => !r.reviewed && new Date(r.reviewDate) <= now);
}

function markReviewDone(reviewId) {
  const review = reviewCache.find(r => r.keptId === reviewId);
  if (review) review.reviewed = true;
  Storage.set('osm_reviews', reviewCache);
}

function selectSeg(el, ids) {
  ids.forEach(id => {
    const e = document.getElementById(id);
    if (!e) return;
    e.style.background = 'transparent';
    e.style.color = '';
    e.style.borderColor = '';
  });
  const t = document.getElementById(el);
  if (t) { t.style.background = 'var(--accent)'; t.style.color = '#fff'; t.style.borderColor = 'var(--accent)'; }
}

function setLessonDifficulty(difficulty) {
  currentLessonDifficulty = difficulty;
  selectSeg('diff' + difficulty.charAt(0).toUpperCase() + difficulty.slice(1), ['diffEasy', 'diffMedium', 'diffHard']);
}

function setDuelWinner(winner) {
  currentDuelWinner = winner;
  selectSeg('duel' + (winner === 'you' ? 'You' : winner === 'story' ? 'Story' : 'Tie'), ['duelYou', 'duelStory', 'duelTie']);
}

function scheduleSmartReviews(storyId, difficulty) {
  const intervals = {
    easy: [7, 14, 30],
    medium: [3, 7, 14, 30],
    hard: [1, 3, 7, 14, 30]
  };

  const days = intervals[difficulty] || intervals.medium;
  days.forEach(days => scheduleReview(storyId, days));
}

function getReviewStats() {
  let easyCount = 0, mediumCount = 0, hardCount = 0;
  let reviewsThisMonth = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  keptCache.forEach(k => {
    if (k.difficulty === 'easy') easyCount++;
    else if (k.difficulty === 'hard') hardCount++;
    else mediumCount++;

    if (k.reviews) {
      k.reviews.forEach(r => {
        if (new Date(r.date) > thirtyDaysAgo) reviewsThisMonth++;
      });
    }
  });

  return { easyCount, mediumCount, hardCount, reviewsThisMonth };
}

function recordReviewRetention(storyId, retentionScore) {
  const kept = keptCache.find(k => k.storyId === storyId);
  if (kept) {
    if (!kept.reviews) kept.reviews = [];
    kept.reviews.push({
      date: new Date().toISOString(),
      retention: retentionScore
    });
    kept.lastReviewDate = new Date().toLocaleDateString();
    Storage.set('osm_kept', keptCache);
    showToast('Review recorded! Avg retention: ' + getAvgRetention(storyId) + '%');
  }
}

function getAvgRetention(storyId) {
  const kept = keptCache.find(k => k.storyId === storyId);
  if (!kept || !kept.reviews || kept.reviews.length === 0) return 'N/A';
  const avg = kept.reviews.reduce((sum, r) => sum + r.retention, 0) / kept.reviews.length;
  return Math.round(avg);
}

function setNightMode(enabled) {
  if (enabled) {
    document.body.classList.add('night-mode');
    localStorage.setItem('nightMode', 'true');
  } else {
    document.body.classList.remove('night-mode');
    localStorage.setItem('nightMode', 'false');
  }
}

function exportJournal() {
  const kept = getKept();
  let markdown = '# My Rami Journal\n\n';
  markdown += `Exported on ${new Date().toLocaleDateString()}\n\n`;
  markdown += `**Reading Stats:** ${statsCache.storiesRead} stories read, ${statsCache.lessonsWritten} lessons written, ${(statsCache.totalReadingTime / 60).toFixed(1)} hours total\n\n`;

  kept.forEach((k, i) => {
    markdown += `## ${i + 1}. ${esc(k.title)}\n\n`;
    markdown += `**Date Kept:** ${k.date}\n\n`;
    markdown += `**What you remembered:** ${esc(k.recall)}\n\n`;
    markdown += `**The lesson you drew:** ${esc(k.lesson)}\n\n`;
    markdown += `---\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rami-journal-${new Date().toISOString().slice(0,10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function updateKeptCount() {
    const n = getKept().length;
    const countText = n ? ' (' + n + ')' : '';
    const keptCountEl = document.getElementById('keptCount');
    const keptCountSidebarEl = document.getElementById('keptCountSidebar');
    if (keptCountEl) keptCountEl.textContent = countText;
    if (keptCountSidebarEl) keptCountSidebarEl.textContent = countText;
}

function hideAll() {
    saveReadingPosition();
    ['libraryView','storyView'].forEach(id => document.getElementById(id).style.display = 'none');
    ['step1','stepCheck','step2','stepSocratic','stepTag','step3','step4review','convertView','addView','editView','shelfView','lessonView','reflectionView','accuracyView','settingsView','statsView','favoritesView'].forEach(id => document.getElementById(id).classList.remove('active'));
    // Hide the bottom nav by default; tab screens re-show it via showNav().
    document.body.classList.add('nav-hidden');
    // Default the nav scrim to the deep page colour; light-surface screens opt in.
    document.body.classList.remove('surface-page');
}

// Show the bottom nav and highlight the active tab. Only the main tab screens call this.
function showNav(activeId) {
    document.body.classList.remove('nav-hidden');
    ['navHome','navShelf','navStats','navAdd','navMore'].forEach(id => {
        const e = document.getElementById(id);
        if (e) e.classList.remove('active');
    });
    if (activeId) {
        const a = document.getElementById(activeId);
        if (a) a.classList.add('active');
    }
}

let scrollLocked = false;
let lockedScrollY = 0;

function toggleMoreMenu() {
    const menu = document.getElementById('moreMenu');
    const overlay = document.getElementById('moreMenuOverlay');
    menu.classList.toggle('open');
    overlay.classList.toggle('open');
}

function closeMoreMenu() {
    const menu = document.getElementById('moreMenu');
    const overlay = document.getElementById('moreMenuOverlay');
    menu.classList.remove('open');
    overlay.classList.remove('open');
}

// Legacy alias used by the *FromMenu navigation wrappers. There is no sidebar
// any more — the menu it used to close is now the bottom "More" menu.
function closeSidebar() {
    closeMoreMenu();
}

// ---- Card action sheet (⋯ menus on Library + Shelf cards) ----
let sheetTargetStory = null;
let sheetTargetKept = null;

function showActionSheet(title, bodyHtml) {
    document.getElementById('actionSheetTitle').textContent = title;
    document.getElementById('actionSheetBody').innerHTML = bodyHtml;
    document.getElementById('actionSheet').classList.add('open');
    document.getElementById('actionOverlay').classList.add('open');
}

function closeActionSheet() {
    document.getElementById('actionSheet').classList.remove('open');
    document.getElementById('actionOverlay').classList.remove('open');
}

// Library card menu: Favorite (all) + Edit/Delete (your own stories only)
function openStoryMenu(id, ev) {
    if (ev) ev.stopPropagation();
    const s = allStories().find(x => x.id === id);
    if (!s) return;
    sheetTargetStory = id;
    sheetTargetKept = null;
    const custom = id.startsWith('custom-');
    const fav = isFavorite(id);
    let h = '';
    h += '<button class="sheet-action" onclick="sheetToggleFavorite()">' + (fav ? 'Remove from favorites' : 'Add to favorites') + '</button>';
    if (custom) {
        h += '<button class="sheet-action" onclick="sheetEditStory()">Edit</button>';
        h += '<button class="sheet-action danger" onclick="sheetDeleteStory()">Delete</button>';
    }
    showActionSheet(s.title, h);
}

function sheetToggleFavorite() {
    const id = sheetTargetStory;
    if (id) {
        toggleFavorite(id);
        showToast(isFavorite(id) ? 'Added to favorites' : 'Removed from favorites');
    }
    closeActionSheet();
}

function sheetEditStory() {
    const id = sheetTargetStory;
    closeActionSheet();
    currentStory = allStories().find(x => x.id === id);
    if (currentStory) openEditStory();
}

function sheetDeleteStory() {
    const id = sheetTargetStory;
    closeActionSheet();
    currentStory = allStories().find(x => x.id === id);
    if (currentStory) deleteStory();
}

// Shelf card menu: What changed? (reflection) + Remove
function openShelfMenu(i, ev) {
    if (ev) ev.stopPropagation();
    const k = keptCache[i];
    if (!k) return;
    sheetTargetKept = i;
    sheetTargetStory = null;
    let h = '';
    h += '<button class="sheet-action" onclick="sheetReflection()">What changed?</button>';
    h += '<button class="sheet-action danger" onclick="sheetRemoveKept()">Remove from shelf</button>';
    showActionSheet(k.title, h);
}

function sheetReflection() {
    const i = sheetTargetKept;
    closeActionSheet();
    openReflection(i);
}

function sheetRemoveKept() {
    const i = sheetTargetKept;
    closeActionSheet();
    removeKept(i);
    showToast('Removed from shelf');
}

function goLibrary() {
    const wasReading = document.getElementById('storyView').style.display === 'block';
    saveReadingPosition();
    hideAll();
    renderLibrary();
    document.getElementById('libraryView').style.display = 'block';
    showNav('navHome');
    if (!wasReading) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveReadingPosition() {
    if (currentStory && document.getElementById('storyView').style.display === 'block') {
        readingPositions[currentStory.id] = window.scrollY;
        Storage.set('osm_positions', readingPositions);
    }
}

function goLibraryFromMenu() {
    closeSidebar();
    goLibrary();
}

function renderLibrary() {
    const stories = allStories();
    const custom = getCustom();
    let html = '';
    stories.forEach((s, i) => {
        const yours = custom.some(c => c.id === s.id);
        html += '<div class="lib-item" onclick="openStory(\'' + s.id + '\')">';
        html += '<button class="card-dots" onclick="openStoryMenu(\'' + s.id + '\',event)" aria-label="Options"><span></span><span></span><span></span></button>';
        html += '<div class="lib-kicker">' + esc(s.kicker) + '</div>';
        html += '<h3>' + esc(s.title) + '</h3>';
        html += '<div class="lib-meta">' + esc(s.meta) + '</div>';
        html += '<div class="lib-tags">';
        if (isKept(s.id)) html += '<span class="lib-done">Kept</span>';
        if (yours) html += '<span class="lib-yours">Added by you</span>';
        html += '</div></div>';
    });
    document.getElementById('libList').innerHTML = html;
    const countEl = document.getElementById('libCount');
    if (countEl) countEl.textContent = stories.length + (stories.length === 1 ? ' story' : ' stories');
}

function openStory(id) {
    currentStory = allStories().find(s => s.id === id);
    if (!currentStory) return;
    hideAll();
    document.getElementById('storyKicker').textContent = currentStory.kicker;
    document.getElementById('storyTitle').textContent = currentStory.title;
    document.getElementById('storyMeta').textContent = currentStory.meta;
    document.getElementById('storyBody').innerHTML = currentStory.body.map(p => '<p>' + esc(p) + '</p>').join('');

    const btn = document.getElementById('favoriteBtn');
    if (isFavorite(id)) {
        btn.textContent = 'Remove from favorites';
        btn.style.color = 'var(--accent)';
    } else {
        btn.textContent = 'Add to favorites';
        btn.style.color = 'inherit';
    }

    const isCustom = id.startsWith('custom-');
    document.getElementById('editDeleteBtns').style.display = isCustom ? 'flex' : 'none';

    // Check if this story is due for review
    const isDueForReview = getDueReviews().some(r => r.keptId === id);
    if (isDueForReview) {
        document.getElementById('step4review').classList.add('active');
    } else {
        document.getElementById('storyView').style.display = 'block';
    }

    setTimeout(() => applyTextSettings(), 100);

    const savedPosition = readingPositions[id] || 0;
    if (savedPosition === 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        setTimeout(() => window.scrollTo({ top: savedPosition, behavior: 'auto' }), 100);
    }

    window.storyStartTime = Date.now();
}

function checkLen(inputId, hintId, btnId) {
    const v = document.getElementById(inputId).value.trim();
    const hint = document.getElementById(hintId);
    const btn = document.getElementById(btnId);
    if (v.length >= 12) { btn.disabled = false; hint.textContent = 'Good'; hint.classList.add('ready'); }
    else { btn.disabled = true; hint.classList.remove('ready'); hint.textContent = inputId === 'recallInput' ? 'A sentence or two is enough' : 'One clear line'; }
}

function finishReading() {
    const readingTime = (Date.now() - (window.storyStartTime || Date.now())) / 1000;
    trackReading(currentStory.id, readingTime);
    readingPositions[currentStory.id] = 0;
    Storage.set('osm_positions', readingPositions);
    document.getElementById('storyView').style.display = 'none';

    // Pick one prompt at random from this story (or the generic fallback set)
    const prompts = (currentStory.prompts && currentStory.prompts.length) ? currentStory.prompts : FALLBACK_PROMPTS;
    currentPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    document.getElementById('recallPrompt').textContent = currentPrompt;

    document.getElementById('step1').classList.add('active');
    document.getElementById('recallInput').value = '';
    document.getElementById('toCheck').disabled = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('recallInput').focus();
}

function afterRecall() {
    recallText = document.getElementById('recallInput').value.trim();
    document.getElementById('step1').classList.remove('active');
    if (currentStory.summary && currentStory.summary.trim()) {
        document.getElementById('recallEcho').textContent = recallText;
        document.getElementById('summaryText').textContent = currentStory.summary;
        document.getElementById('stepCheck').classList.add('active');
    } else {
        showLesson();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goLesson() {
    document.getElementById('stepCheck').classList.remove('active');
    showLesson();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLesson() {
    document.getElementById('step2').classList.add('active');
    document.getElementById('lessonInput').value = '';
    document.getElementById('toKeep').disabled = true;
    document.getElementById('lessonInput').focus();
}

// Step 2 -> Socratic follow-up (before saving)
function goSocratic() {
    currentLessonText = document.getElementById('lessonInput').value.trim();
    document.getElementById('step2').classList.remove('active');

    document.getElementById('socraticLesson').textContent = currentLessonText;
    document.getElementById('socraticQ').textContent = socraticQuestion(currentLessonText);
    document.getElementById('socraticInput').value = '';
    document.getElementById('toTag').disabled = true;

    document.getElementById('stepSocratic').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('socraticInput').focus();
}

// Pick a follow-up question by scanning the lesson for theme words
function socraticQuestion(text) {
    const t = (text || '').toLowerCase();
    const has = (...words) => words.some(w => t.indexOf(w) !== -1);
    if (has('patience', 'patient', 'wait', 'slow')) return "Where in your own life right now is patience the hardest thing to practice?";
    if (has('courage', 'brave', 'fear', 'afraid')) return "What is one thing you are currently avoiding out of fear?";
    if (has('persist', 'keep going', 'give up', 'quit', 'resilience')) return "What have you been close to quitting recently?";
    if (has('together', 'collective', 'community', 'alone')) return "Is there something in your life right now that you are trying to do alone, but should not be?";
    if (has('credit', 'recognition', 'noticed', 'seen', 'ignored')) return "Where in your life do you feel your effort is going unrecognised?";
    if (has('speak', 'voice', 'silence', 'say')) return "What have you been leaving unsaid, and to whom?";
    return "Where in your own life does this lesson feel most immediately true?";
}

function checkSocratic() {
    const v = document.getElementById('socraticInput').value.trim();
    document.getElementById('toTag').disabled = v.length < 10;
}

// Socratic -> category tag
function goTag() {
    currentFollowUp = document.getElementById('socraticInput').value.trim();
    document.getElementById('stepSocratic').classList.remove('active');

    currentCategory = null;
    document.querySelectorAll('#tagGrid .cat-btn').forEach(b => b.classList.remove('sel'));
    document.getElementById('saveFieldNotes').style.display = 'none';

    document.getElementById('stepTag').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectCategory(cat, el) {
    currentCategory = cat;
    document.querySelectorAll('#tagGrid .cat-btn').forEach(b => b.classList.remove('sel'));
    if (el) el.classList.add('sel');
    document.getElementById('saveFieldNotes').style.display = 'block';
}

// Tag -> save the kept entry and show the "kept" screen
function finalizeKeep() {
    if (!currentCategory) { showToast('Pick a category first'); return; }

    document.getElementById('lessonEcho').textContent = currentLessonText;
    document.getElementById('angleText').textContent = currentStory.angle || 'No angle was written for this story.';

    const keptItem = {
        storyId: currentStory.id,
        title: currentStory.title,
        prompt: currentPrompt,
        recall: recallText,
        lesson: currentLessonText,
        followUp: currentFollowUp,
        category: currentCategory,
        date: new Date().toLocaleDateString(),
        keptAt: Date.now(),
        difficulty: currentLessonDifficulty,
        reviews: [],
        lastReviewDate: null,
        duel: {
            yourLesson: currentLessonText,
            storyAngle: currentStory.angle,
            winner: currentDuelWinner,
            verified: false,
            accuracy: null
        },
        reflections: []
    };
    keptCache.unshift(keptItem);
    Storage.set('osm_kept', keptCache);
    updateKeptCount();
    trackLesson();

    scheduleSmartReviews(currentStory.id, currentLessonDifficulty);
    scheduleReviewReminder(currentStory.id);

    document.getElementById('stepTag').classList.remove('active');
    document.getElementById('step3').classList.add('active');
    document.getElementById('keptNote').textContent = 'Filed under ' + currentCategory + ' in your Field Notes.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openAdd() {
    hideAll();
    document.getElementById('addView').classList.add('active');
    document.body.classList.add('surface-page');
    showNav('navAdd');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openAddFromMenu() {
    closeSidebar();
    openAdd();
}

function saveNewStory() {
    const kicker = document.getElementById('addKicker').value.trim();
    const title = document.getElementById('addTitle').value.trim();
    const meta = document.getElementById('addMeta').value.trim();
    const bodyRaw = document.getElementById('addBody').value.trim();
    const summary = document.getElementById('addSummary').value.trim();
    const angle = document.getElementById('addAngle').value.trim();

    if (!title) { showToast('Give it a title'); return; }
    if (!bodyRaw) { showToast('Add the story text'); return; }

    const body = bodyRaw.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

    const story = {
        id: 'custom-' + Date.now(),
        kicker: kicker || 'A Story',
        title: title,
        meta: meta || '',
        body: body,
        summary: summary,
        angle: angle
    };

    // Story prompts — keep the 3 fields, fill any blanks with the generic set.
    // If all three are blank, omit prompts so the fallback set is used at read time.
    const p1 = document.getElementById('addPrompt1').value.trim();
    const p2 = document.getElementById('addPrompt2').value.trim();
    const p3 = document.getElementById('addPrompt3').value.trim();
    if (p1 || p2 || p3) {
        story.prompts = [p1 || FALLBACK_PROMPTS[0], p2 || FALLBACK_PROMPTS[1], p3 || FALLBACK_PROMPTS[2]];
    }

    customCache.unshift(story);
    Storage.set('osm_custom', customCache);

    ['addKicker','addTitle','addMeta','addBody','addSummary','addAngle','addPrompt1','addPrompt2','addPrompt3'].forEach(id => document.getElementById(id).value = '');
    showToast('Added to your library');
    goLibrary();
}

function openEditStory() {
    const isCustom = currentStory.id.startsWith('custom-');
    if (!isCustom) { showToast('Cannot edit built-in stories'); return; }

    document.getElementById('editKicker').value = currentStory.kicker;
    document.getElementById('editTitle').value = currentStory.title;
    document.getElementById('editMeta').value = currentStory.meta;
    document.getElementById('editBody').value = currentStory.body.join('\n\n');
    document.getElementById('editSummary').value = currentStory.summary;
    document.getElementById('editAngle').value = currentStory.angle;
    const ep = currentStory.prompts || [];
    document.getElementById('editPrompt1').value = ep[0] || '';
    document.getElementById('editPrompt2').value = ep[1] || '';
    document.getElementById('editPrompt3').value = ep[2] || '';

    hideAll();
    document.getElementById('editView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveEditStory() {
    const kicker = document.getElementById('editKicker').value.trim();
    const title = document.getElementById('editTitle').value.trim();
    const meta = document.getElementById('editMeta').value.trim();
    const bodyRaw = document.getElementById('editBody').value.trim();
    const summary = document.getElementById('editSummary').value.trim();
    const angle = document.getElementById('editAngle').value.trim();

    if (!title) { showToast('Give it a title'); return; }
    if (!bodyRaw) { showToast('Add the story text'); return; }

    const body = bodyRaw.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);

    const idx = customCache.findIndex(s => s.id === currentStory.id);
    if (idx >= 0) {
        const ep1 = document.getElementById('editPrompt1').value.trim();
        const ep2 = document.getElementById('editPrompt2').value.trim();
        const ep3 = document.getElementById('editPrompt3').value.trim();
        const updated = {
            id: currentStory.id,
            kicker: kicker || 'A Story',
            title: title,
            meta: meta || '',
            body: body,
            summary: summary,
            angle: angle
        };
        if (ep1 || ep2 || ep3) {
            updated.prompts = [ep1 || FALLBACK_PROMPTS[0], ep2 || FALLBACK_PROMPTS[1], ep3 || FALLBACK_PROMPTS[2]];
        }
        customCache[idx] = updated;
        Storage.set('osm_custom', customCache);
        currentStory = customCache[idx];
        showToast('Story updated');
        openStory(currentStory.id);
    }
}

function deleteStory() {
    const isCustom = currentStory.id.startsWith('custom-');
    if (!isCustom) { showToast('Cannot delete built-in stories'); return; }

    if (confirm('Delete this story? This cannot be undone.')) {
        const idx = customCache.findIndex(s => s.id === currentStory.id);
        if (idx >= 0) {
            customCache.splice(idx, 1);
            Storage.set('osm_custom', customCache);
            showToast('Story deleted');
            goLibrary();
        }
    }
}

function exportStories() {
    const custom = getCustom();
    const topicStories = TOPIC_STORIES;
    const allToExport = {
        custom: custom,
        topics: topicStories
    };
    if (custom.length === 0 && topicStories.length === 0) { showToast('No stories to export'); return; }
    toggleImport(true);
    document.getElementById('importBox').value = JSON.stringify(allToExport);
    showToast('Copied below — save this text');
}

function toggleImport(forceOpen) {
    const area = document.getElementById('importArea');
    area.style.display = (forceOpen || area.style.display === 'none') ? 'block' : 'none';
}

function importStories() {
    const raw = document.getElementById('importBox').value.trim();
    if (!raw) { showToast('Paste story data first'); return; }
    try {
        const incoming = JSON.parse(raw);
        const existingIds = new Set(customCache.map(c => c.id));

        // Handle new format {custom: [], topics: []}
        if (incoming.custom && incoming.topics) {
            incoming.custom.forEach(s => { if (!existingIds.has(s.id)) customCache.unshift(s); });
            incoming.topics.forEach(s => { if (!existingIds.has(s.id)) customCache.unshift(s); });
        }
        // Handle old format (just array)
        else if (Array.isArray(incoming)) {
            incoming.forEach(s => { if (!existingIds.has(s.id)) customCache.unshift(s); });
        }
        else {
            throw new Error('bad');
        }

        Storage.set('osm_custom', customCache);
        showToast('Stories loaded');
        goLibrary();
    } catch (e) {
        showToast('That data could not be read');
    }
}

function openConvert() {
    hideAll();
    document.getElementById('convertView').classList.add('active');
    document.body.classList.add('surface-page');
    showNav('navAdd');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openConvertFromMenu() {
    closeSidebar();
    openConvert();
}

function copyPrompt() {
    const text = document.getElementById('nlmPrompt').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast('Prompt copied')).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Prompt copied'); } catch (e) { showToast('Select and copy manually'); }
    document.body.removeChild(ta);
}

function parseStory(text) {
    text = text.replace(/\r/g, '');
    const headers = ['CATEGORY','TITLE','DETAIL','STORY','SUMMARY','LESSON'];
    const re = new RegExp('^[\\s>*#\\-]*(' + headers.join('|') + ')\\s*[:\\-]\\s*', 'gmi');
    const marked = text.replace(re, '$1');
    const parts = marked.split('');
    const out = {};
    for (let i = 1; i < parts.length - 1; i += 2) {
        const key = parts[i].trim().toUpperCase();
        const val = (parts[i + 1] || '').trim();
        out[key] = val;
    }
    return {
        kicker: out.CATEGORY || '',
        title: out.TITLE || '',
        meta: out.DETAIL || '',
        bodyRaw: out.STORY || '',
        summary: out.SUMMARY || '',
        angle: out.LESSON || ''
    };
}

function doConvert() {
    const raw = document.getElementById('convertBox').value.trim();
    if (!raw) { showToast('Paste the story first'); return; }
    const p = parseStory(raw);
    if (!p.title && !p.bodyRaw) {
        showToast('Could not read it — check the labels');
        return;
    }
    document.getElementById('addKicker').value = p.kicker;
    document.getElementById('addTitle').value = p.title;
    document.getElementById('addMeta').value = p.meta;
    document.getElementById('addBody').value = p.bodyRaw;
    document.getElementById('addSummary').value = p.summary;
    document.getElementById('addAngle').value = p.angle;
    document.getElementById('convertBox').value = '';
    openAdd();
    showToast('Converted — review, then add');
}

function openShelf() {
    hideAll();
    renderShelf();
    document.getElementById('shelfView').classList.add('active');
    showNav('navShelf');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openShelfFromMenu() {
    closeSidebar();
    openShelf();
}

function relativeTime(ms) {
    if (!ms || isNaN(ms)) return 'recently';
    const d = Math.floor((Date.now() - ms) / 86400000);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 7) return d + 'd ago';
    if (d < 30) return Math.floor(d / 7) + 'w ago';
    if (d < 365) return Math.floor(d / 30) + 'mo ago';
    return Math.floor(d / 365) + 'y ago';
}

function renderShelf() {
    const kept = getKept();
    const list = document.getElementById('shelfList');
    const sub = document.getElementById('shelfSub');
    const kicker = document.getElementById('shelfKicker');
    const filtersEl = document.getElementById('shelfFilters');
    const indexEl = document.getElementById('knowledgeIndex');
    const dueIds = new Set(getDueReviews().map(r => r.keptId));

    // Tally entries per category
    const counts = {};
    kept.forEach(k => { if (k.category) counts[k.category] = (counts[k.category] || 0) + 1; });
    const cats = Object.keys(counts);

    if (kicker) {
        kicker.textContent = 'Field Notes · ' + kept.length + ' ' + (kept.length === 1 ? 'entry' : 'entries')
            + ' · ' + cats.length + ' ' + (cats.length === 1 ? 'category' : 'categories');
    }
    if (sub) {
        const dueN = kept.filter(k => dueIds.has(k.storyId)).length;
        sub.textContent = dueN ? dueN + ' due for review' : '';
    }

    if (kept.length === 0) {
        if (filtersEl) filtersEl.innerHTML = '';
        if (indexEl) indexEl.innerHTML = '';
        list.innerHTML = '<div class="shelf-empty">Nothing kept yet.<br>Read a story and draw a lesson — it lands here.</div>';
        return;
    }

    // Keep the active filter valid if its category just emptied
    if (currentShelfFilter !== 'All' && !counts[currentShelfFilter]) currentShelfFilter = 'All';

    // Filter bar: "All" plus one button per category that has entries
    if (filtersEl) {
        let fh = '<button class="filter-btn' + (currentShelfFilter === 'All' ? ' sel' : '') + '" onclick="setShelfFilter(\'All\')">All</button>';
        cats.forEach(c => {
            fh += '<button class="filter-btn' + (currentShelfFilter === c ? ' sel' : '') + '" onclick="setShelfFilter(\'' + c + '\')">' + esc(c) + '</button>';
        });
        filtersEl.innerHTML = fh;
    }

    // List (respecting the active filter; index stays the real keptCache index)
    let html = '';
    kept.forEach((s, i) => {
        if (currentShelfFilter !== 'All' && s.category !== currentShelfFilter) return;
        const due = dueIds.has(s.storyId);
        const ago = relativeTime(s.keptAt || Date.parse(s.date));
        html += '<div class="shelf-item' + (due ? ' due' : '') + '" onclick="openLessonDetail(' + i + ')">';
        html += '<button class="card-dots" onclick="openShelfMenu(' + i + ',event)" aria-label="Options"><span></span><span></span><span></span></button>';
        html += '<div class="shelf-lesson">' + esc(s.lesson) + '</div>';
        html += '<div class="shelf-meta">' + (due ? '<span class="due-tag">Due</span>' : '') + (s.category ? '<span class="cat-tag">' + esc(s.category) + '</span>' : '') + esc(s.title) + ' · kept ' + ago + '</div>';
        if (s.followUp && s.followUp.trim()) {
            html += '<div class="shelf-connection"><div class="cl">Personal connection</div><div class="ct">' + esc(s.followUp) + '</div></div>';
        }
        html += '</div>';
    });
    list.innerHTML = html;

    // Knowledge index: every used category with its count (always visible)
    if (indexEl) {
        if (cats.length) {
            let ih = '<div class="index-title">Your Knowledge Index</div>';
            cats.forEach(c => {
                ih += '<button class="index-row" onclick="setShelfFilter(\'' + c + '\')"><span class="index-cat">' + esc(c) + '</span><span class="index-count">' + counts[c] + '</span></button>';
            });
            indexEl.innerHTML = ih;
        } else {
            indexEl.innerHTML = '';
        }
    }
}

function setShelfFilter(cat) {
    currentShelfFilter = cat;
    renderShelf();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

let currentLessonIndex = null;

function openLessonDetail(i) {
    const k = keptCache[i];
    if (!k) return;
    currentLessonIndex = i;
    hideAll();

    const due = getDueReviews().some(r => r.keptId === k.storyId);
    const ago = relativeTime(k.keptAt || Date.parse(k.date));

    document.getElementById('lessonKicker').textContent = k.category || 'Kept lesson';
    document.getElementById('lessonHero').textContent = k.lesson;
    document.getElementById('lessonMeta').textContent = k.title + ' · kept ' + ago;

    // Review button only when the lesson is due
    document.getElementById('lessonReviewBtn').style.display = due ? 'block' : 'none';

    // Personal connection (Socratic answer)
    const connSec = document.getElementById('lessonConnectionSec');
    if (k.followUp && k.followUp.trim()) {
        document.getElementById('lessonConnection').textContent = k.followUp;
        connSec.style.display = 'block';
    } else {
        connSec.style.display = 'none';
    }

    // What you remembered
    const recallSec = document.getElementById('lessonRecallSec');
    if (k.recall && k.recall.trim()) {
        document.getElementById('lessonRecall').textContent = k.recall;
        recallSec.style.display = 'block';
    } else {
        recallSec.style.display = 'none';
    }

    // The story's angle
    const angleSec = document.getElementById('lessonAngleSec');
    const angle = (k.duel && k.duel.storyAngle) || '';
    if (angle && angle.trim()) {
        document.getElementById('lessonAngle').textContent = angle;
        angleSec.style.display = 'block';
    } else {
        angleSec.style.display = 'none';
    }

    // Reflections
    const refSec = document.getElementById('lessonReflectionsSec');
    if (k.reflections && k.reflections.length) {
        let rh = '';
        k.reflections.forEach(r => {
            rh += '<div class="lesson-reflection"><div class="date">' + esc(r.date) + '</div><div class="body">' + esc(r.text) + '</div></div>';
        });
        document.getElementById('lessonReflections').innerHTML = rh;
        refSec.style.display = 'block';
    } else {
        refSec.style.display = 'none';
    }

    document.getElementById('lessonView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function lessonReflect() {
    if (currentLessonIndex !== null) openReflection(currentLessonIndex);
}

function lessonRemove() {
    if (currentLessonIndex === null) return;
    removeKept(currentLessonIndex);
    showToast('Removed from shelf');
    openShelf();
}

function lessonReview() {
    const k = keptCache[currentLessonIndex];
    if (k) reviewLesson(k.storyId);
}

function removeKept(i) {
    keptCache.splice(i, 1);
    Storage.set('osm_kept', keptCache);
    renderShelf();
    updateKeptCount();
}

function openReflection(i) {
    const kept = keptCache[i];
    if (!kept) return;

    document.getElementById('reflectionKeptIndex').value = i;
    document.getElementById('reflectionTitle').textContent = esc(kept.title);
    document.getElementById('reflectionOriginal').textContent = esc(kept.lesson);
    document.getElementById('reflectionInput').value = '';
    document.getElementById('reflectionInput').focus();

    hideAll();
    document.getElementById('reflectionView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveReflection() {
    const index = parseInt(document.getElementById('reflectionKeptIndex').value);
    const text = document.getElementById('reflectionInput').value.trim();

    if (!text) { showToast('Add what changed'); return; }

    const kept = keptCache[index];
    if (!kept) return;

    if (!kept.reflections) kept.reflections = [];
    kept.reflections.push({
        date: new Date().toLocaleDateString(),
        text: text
    });

    Storage.set('osm_kept', keptCache);
    showToast('Reflection added');
    openShelf();
}

function openAccuracyCheck(index) {
    const kept = keptCache[index];
    if (!kept || !kept.duel) return;

    document.getElementById('accuracyIndex').value = index;
    document.getElementById('accuracyYourLesson').textContent = esc(kept.duel.yourLesson);
    document.getElementById('accuracyStoryAngle').textContent = esc(kept.duel.storyAngle);
    document.getElementById('accuracyDuelWinner').textContent = kept.duel.winner === 'you' ? 'You' : kept.duel.winner === 'story' ? 'Story' : 'Tie';

    hideAll();
    document.getElementById('accuracyView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveAccuracyCheck(isAccurate) {
    const index = parseInt(document.getElementById('accuracyIndex').value);
    const kept = keptCache[index];
    if (!kept || !kept.duel) return;

    kept.duel.verified = true;
    kept.duel.accuracy = isAccurate;
    kept.duel.verifyDate = new Date().toLocaleDateString();

    Storage.set('osm_kept', keptCache);
    showToast(isAccurate ? 'Your intuition was right' : 'Story angle was better');
    openShelf();
}

function calculateDuelStats() {
    let totalDuels = 0;
    let yourWins = 0;
    let storyWins = 0;
    let ties = 0;
    let verifiedDuels = 0;
    let correctPredictions = 0;
    const byTheme = {};

    keptCache.forEach(k => {
        if (k.duel) {
            totalDuels++;
            if (k.duel.winner === 'you') yourWins++;
            else if (k.duel.winner === 'story') storyWins++;
            else ties++;

            if (k.duel.verified) {
                verifiedDuels++;
                if (k.duel.accuracy) correctPredictions++;
            }
        }
    });

    const accuracy = verifiedDuels > 0 ? Math.round((correctPredictions / verifiedDuels) * 100) : 0;
    const winRate = totalDuels > 0 ? Math.round((yourWins / totalDuels) * 100) : 0;

    return { totalDuels, yourWins, storyWins, ties, accuracy, verifiedDuels, correctPredictions, winRate };
}

function openSettings() {
    hideAll();
    document.getElementById('settingsView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openStats() {
    hideAll();
    renderStats();
    document.getElementById('statsView').classList.add('active');
    showNav('navStats');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFavorites() {
    hideAll();
    renderFavorites();
    document.getElementById('favoritesView').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStats() {
    document.getElementById('streakNum').textContent = statsCache.currentStreak;
    document.getElementById('storiesNum').textContent = statsCache.storiesRead;
    document.getElementById('lessonsNum').textContent = statsCache.lessonsWritten;
    document.getElementById('timeNum').textContent = (statsCache.totalReadingTime / 60).toFixed(1);

    // Difficulty breakdown
    const diffStats = getReviewStats();
    let diffHtml = '<div style="margin-bottom:20px;padding:16px;background:var(--surface-2);border-radius:8px;">';
    diffHtml += '<div style="font-weight:700;margin-bottom:12px;">Lesson Difficulty</div>';
    diffHtml += '<div style="display:flex;justify-content:space-around;text-align:center;">';
    diffHtml += '<div><div style="font-size:0.8em;color:var(--muted);">Easy: ' + diffStats.easyCount + '</div></div>';
    diffHtml += '<div><div style="font-size:0.8em;color:var(--muted);">Medium: ' + diffStats.mediumCount + '</div></div>';
    diffHtml += '<div><div style="font-size:0.8em;color:var(--muted);">Hard: ' + diffStats.hardCount + '</div></div>';
    diffHtml += '</div></div>';
    document.getElementById('reviewsList').insertAdjacentHTML('beforebegin', diffHtml);

    // Retention by lesson
    let retentionHtml = '<div style="margin-bottom:20px;"><div style="font-weight:700;margin-bottom:12px;">Retention Tracking</div>';
    keptCache.slice(0, 5).forEach(k => {
        const avg = getAvgRetention(k.storyId);
        retentionHtml += '<div style="padding:10px;background:var(--surface-2);border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;">';
        retentionHtml += '<span>' + esc(k.title.substring(0, 30)) + '...</span>';
        retentionHtml += '<span style="color:var(--accent);font-weight:700;">' + avg + '%</span>';
        retentionHtml += '</div>';
    });
    retentionHtml += '</div>';
    document.getElementById('reviewsList').insertAdjacentHTML('beforebegin', retentionHtml);

    // Duel portfolio
    const duelStats = calculateDuelStats();
    let duelHtml = '<div style="margin-bottom:20px;padding:16px;background:var(--surface-2);border-radius:8px;">';
    duelHtml += '<div style="font-weight:700;margin-bottom:12px;">Wisdom Portfolio</div>';
    duelHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">';
    duelHtml += '<div><div style="font-size:0.8em;color:var(--muted);">Duels</div><div style="font-size:1.5em;font-weight:700;">' + duelStats.totalDuels + '</div></div>';
    duelHtml += '<div><div style="font-size:0.8em;color:var(--muted);">Your Wins</div><div style="font-size:1.5em;font-weight:700;color:#6b9542;">' + duelStats.yourWins + '</div></div>';
    duelHtml += '<div><div style="font-size:0.8em;color:var(--muted);">Accuracy</div><div style="font-size:1.5em;font-weight:700;color:#8B5A3C;">' + duelStats.accuracy + '%</div></div>';
    duelHtml += '<div><div style="font-size:0.8em;color:var(--muted);">Verified</div><div style="font-size:1.5em;font-weight:700;">' + duelStats.verifiedDuels + '</div></div>';
    duelHtml += '</div>';
    if (duelStats.accuracy > 0) {
        duelHtml += '<div style="font-size:0.85em;color:var(--muted);">You were right ' + duelStats.correctPredictions + ' out of ' + duelStats.verifiedDuels + ' times</div>';
    }
    duelHtml += '</div>';
    document.getElementById('reviewsList').insertAdjacentHTML('beforebegin', duelHtml);

    // Due reviews
    const dueReviews = getDueReviews();
    const reviewsList = document.getElementById('reviewsList');
    if (dueReviews.length === 0) {
        reviewsList.innerHTML = '<div style="font-style:italic;color:var(--muted);">No lessons due for review yet</div>';
    } else {
        let html = '<div style="font-weight:700;margin-bottom:12px;">Reviews Due (' + dueReviews.length + ')</div>';
        dueReviews.forEach((r, i) => {
            const kept = keptCache.find(k => k.storyId === r.keptId);
            if (kept) {
                html += '<div style="padding:12px;background:var(--surface-2);border-radius:6px;margin-bottom:8px;">';
                html += '<div style="font-weight:700;margin-bottom:4px;">' + esc(kept.title) + '</div>';
                html += '<div style="font-size:0.8em;color:var(--muted);margin-bottom:6px;">Difficulty: <strong>' + (kept.difficulty || 'unknown') + '</strong></div>';
                html += '<button class="btn btn-primary" style="width:100%;font-size:0.8em;" onclick="reviewLesson(\'' + r.keptId + '\')">Review Now</button>';
                html += '</div>';
            }
        });
        reviewsList.innerHTML = html;
    }
}

function renderFavorites() {
    const favorites = getFavorites();
    const list = document.getElementById('favoritesList');
    if (favorites.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:#9a8b7c;font-style:italic;padding:30px 10px;">No favorites yet.<br>Add favorites while reading.';
        return;
    }
    let html = '';
    favorites.forEach(f => {
        html += '<div class="lib-item" onclick="openStory(\'' + f.storyId + '\')">';
        html += '<h3>' + esc(f.title) + '</h3>';
        html += '<div class="lib-meta">Favorited ' + f.date + '</div>';
        html += '<button class="btn btn-ghost" style="width:100%;margin-top:10px;font-size:0.8em;" onclick="event.stopPropagation();toggleFavorite(\'' + f.storyId + '\')">Remove</button>';
        html += '</div>';
    });
    list.innerHTML = html;
}

function toggleFavoriteCurrent() {
    if (!currentStory) return;
    toggleFavorite(currentStory.id);
    const btn = document.getElementById('favoriteBtn');
    if (isFavorite(currentStory.id)) {
        btn.textContent = 'Remove from favorites';
        btn.style.color = 'var(--accent)';
    } else {
        btn.textContent = 'Add to favorites';
        btn.style.color = 'inherit';
    }
}

function reviewLesson(storyId) {
    const kept = keptCache.find(k => k.storyId === storyId);
    if (!kept) return;
    openStory(storyId);
}

function recordAndReview(retentionScore) {
    if (currentStory) {
        recordReviewRetention(currentStory.id, retentionScore);
        goLibrary();
    }
}

function openSettingsFromMenu() {
    closeSidebar();
    openSettings();
}

function openStatsFromMenu() {
    closeSidebar();
    openStats();
}

function openFavoritesFromMenu() {
    closeSidebar();
    openFavorites();
}

function setTextSize(size) {
    document.documentElement.style.fontSize =
        size === 'small' ? '14px' :
        size === 'large' ? '18px' :
        '16px';
    localStorage.setItem('textSize', size);
    updateSettingsUI();
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
    updateSettingsUI();
}

function setFont(font) {
    const bodyFont = font === 'serif' ? 'var(--serif)' : 'var(--display)';
    const storyBody = document.querySelector('.story-body');
    if (storyBody) storyBody.style.fontFamily = bodyFont;
    localStorage.setItem('font', font);
    updateSettingsUI();
}

function setLineHeight(height) {
    const storyBody = document.querySelector('.story-body');
    if (storyBody) storyBody.style.lineHeight = height;
    localStorage.setItem('lineHeight', height);
    updateSettingsUI();
}

function setLetterSpacing(spacing) {
    const storyBody = document.querySelector('.story-body');
    if (storyBody) storyBody.style.letterSpacing = spacing;
    localStorage.setItem('letterSpacing', spacing);
    updateSettingsUI();
}

function setTextAlign(align) {
    const storyBody = document.querySelector('.story-body');
    if (storyBody) storyBody.style.textAlign = align;
    localStorage.setItem('textAlign', align);
    updateSettingsUI();
}

function applyTextSettings() {
    const storyBody = document.querySelector('.story-body');
    if (!storyBody) return;

    const font = localStorage.getItem('font') || 'serif';
    const lineHeight = localStorage.getItem('lineHeight') || '1.8';
    const letterSpacing = localStorage.getItem('letterSpacing') || 'normal';
    const textAlign = localStorage.getItem('textAlign') || 'left';

    storyBody.style.fontFamily = font === 'serif' ? 'var(--serif)' : 'var(--display)';
    storyBody.style.lineHeight = lineHeight;
    storyBody.style.letterSpacing = letterSpacing;
    storyBody.style.textAlign = textAlign;
}

function clearAllData() {
    if (confirm('Are you sure? This will delete all your stories and kept lessons.')) {
        localStorage.clear();
        customCache = [];
        keptCache = [];
        updateKeptCount();
        showToast('All data cleared');
        goLibrary();
    }
}

function updateSettingsUI() {
    const textSize = localStorage.getItem('textSize') || 'default';
    const theme = localStorage.getItem('theme') || 'light';
    const nightMode = localStorage.getItem('nightMode') === 'true';
    const font = localStorage.getItem('font') || 'serif';
    const lineHeight = localStorage.getItem('lineHeight') || '1.8';
    const letterSpacing = localStorage.getItem('letterSpacing') || 'normal';
    const textAlign = localStorage.getItem('textAlign') || 'left';

    const segIds = ['sizeSmall','sizeDefault','sizeLarge','themeLight','themeDark',
        'nightOff','nightOn','fontSerif','fontSans','lineSmall','lineDefault','lineLarge',
        'letterNormal','letterWide','alignLeft','alignJustify'];
    segIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.background = 'transparent';
        el.style.color = '';
        el.style.borderColor = '';
    });
    const sel = id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.background = 'var(--accent)';
        el.style.color = '#fff';
        el.style.borderColor = 'var(--accent)';
    };

    if (textSize === 'small') sel('sizeSmall');
    else if (textSize === 'large') sel('sizeLarge');
    else sel('sizeDefault');

    sel(theme === 'dark' ? 'themeDark' : 'themeLight');
    sel(nightMode ? 'nightOn' : 'nightOff');
    sel(font === 'serif' ? 'fontSerif' : 'fontSans');

    if (lineHeight === '1.5') sel('lineSmall');
    else if (lineHeight === '2.2') sel('lineLarge');
    else sel('lineDefault');

    sel(letterSpacing === '0.5px' ? 'letterWide' : 'letterNormal');
    sel(textAlign === 'justify' ? 'alignJustify' : 'alignLeft');
}

function roman(n) {
    const map = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    let r = '';
    for (const [v, sym] of map) { while (n >= v) { r += sym; n -= v; } }
    return r;
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1900); }

initStorage();

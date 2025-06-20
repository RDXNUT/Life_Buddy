// ===================================================================
// ========================= START OF FILE ===========================
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // ====================== 1. FIREBASE SETUP ==========================
    // ===================================================================
    
    // !!!!!! นี่คือจุดเดียวที่คุณต้องแก้ไขด้วยตัวเอง !!!!!!
    // !!!!!! ให้ไปคัดลอก Config ของจริงจาก Firebase Console มาวางทับตรงนี้ !!!!!!
    // (ไปที่ Project Settings > General > Your Apps > เลือก "CDN" แล้วคัดลอก Object มา)
    const firebaseConfig = {
      apiKey: "AIzaSyBUs0Gqhv0P1Up-vDz1HE9iFfaZr0bAEms", // <--- วางทับค่านี้
      authDomain: "life-buddy-xok07.firebaseapp.com",    // <--- วางทับค่านี้
      projectId: "life-buddy-xok07",                      // <--- วางทับค่านี้
      storageBucket: "life-buddy-xok07.firebasestorage.app", // <--- วางทับค่านี้
      messagingSenderId: "243239137119",                  // <--- วางทับค่านี้
      appId: "1:243239137119:web:2baf84c64caddf211ad0ea"   // <--- วางทับค่านี้
    };
  
    // เริ่มต้นการเชื่อมต่อ Firebase
    // โค้ดส่วนนี้จะทำงานได้ก็ต่อเมื่อ firebaseConfig ถูกต้อง
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    
    // ===================================================================
    // ====================== 2. GLOBAL STATE & CONSTANTS ================
    // ===================================================================
    
    let currentUser = null;
    let state = {};
    const defaultActivities = ["เขียนสิ่งที่ขอบคุณวันนี้ 3 อย่าง", "ยืดเส้น 3 นาที", "โทรหาเพื่อนคนหนึ่ง", "จดไอเดียเรื่องที่สนใจ", "จัดโต๊ะทำงาน"];
    const levelCaps = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
    const initialState = {
        exp: 0, streak: 0, lastCheckIn: null, todos: [], planner: {}, revisitTopics: [], moods: {},
        focus: { totalSessions: 0, todaySessions: 0, lastFocusDate: null },
        badges: { focus10: false, plan5: false, mood7: false, review20: false },
        settings: { theme: 'light', focusDuration: 25, breakDuration: 5 },
        userActivities: [...defaultActivities],
        profile: { gender: 'unspecified', age: '', bio: '' }
    };
    let timerInterval, timeLeft, isFocusing = true;
    let currentPlannerDate = dayjs(), selectedPlannerDate = dayjs().format('YYYY-MM-DD');
    let currentMoodDate = dayjs(), selectedMoodDate = dayjs().format('YYYY-MM-DD');
    let currentQuizTopic = null, shuffledFlashcards = [], currentCardIndex = 0;
    let toastTimeout;
    let areListenersSetup = false;
    const allPages = document.querySelectorAll('.page');
    const allNavLinks = document.querySelectorAll('.nav-link');

    // ===================================================================
    // ====================== 3. APP INITIALIZATION FLOW =================
    // ===================================================================

    auth.onAuthStateChanged(async (user) => {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.opacity = '1';

        if (user) {
            currentUser = user;
            state = await loadStateFromFirestore(user.uid);
        } else {
            currentUser = null;
            state = JSON.parse(JSON.stringify(initialState));
        }
        runApp();
    });

    async function loadStateFromFirestore(userId) {
        try {
            const docRef = db.collection('users').doc(userId);
            const doc = await docRef.get();
            if (doc.exists) {
                console.log("โหลดข้อมูลจาก Firestore สำเร็จ");
                const loadedData = doc.data();
                const mergedState = deepMerge(JSON.parse(JSON.stringify(initialState)), loadedData);
                if (!mergedState.userActivities || mergedState.userActivities.length === 0) {
                    mergedState.userActivities = [...defaultActivities];
                }
                return mergedState;
            } else {
                console.log("ไม่พบข้อมูลผู้ใช้เก่า, สร้างข้อมูลเริ่มต้นใหม่");
                const freshState = JSON.parse(JSON.stringify(initialState));
                await db.collection('users').doc(userId).set(freshState);
                return freshState;
            }
        } catch (error) {
            console.error("Error loading state from Firestore:", error);
            return JSON.parse(JSON.stringify(initialState));
        }
    }

    function runApp() {
        if (!areListenersSetup) {
            setupAllEventListeners();
            areListenersSetup = true;
        }
        updateUIForLoginStatus();
        applySettings();
        checkDailyReset();
        renderAllUI();
        
        const hash = window.location.hash.substring(1);
        const activePageId = document.querySelector('.page.active')?.id.replace('-page', '') || hash || 'home';
        showPage(activePageId);

        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.classList.add('hidden'), 500);
    }

    // ===================================================================
    // ====================== 4. CORE FUNCTIONS ==========================
    // ===================================================================
    
    function saveState() {
        if (!currentUser) {
            showToast("เข้าสู่ระบบเพื่อบันทึกข้อมูลของคุณ");
            return;
        }
        checkBadges();
        db.collection('users').doc(currentUser.uid).set(state, { merge: true })
            .then(() => {
                console.log("บันทึกข้อมูลลง Firestore สำเร็จ!");
            })
            .catch(error => console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล: ", error));
    }
    
    window.showPage = (pageId) => {
        if (!pageId) pageId = 'home';
        if ((pageId === 'profile' || pageId === 'rewards' || pageId === 'settings') && !currentUser) {
            openAuthModal();
            return;
        }
        allPages.forEach(p => p.classList.toggle('active', p.id === `${pageId}-page`));
        allNavLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
        
        if (history.pushState) {
            history.pushState(null, null, `#${pageId}`);
        } else {
            location.hash = `#${pageId}`;
        }

        const renderMap = {
            planner: () => renderPlannerCalendar(dayjs()),
            revisit: renderRevisitList,
            mood: () => renderMoodCalendar(dayjs()),
            profile: renderProfilePage
        };
        renderMap[pageId]?.();
        
        feather.replace();
        closeSidebar();
    }
    
    function closeSidebar() {
        document.getElementById('sidebar').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }

    function applySettings() {
        if(!state.settings) state.settings = initialState.settings;
        document.body.dataset.theme = state.settings.theme;
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        const activeThemeBtn = document.getElementById(`theme-${state.settings.theme}-btn`);
        if (activeThemeBtn) activeThemeBtn.classList.add('active');
        document.getElementById('focus-duration').value = state.settings.focusDuration;
        document.getElementById('break-duration').value = state.settings.breakDuration;
    }
    
    function checkDailyReset() {
        if (!state.focus) state.focus = initialState.focus;
        const todayStr = dayjs().format('YYYY-MM-DD');
        if (state.focus.lastFocusDate !== todayStr) {
            state.focus.todaySessions = 0;
            state.focus.lastFocusDate = todayStr;
        }
    }

    function renderAllUI() {
        updateHeaderUI();
        updateHomePageUI();
        updateRewardsUI();
        updateSettingsUI();
    }

    // ===================================================================
    // ====================== 5. UI UPDATE & HELPER FUNCTIONS ============
    // ===================================================================

    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => { toast.classList.add('hidden'); }, 3000);
    }
    
    function updateUIForLoginStatus() {
        if (currentUser) {
            const userEmailName = currentUser.email ? currentUser.email.split('@')[0] : 'user';
            const displayName = currentUser.displayName || userEmailName;
            const avatarUrl = currentUser.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random&color=fff`;
            
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('user-profile').classList.remove('hidden');
            document.getElementById('user-photo').src = avatarUrl;
        } else {
            document.getElementById('auth-container').classList.remove('hidden');
            document.getElementById('user-profile').classList.add('hidden');
        }
        closeAuthModal();
    }

    function updateHeaderUI() {
        document.getElementById('exp-display').innerHTML = `<i data-feather="star"></i> ${state.exp || 0} EXP`;
        document.getElementById('streak-display').innerHTML = `🔥 ${state.streak || 0}`;
        const checkInBtn = document.getElementById('check-in-btn');
        if (state.lastCheckIn === dayjs().format('YYYY-MM-DD')) {
            checkInBtn.textContent = 'เช็คอินแล้ว'; checkInBtn.disabled = true;
        } else {
            checkInBtn.textContent = 'เช็คอิน'; checkInBtn.disabled = false;
        }
        feather.replace();
    }
    
    function updateHomePageUI() {
        updateHeaderUI();
        const todayStr = dayjs().format('YYYY-MM-DD');
        const tasksList = document.getElementById('today-tasks-summary');
        tasksList.innerHTML = (state.planner && state.planner[todayStr] || []).map(t => `<li>${t.time} - ${t.name}</li>`).join('') || '<li>ไม่มีงานสำหรับวันนี้</li>';
        const revisitList = document.getElementById('today-revisit-summary');
        const dueTopics = (state.revisitTopics || []).filter(t => dayjs(t.nextReviewDate).isSame(dayjs(), 'day'));
        revisitList.innerHTML = dueTopics.map(t => `<li>${t.name}</li>`).join('') || '<li>ไม่มีหัวข้อต้องทบทวน</li>';
        document.getElementById('today-focus-count').textContent = state.focus ? state.focus.todaySessions : 0;
        const todoList = document.getElementById('todo-list');
        todoList.innerHTML = (state.todos || []).map(todo => `<li class="${todo.completed ? 'completed' : ''}"><input type="checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}><span>${todo.text}</span></li>`).join('');
    }

    function updateRewardsUI() {
        if (!currentUser) {
            document.getElementById('total-exp-display').textContent = 0;
            document.getElementById('badges-container').innerHTML = '';
            return;
        }
        document.getElementById('total-exp-display').textContent = state.exp || 0;
        const container = document.getElementById('badges-container');
        const badgeData = [
            { id: 'focus10', title: 'นักโฟกัสหน้าใหม่', desc: 'โฟกัสครบ 10 รอบ', icon: '🎯' }, { id: 'plan5', title: 'นักวางแผนตัวยง', desc: 'สร้างตารางงานครบ 5 วัน', icon: '🏆' }, { id: 'mood7', title: 'จิตใจเบิกบาน', desc: 'บันทึกอารมณ์ต่อเนื่อง 7 วัน', icon: '😊' }, { id: 'review20', title: 'ยอดนักทบทวน', desc: 'ทบทวนบทเรียนครบ 20 ครั้ง', icon: '📚' }
        ];
        container.innerHTML = badgeData.map(badge => {
            const unlocked = state.badges && state.badges[badge.id];
            return `<div class="badge-card"><div class="badge-icon">${badge.icon}</div><div class="badge-title">${badge.title}</div><div class="badge-desc">${badge.desc}</div><div class="badge-status ${unlocked ? 'unlocked' : 'locked'}">${unlocked ? 'ปลดล็อกแล้ว' : 'ล็อกอยู่'}</div></div>`;
        }).join('');
    }
    
    function updateSettingsUI() {
        if (!currentUser) {
            document.getElementById('current-level').textContent = `Level 1`;
            document.getElementById('exp-progress-text').textContent = `0 / ${levelCaps[0]}`;
            document.getElementById('exp-progress-bar').style.width = `0%`;
            return;
        };
        if (typeof state.exp === 'undefined') state.exp = 0;
        let currentLevel = 1, expForNextLevel = levelCaps[0], expInCurrentLevel = state.exp, prevLevelsTotalExp = 0;
        for (let i = 0; i < levelCaps.length; i++) {
            if (state.exp >= prevLevelsTotalExp + levelCaps[i]) {
                prevLevelsTotalExp += levelCaps[i]; currentLevel++;
            } else {
                expForNextLevel = levelCaps[i]; expInCurrentLevel = state.exp - prevLevelsTotalExp; break;
            }
        }
        if (currentLevel > levelCaps.length) { expInCurrentLevel = expForNextLevel; }
        const progress = Math.min(100, (expInCurrentLevel / expForNextLevel) * 100);
        document.getElementById('current-level').textContent = `Level ${currentLevel}`;
        document.getElementById('exp-progress-text').textContent = `${expInCurrentLevel} / ${expForNextLevel}`;
        document.getElementById('exp-progress-bar').style.width = `${progress}%`;
    }

    function addExp(amount) {
        if(typeof state.exp === 'undefined') state.exp = 0;
        state.exp += amount;
        showToast(`ได้รับ ${amount} EXP!`);
        updateHeaderUI();
        updateSettingsUI();
    }

    function checkBadges() {
        if(!currentUser) return;
        if(!state.planner || !state.revisitTopics) return;
        let uniquePlannerDays = new Set(Object.keys(state.planner).filter(key => state.planner[key].length > 0));
        let moodStreak = 0;
        let sortedMoodDays = Object.keys(state.moods || {}).sort((a,b) => b.localeCompare(a));
        for(let i = 0; i < sortedMoodDays.length; i++) {
            if (i === 0 || dayjs(sortedMoodDays[i]).add(1, 'day').isSame(dayjs(sortedMoodDays[i-1]), 'day')) {
                moodStreak++;
            } else { break; }
        }
        if(!state.badges) state.badges = {};
        if(!state.focus) state.focus = { totalSessions: 0 };
        state.badges.focus10 = (state.focus.totalSessions || 0) >= 10;
        state.badges.plan5 = uniquePlannerDays.size >= 5;
        state.badges.mood7 = moodStreak >= 7;
        let totalReviews = (state.revisitTopics || []).reduce((sum, topic) => sum + (topic.reviewCount || 0), 0);
        state.badges.review20 = totalReviews >= 20;
    }

    function deepMerge(target, source) {
        const output = { ...target };
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
    
    // ===================================================================
    // ====================== 6. FEATURE-SPECIFIC FUNCTIONS ==============
    // ===================================================================
    
    window.renderPlannerCalendar = (date) => {
        currentPlannerDate = date;
        document.getElementById('planner-month-year').textContent = date.format('MMMM YYYY');
        const calendarEl = document.getElementById('planner-calendar');
        calendarEl.innerHTML = '';
        const monthStart = date.startOf('month'), startDay = monthStart.day(), daysInMonth = date.daysInMonth();
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`);
        for (let i = 0; i < startDay; i++) calendarEl.innerHTML += '<div></div>';
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div'); dayElem.className = 'calendar-day'; dayElem.textContent = i;
            const currentDate = date.date(i), dateStr = currentDate.format('YYYY-MM-DD');
            if (currentDate.isSame(dayjs(), 'day')) dayElem.classList.add('today');
            if (dateStr === selectedPlannerDate) dayElem.classList.add('selected');
            if (state.planner && state.planner[dateStr]?.length > 0) dayElem.innerHTML += '<div class="event-dot"></div>';
            dayElem.addEventListener('click', () => { selectedPlannerDate = dateStr; renderPlannerCalendar(date); });
            calendarEl.appendChild(dayElem);
        }
        renderPlannerDetails(selectedPlannerDate);
    };
    function renderPlannerDetails(dateStr) {
        document.getElementById('selected-planner-date-display').textContent = `สำหรับวันที่ ${dayjs(dateStr).format('D MMMM')}`;
        const list = document.getElementById('events-list');
        list.innerHTML = (state.planner[dateStr] || []).sort((a,b) => a.time.localeCompare(b.time)).map(e => `<li><strong>${e.time}</strong> - ${e.name} (${e.category})</li>`).join('') || '<li>ไม่มีกิจกรรม</li>';
    }

    window.renderRevisitList = () => {
        const listEl = document.getElementById('revisit-due-list');
        const dueTopics = (state.revisitTopics || []).filter(t => dayjs(t.nextReviewDate).isSame(dayjs(), 'day'));
        listEl.innerHTML = dueTopics.map(topic => `<li><span>${topic.name}</span><button class="small-btn" onclick="startReviewSession(${topic.id})">เริ่มทบทวน</button></li>`).join('') || '<li>ไม่มีหัวข้อต้องทบทวนวันนี้!</li>';
    }
    window.startReviewSession = (topicId) => {
        currentQuizTopic = state.revisitTopics.find(t => t.id === topicId);
        if (!currentQuizTopic) return;
        document.getElementById('revisit-main-view').classList.add('hidden');
        document.getElementById('flashcard-view').classList.remove('hidden');
        document.getElementById('flashcard-topic-title').textContent = currentQuizTopic.name;
        document.getElementById('flashcard-topic-notes').textContent = currentQuizTopic.notes || "ไม่มีโน้ตย่อ";
        document.getElementById('flashcard-topic-id').value = topicId;
        shuffledFlashcards = [...(currentQuizTopic.flashcards || [])].sort(() => 0.5 - Math.random());
        currentCardIndex = 0;
        if(shuffledFlashcards.length > 0) { displayNextFlashcard(); } else { alert("ยังไม่มี Flashcard ในหัวข้อนี้ กรุณาเพิ่มก่อน"); document.getElementById('flashcard-quiz').classList.add('hidden'); }
    }
    function displayNextFlashcard() {
        document.getElementById('flashcard-quiz').classList.remove('hidden');
        if (currentCardIndex >= shuffledFlashcards.length) { finishQuiz(); return; }
        const card = shuffledFlashcards[currentCardIndex];
        const flashcardEl = document.querySelector('.flashcard');
        flashcardEl.classList.remove('flipped');
        document.getElementById('quiz-question').textContent = card.q;
        document.getElementById('quiz-answer').textContent = card.a;
        document.getElementById('reveal-answer-btn').classList.remove('hidden');
        document.getElementById('quiz-feedback-btns').classList.add('hidden');
    }
    function finishQuiz() {
        alert('ทบทวนหัวข้อนี้เสร็จแล้ว! เก่งมาก!');
        const intervals = [1, 3, 7, 14, 30, 60];
        currentQuizTopic.level = Math.min((currentQuizTopic.level || 0) + 1, intervals.length - 1);
        currentQuizTopic.nextReviewDate = dayjs().add(intervals[currentQuizTopic.level], 'day').format('YYYY-MM-DD');
        currentQuizTopic.reviewCount = (currentQuizTopic.reviewCount || 0) + 1;
        addExp(20);
        saveState();
        document.getElementById('back-to-revisit-list').click();
    }

    function updateTimerDisplay(time) {
        const minutes = Math.floor(time / 60); const seconds = time % 60;
        document.getElementById('timer-display').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    window.renderMoodCalendar = (date) => {
        currentMoodDate = date;
        document.getElementById('mood-month-year').textContent = date.format('MMMM YYYY');
        const calendarEl = document.getElementById('mood-calendar');
        calendarEl.innerHTML = '';
        const monthStart = date.startOf('month'), startDay = monthStart.day(), daysInMonth = date.daysInMonth();
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`);
        for (let i = 0; i < startDay; i++) calendarEl.innerHTML += '<div></div>';
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div'); dayElem.className = 'calendar-day'; dayElem.textContent = i;
            const currentDate = date.date(i), dateStr = currentDate.format('YYYY-MM-DD');
            if (currentDate.isSame(dayjs(), 'day')) dayElem.classList.add('today');
            if (dateStr === selectedMoodDate) dayElem.classList.add('selected');
            const moodEntry = state.moods && state.moods[dateStr];
            if (moodEntry) {
                const moodColors = { happy: '#ffcc00', excited: '#ff9500', neutral: '#8e8e93', sad: '#007aff', angry: '#ff3b30' };
                dayElem.style.backgroundColor = moodColors[moodEntry.mood]; dayElem.style.color = 'white';
            }
            dayElem.addEventListener('click', () => { selectedMoodDate = dateStr; renderMoodCalendar(date); });
            calendarEl.appendChild(dayElem);
        }
        renderMoodDetails(selectedMoodDate);
    };
    function renderMoodDetails(dateStr) {
        document.getElementById('selected-mood-date-display').textContent = dayjs(dateStr).format('D MMMM YYYY');
        const details = document.getElementById('mood-details');
        const entry = state.moods && state.moods[dateStr];
        if (entry) {
            details.innerHTML = `<p><strong>อารมณ์:</strong> ${entry.mood}</p><p><strong>บันทึก:</strong> ${entry.notes || '<em>ไม่มี</em>'}</p><p><strong>เหตุผล:</strong> ${(entry.reasons || []).join(', ') || '<em>ไม่ระบุ</em>'}</p>`;
        } else {
            details.innerHTML = '<p><i>ยังไม่มีการบันทึกสำหรับวันนี้</i></p>';
        }
    }

    function openActivityManager() {
        renderActivityList();
        document.getElementById('activity-manager-modal').classList.remove('hidden');
    }
    function closeActivityManager() {
        document.getElementById('activity-manager-modal').classList.add('hidden');
    }
    function renderActivityList() {
        const container = document.getElementById('activity-list-container');
        if (!state.userActivities) state.userActivities = [...defaultActivities];
        container.innerHTML = state.userActivities.map((activity, index) => `
            <div class="activity-item">
                <span>${activity}</span>
                <button class="delete-activity-btn" data-index="${index}" title="ลบกิจกรรม"><i data-feather="trash-2"></i></button>
            </div>`).join('');
        feather.replace();
    }
    
    function renderProfilePage() {
        if (!currentUser) return;
        const userEmailName = currentUser.email ? currentUser.email.split('@')[0] : 'user';
        const displayName = currentUser.displayName || userEmailName;
        const photoURL = currentUser.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random&color=fff`;

        document.getElementById('profile-page-photo').src = photoURL;
        document.getElementById('profile-page-name').textContent = displayName;
        document.getElementById('profile-page-email').textContent = currentUser.email;

        document.getElementById('display-name').value = currentUser.displayName || '';
        document.getElementById('gender').value = state.profile?.gender || 'unspecified';
        document.getElementById('age').value = state.profile?.age || '';
        document.getElementById('bio').value = state.profile?.bio || '';
    }

    // ===================================================================
    // ====================== 7. EVENT LISTENERS =========================
    // ===================================================================

    function setupAllEventListeners() {
        if (areListenersSetup) return;

        // --- AUTH & MODALS ---
        document.getElementById('login-btn').addEventListener('click', openAuthModal);
        document.getElementById('close-modal-btn').addEventListener('click', closeAuthModal);
        document.getElementById('auth-modal').addEventListener('click', e => { if (e.target.id === 'auth-modal') closeAuthModal(); });
        document.getElementById('logout-btn').addEventListener('click', () => auth.signOut());
        
        // --- AUTH FORM SWITCHER ---
        document.getElementById('show-signup-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('signup-view').classList.remove('hidden');
            document.getElementById('auth-error').textContent = ''; // Clear old errors
        });
        document.getElementById('show-login-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signup-view').classList.add('hidden');
            document.getElementById('login-view').classList.remove('hidden');
            document.getElementById('auth-error').textContent = ''; // Clear old errors
        });
        
        // --- AUTH ACTIONS ---
        document.getElementById('signup-form').addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value; const password = document.getElementById('signup-password').value;
            auth.createUserWithEmailAndPassword(email, password).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error));
        });
        document.getElementById('login-form').addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value;
            auth.signInWithEmailAndPassword(email, password).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error));
        });
        document.getElementById('google-signin-btn').addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error));
        });
        
        // ACTIVITY MANAGER MODAL
        document.getElementById('manage-activities-btn').addEventListener('click', openActivityManager);
        document.getElementById('close-activity-modal-btn').addEventListener('click', closeActivityManager);
        document.getElementById('activity-manager-modal').addEventListener('click', e => { if (e.target.id === 'activity-manager-modal') closeActivityManager(); });
        document.getElementById('add-activity-form').addEventListener('submit', e => {
            e.preventDefault();
            const input = document.getElementById('new-activity-input');
            const newActivity = input.value.trim();
            if (newActivity) {
                if (!state.userActivities) state.userActivities = [...defaultActivities];
                state.userActivities.push(newActivity);
                input.value = ''; renderActivityList(); saveState();
            }
        });
        document.getElementById('activity-list-container').addEventListener('click', e => {
            const deleteBtn = e.target.closest('.delete-activity-btn');
            if (deleteBtn) {
                const indexToDelete = parseInt(deleteBtn.dataset.index, 10);
                state.userActivities.splice(indexToDelete, 1);
                renderActivityList(); saveState();
            }
        });
        
        // PROFILE PAGE LISTENERS
        document.getElementById('profile-link').addEventListener('click', (e) => { e.preventDefault(); showPage('profile'); });
        document.getElementById('photo-upload').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !currentUser) return;
            const profilePhoto = document.getElementById('profile-page-photo');
            const saveBtn = document.getElementById('save-profile-btn');
            profilePhoto.style.opacity = '0.5';
            saveBtn.disabled = true;

            const filePath = `profile_pictures/${currentUser.uid}/${Date.now()}_${file.name}`;
            const fileRef = storage.ref(filePath);
            const uploadTask = fileRef.put(file);

            uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
                .then(downloadURL => currentUser.updateProfile({ photoURL: downloadURL }))
                .then(() => {
                    alert('อัปเดตรูปโปรไฟล์สำเร็จ!');
                    updateUIForLoginStatus();
                    renderProfilePage();
                })
                .catch(error => {
                    console.error('Upload failed', error);
                    alert('อัปโหลดรูปภาพไม่สำเร็จ');
                })
                .finally(() => {
                    profilePhoto.style.opacity = '1';
                    saveBtn.disabled = false;
                });
        });
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('save-profile-btn');
            const btnText = saveBtn.querySelector('.btn-text');
            const btnLoader = saveBtn.querySelector('.btn-loader');

            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
            saveBtn.disabled = true;

            const newDisplayName = document.getElementById('display-name').value;
            const newProfileData = {
                gender: document.getElementById('gender').value,
                age: document.getElementById('age').value || null,
                bio: document.getElementById('bio').value,
            };

            const updateAuthPromise = currentUser.updateProfile({ displayName: newDisplayName });
            const updateFirestorePromise = db.collection('users').doc(currentUser.uid).set({ profile: newProfileData }, { merge: true });

            Promise.all([updateAuthPromise, updateFirestorePromise])
                .then(() => {
                    if (!state.profile) state.profile = {};
                    Object.assign(state.profile, newProfileData);
                    alert('บันทึกข้อมูลโปรไฟล์สำเร็จ!');
                    updateUIForLoginStatus();
                    renderProfilePage();
                })
                .catch(error => {
                    console.error('Error updating profile:', error);
                    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                })
                .finally(() => {
                    btnText.classList.remove('hidden');
                    btnLoader.classList.add('hidden');
                    saveBtn.disabled = false;
                });
        });

        // NAVIGATION & SIDEBAR
        document.getElementById('open-menu').addEventListener('click', () => { document.getElementById('sidebar').classList.add('show'); document.getElementById('overlay').classList.add('show'); });
        document.getElementById('close-menu').addEventListener('click', closeSidebar);
        document.getElementById('overlay').addEventListener('click', closeSidebar);
        allNavLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); showPage(e.currentTarget.dataset.page); }));

        // HOME PAGE
        document.getElementById('check-in-btn').addEventListener('click', () => {
            const todayStr = dayjs().format('YYYY-MM-DD'); const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
            if (state.lastCheckIn !== todayStr) {
                state.streak = state.lastCheckIn === yesterdayStr ? (state.streak || 0) + 1 : 1;
                state.lastCheckIn = todayStr;
                addExp(40);
                updateHeaderUI();
                saveState();
            }
        });
        document.getElementById('todo-form').addEventListener('submit', e => {
            e.preventDefault();
            const input = document.getElementById('todo-input');
            if (input.value.trim()) {
                if (!state.todos) state.todos = [];
                state.todos.push({ id: Date.now(), text: input.value.trim(), completed: false });
                input.value = ''; updateHomePageUI(); saveState();
            }
        });
        document.getElementById('todo-list').addEventListener('change', e => {
            if (e.target.type === 'checkbox') {
                if (!state.todos) state.todos = [];
                const todo = state.todos.find(t => t.id === parseInt(e.target.dataset.id));
                if (todo) {
                    const wasCompleted = todo.completed; todo.completed = e.target.checked;
                    if(todo.completed && !wasCompleted) { addExp(10); }
                    updateHomePageUI(); saveState();
                }
            }
        });
        document.getElementById('random-activity-btn').addEventListener('click', () => {
            const activities = state.userActivities && state.userActivities.length > 0 ? state.userActivities : defaultActivities;
            document.getElementById('activity-suggestion').textContent = activities[Math.floor(Math.random() * activities.length)];
        });
        const advices = ["เหนื่อยได้ แต่อย่าลืมหายใจให้ลึก ๆ", "เก่งแล้วนะ ที่ยังอยู่ตรงนี้ได้", "ต้นไม้ไม่ได้โตในวันเดียว คนเราก็เช่นกัน", "ดื่มน้ำบ้างนะ วันนี้เธอทำดีแล้วล่ะ", "ใจล้า อย่าฝืน แต่ใจสู้ อย่าถอย"];
        document.getElementById('random-advice-btn').addEventListener('click', () => { document.getElementById('daily-advice').textContent = advices[Math.floor(Math.random() * advices.length)]; });

        // PLANNER PAGE
        document.getElementById('planner-prev-month').addEventListener('click', () => renderPlannerCalendar(currentPlannerDate.subtract(1, 'month')));
        document.getElementById('planner-next-month').addEventListener('click', () => renderPlannerCalendar(currentPlannerDate.add(1, 'month')));
        document.getElementById('planner-form').addEventListener('submit', e => {
            e.preventDefault();
            if(!document.getElementById('event-category').value) return alert("กรุณาเลือกหมวดหมู่");
            const newEvent = { name: document.getElementById('event-name').value, category: document.getElementById('event-category').value, time: document.getElementById('event-time').value };
            if (!state.planner) state.planner = {};
            if (!state.planner[selectedPlannerDate]) state.planner[selectedPlannerDate] = [];
            state.planner[selectedPlannerDate].push(newEvent);
            addExp(15); renderPlannerCalendar(currentPlannerDate); e.target.reset(); saveState();
        });

        // REVISIT PAGE
        document.getElementById('revisit-form').addEventListener('submit', e => {
            e.preventDefault();
            if(!state.revisitTopics) state.revisitTopics = [];
            state.revisitTopics.push({ id: Date.now(), name: document.getElementById('revisit-topic-name').value, notes: document.getElementById('revisit-topic-notes').value, level: 0, nextReviewDate: dayjs().format('YYYY-MM-DD'), flashcards: [], reviewCount: 0 });
            renderRevisitList(); e.target.reset(); saveState();
        });
        document.getElementById('back-to-revisit-list').addEventListener('click', () => {
            document.getElementById('revisit-main-view').classList.remove('hidden'); document.getElementById('flashcard-view').classList.add('hidden');
            renderRevisitList();
        });
        document.getElementById('reveal-answer-btn').addEventListener('click', () => {
            document.querySelector('.flashcard').classList.add('flipped');
            document.getElementById('reveal-answer-btn').classList.add('hidden'); document.getElementById('quiz-feedback-btns').classList.remove('hidden');
        });
        document.getElementById('quiz-understood-btn').addEventListener('click', () => { addExp(5); currentCardIndex++; displayNextFlashcard(); saveState(); });
        document.getElementById('quiz-not-understood-btn').addEventListener('click', () => { shuffledFlashcards.push(shuffledFlashcards[currentCardIndex]); currentCardIndex++; displayNextFlashcard(); });
        document.getElementById('flashcard-form').addEventListener('submit', e => {
            e.preventDefault();
            const topic = state.revisitTopics.find(t => t.id === parseInt(document.getElementById('flashcard-topic-id').value));
            if(topic) {
                if(!topic.flashcards) topic.flashcards = [];
                topic.flashcards.push({q: document.getElementById('flashcard-question').value, a: document.getElementById('flashcard-answer').value});
                alert('เพิ่ม Flashcard แล้ว!'); e.target.reset(); saveState();
            }
        });

        // FOCUS PAGE
        const startBtn = document.getElementById('start-timer-btn');
        startBtn.addEventListener('click', () => {
            if (timerInterval) {
                clearInterval(timerInterval); timerInterval = null;
                startBtn.innerHTML = '<i data-feather="play"></i> เริ่มต่อ';
            } else {
                startBtn.innerHTML = '<i data-feather="pause"></i> หยุด';
                if(!state.settings) state.settings = initialState.settings;
                timeLeft = timeLeft ?? state.settings.focusDuration * 60;
                timerInterval = setInterval(() => {
                    timeLeft--; updateTimerDisplay(timeLeft);
                    if (timeLeft < 0) {
                        clearInterval(timerInterval); timerInterval = null;
                        new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-notification-951.mp3').play();
                        if (isFocusing) {
                            if(currentUser) alert('หมดเวลาโฟกัส! พักหน่อยนะ');
                            isFocusing = false;
                            state.focus.totalSessions = (state.focus.totalSessions || 0) + 1;
                            state.focus.todaySessions = (state.focus.todaySessions || 0) + 1;
                            addExp(25);
                            timeLeft = state.settings.breakDuration * 60;
                            document.getElementById('timer-mode').textContent = 'Break';
                        } else {
                            if(currentUser) alert('หมดเวลาพัก! กลับมาโฟกัสกันต่อ');
                            isFocusing = true;
                            timeLeft = state.settings.focusDuration * 60;
                            document.getElementById('timer-mode').textContent = 'Focus';
                        }
                        updateTimerDisplay(timeLeft); startBtn.innerHTML = '<i data-feather="play"></i> เริ่ม';
                        saveState(); updateHomePageUI();
                    }
                }, 1000);
            }
            feather.replace();
        });
        document.getElementById('reset-timer-btn').addEventListener('click', () => {
            clearInterval(timerInterval); timerInterval = null; isFocusing = true;
            timeLeft = (state.settings || initialState.settings).focusDuration * 60;
            updateTimerDisplay(timeLeft);
            document.getElementById('timer-mode').textContent = 'Focus';
            const startBtn = document.getElementById('start-timer-btn');
            if(startBtn) {
                startBtn.innerHTML = '<i data-feather="play"></i> เริ่ม';
                feather.replace();
            }
        });
        document.getElementById('settings-timer-btn').addEventListener('click', () => document.getElementById('timer-settings').classList.toggle('hidden'));
        document.getElementById('save-timer-settings-btn').addEventListener('click', () => {
            state.settings.focusDuration = parseInt(document.getElementById('focus-duration').value);
            state.settings.breakDuration = parseInt(document.getElementById('break-duration').value);
            document.getElementById('timer-settings').classList.add('hidden');
            document.getElementById('reset-timer-btn').click();
            saveState();
        });

        // MOOD PAGE
        document.getElementById('mood-prev-month').addEventListener('click', () => renderMoodCalendar(currentMoodDate.subtract(1, 'month')));
        document.getElementById('mood-next-month').addEventListener('click', () => renderMoodCalendar(currentMoodDate.add(1, 'month')));
        document.querySelectorAll('.emoji-option').forEach(el => el.addEventListener('click', e => {
            document.querySelectorAll('.emoji-option.selected').forEach(s => s.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            document.getElementById('selected-mood').value = e.currentTarget.dataset.mood;
        }));
        document.getElementById('mood-form').addEventListener('submit', e => {
            e.preventDefault();
            const mood = document.getElementById('selected-mood').value;
            if (!mood) return alert('กรุณาเลือกอารมณ์');
            const reasons = [...document.querySelectorAll('input[name="mood-reason"]:checked')].map(el => el.value);
            if(!state.moods) state.moods = {};
            state.moods[selectedMoodDate] = { mood, notes: document.getElementById('mood-notes').value, reasons };
            addExp(15); saveState(); renderMoodCalendar(currentMoodDate);
            e.target.reset(); document.querySelectorAll('.emoji-option.selected').forEach(s => s.classList.remove('selected'));
        });

        // SETTINGS PAGE
        document.getElementById('theme-light-btn').addEventListener('click', () => { state.settings.theme = 'light'; applySettings(); saveState(); });
        document.getElementById('theme-dark-btn').addEventListener('click', () => { state.settings.theme = 'dark'; applySettings(); saveState(); });

        areListenersSetup = true;
    }
    
    function getFriendlyAuthError(error) {
        console.error("Auth Error:", error); // Log the full error for debugging
        switch (error.code) {
            case 'auth/invalid-email': return 'รูปแบบอีเมลไม่ถูกต้อง';
            case 'auth/user-not-found': return 'ไม่พบบัญชีผู้ใช้นี้';
            case 'auth/wrong-password': return 'รหัสผ่านไม่ถูกต้อง';
            case 'auth/email-already-in-use': return 'อีเมลนี้ถูกใช้งานแล้ว';
            case 'auth/weak-password': return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
            case 'auth/popup-closed-by-user': return 'คุณปิดหน้าต่างการลงชื่อเข้าใช้';
            case 'auth/cancelled-popup-request': return '';
            case 'auth/account-exists-with-different-credential': return 'มีบัญชีที่ใช้อีเมลนี้อยู่แล้ว กรุณาเข้าสู่ระบบด้วยวิธีเดิม';
            case 'auth/internal-error':
                 if (error.message.includes("INVALID_LOGIN_CREDENTIALS")) {
                    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                 }
                 return 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่';
            default: return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        }
    }

    function openAuthModal() { 
        document.getElementById('auth-modal').classList.remove('hidden'); 
        // Reset to show login view by default
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('auth-error').textContent = '';
    }
    function closeAuthModal() { 
        document.getElementById('auth-modal').classList.add('hidden'); 
        document.getElementById('auth-error').textContent = ''; 
    }
});
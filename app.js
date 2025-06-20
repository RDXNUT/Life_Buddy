document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // ====================== 1. FIREBASE SETUP ==========================
    // ===================================================================
    
    // Firebase Config ที่ถูกต้องของคุณ
    const firebaseConfig = {
      apiKey: "AIzaSyBUs0Gqhv0P1Up-vDz1HE9iFfaZr0bAEms",
      authDomain: "life-buddy-xok07.firebaseapp.com",
      projectId: "life-buddy-xok07",
      storageBucket: "life-buddy-xok07.firebasestorage.app",
      messagingSenderId: "243239137119",
      appId: "1:243239137119:web:2baf84c64caddf211ad0ea"
    };
  
    // เริ่มต้นการเชื่อมต่อ Firebase
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
        profile: { displayName: '', gender: 'unspecified', age: '', bio: '', lifebuddyId: '' },
        friends: [],
        friendRequestsSent: [],
        friendRequestsReceived: [],
        chatStreaks: {}
    };
    let timerInterval, timeLeft, isFocusing = true;
    let currentPlannerDate = dayjs(), selectedPlannerDate = dayjs().format('YYYY-MM-DD');
    let currentMoodDate = dayjs(), selectedMoodDate = dayjs().format('YYYY-MM-DD');
    let currentQuizTopic = null, shuffledFlashcards = [], currentCardIndex = 0;
    let toastTimeout;
    let areListenersSetup = false;
    let currentChatId = null;
    let unsubscribeChatListener = null;
    let friendListeners = [];
    const allPages = document.querySelectorAll('.page');
    const allNavLinks = document.querySelectorAll('.nav-link');

    // ===================================================================
    // ====================== 3. APP INITIALIZATION FLOW =================
    // ===================================================================

    auth.onAuthStateChanged(async (user) => {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.opacity = '1';
        
        friendListeners.forEach(unsubscribe => unsubscribe());
        friendListeners = [];

        if (unsubscribeChatListener) {
            unsubscribeChatListener();
            unsubscribeChatListener = null;
        }

        if (user) {
            currentUser = user;
            state = await loadStateFromFirestore(user.uid);
            
            if (!state.profile || !state.profile.lifebuddyId) {
                await createLifeBuddyId(user.uid);
                state = await loadStateFromFirestore(user.uid);
            }
            
            setupFriendListeners(user.uid);

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
                const loadedData = doc.data();
                return deepMerge(JSON.parse(JSON.stringify(initialState)), loadedData);
            } else {
                const freshState = JSON.parse(JSON.stringify(initialState));
                if (currentUser && currentUser.displayName) {
                    freshState.profile.displayName = currentUser.displayName;
                }
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
        if (!currentUser) { return; }
        checkBadges();
        db.collection('users').doc(currentUser.uid).set(state, { merge: true })
            .catch(error => console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล: ", error));
    }
    
    window.showPage = (pageId) => {
        if (!pageId) pageId = 'home';
        const protectedPages = ['profile', 'rewards', 'settings', 'community'];
        if (protectedPages.includes(pageId) && !currentUser) {
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
            home: updateHomePageUI,
            planner: () => renderPlannerCalendar(dayjs()),
            revisit: renderRevisitList,
            mood: () => renderMoodCalendar(dayjs()),
            profile: renderProfilePage,
            community: renderFriendsList,
            rewards: updateRewardsUI,
            settings: updateSettingsUI
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
        if (!state.focus) state.focus = { totalSessions: 0, todaySessions: 0, lastFocusDate: null };
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
            const displayName = currentUser.displayName || state.profile.displayName || 'User';
            const avatarUrl = currentUser.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random&color=fff`;
            
            document.getElementById('guest-header').classList.add('hidden');
            document.getElementById('user-header').classList.remove('hidden');
            document.getElementById('user-photo').src = avatarUrl;
        } else {
            document.getElementById('guest-header').classList.remove('hidden');
            document.getElementById('user-header').classList.add('hidden');
        }
        closeAuthModal();
        if (!currentUser) {
            document.getElementById('friends-list').innerHTML = '';
            document.getElementById('friend-requests-list').innerHTML = '';
            document.getElementById('chat-welcome-view').classList.remove('hidden');
            document.getElementById('chat-conversation-view').classList.add('hidden');
        }
    }

    function updateHeaderUI() {
        if(!currentUser) return;
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
        const page = document.getElementById('home-page');
        if (!page || !page.classList.contains('active')) return;
        const todayStr = dayjs().format('YYYY-MM-DD');
        const tasksList = document.getElementById('today-tasks-summary');
        tasksList.innerHTML = (state.planner[todayStr] || []).map(t => `<li>${t.time} - ${t.name}</li>`).join('') || '<li>ไม่มีงานสำหรับวันนี้</li>';
        const revisitList = document.getElementById('today-revisit-summary');
        const dueTopics = (state.revisitTopics || []).filter(t => dayjs(t.nextReviewDate).isSame(dayjs(), 'day'));
        revisitList.innerHTML = dueTopics.map(t => `<li>${t.name}</li>`).join('') || '<li>ไม่มีหัวข้อต้องทบทวน</li>';
        document.getElementById('today-focus-count').textContent = state.focus.todaySessions || 0;
        const todoList = document.getElementById('todo-list');
        todoList.innerHTML = (state.todos || []).map(todo => `<li class="${todo.completed ? 'completed' : ''}"><input type="checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}><span>${todo.text}</span></li>`).join('');
    }

    function updateRewardsUI() {
        const page = document.getElementById('rewards-page');
        if (!page || !page.classList.contains('active')) return;
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
        const page = document.getElementById('settings-page');
        if (!page || !page.classList.contains('active')) return;
        if (!currentUser) return;
        const { level, expInCurrentLevel, expForNextLevel } = calculateLevel(state.exp);
        const progress = Math.min(100, (expInCurrentLevel / expForNextLevel) * 100);
        document.getElementById('current-level').textContent = `Level ${level}`;
        document.getElementById('exp-progress-text').textContent = `${expInCurrentLevel} / ${expForNextLevel}`;
        document.getElementById('exp-progress-bar').style.width = `${progress}%`;
    }

    function addExp(amount) {
        if(!currentUser) return;
        if(typeof state.exp === 'undefined') state.exp = 0;
        state.exp += amount;
        showToast(`ได้รับ ${amount} EXP!`);
        updateHeaderUI();
        updateSettingsUI();
    }

    function checkBadges() {
        if(!currentUser) return;
        let uniquePlannerDays = new Set(Object.keys(state.planner || {}).filter(key => state.planner[key].length > 0));
        let moodStreak = 0;
        let sortedMoodDays = Object.keys(state.moods || {}).sort((a,b) => b.localeCompare(a));
        for(let i = 0; i < sortedMoodDays.length; i++) {
            if (i === 0 || dayjs(sortedMoodDays[i-1]).diff(dayjs(sortedMoodDays[i]), 'day') === 1) {
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
                if (isObject(source[key]) && key in target) {
                    output[key] = deepMerge(target[key], source[key]);
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
        if (!listEl) return;
        const dueTopics = (state.revisitTopics || []).filter(t => dayjs(t.nextReviewDate).isSame(dayjs(), 'day'));
        listEl.innerHTML = dueTopics.map(topic => `<li><span>${topic.name}</span><button class="small-btn" onclick="startReviewSession(${topic.id})">เริ่มทบทวน</button></li>`).join('') || '<li class="empty-state">ไม่มีหัวข้อต้องทบทวนวันนี้!</li>';
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
        if(shuffledFlashcards.length > 0) {
            document.getElementById('flashcard-quiz').classList.remove('hidden');
            displayNextFlashcard(); 
        } else { 
            document.getElementById('flashcard-quiz').classList.add('hidden'); 
        }
    }
    function displayNextFlashcard() {
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
        container.innerHTML = (state.userActivities || defaultActivities).map((activity, index) => `
            <div class="activity-item">
                <span>${activity}</span>
                <button class="delete-activity-btn" data-index="${index}" title="ลบกิจกรรม"><i data-feather="trash-2"></i></button>
            </div>`).join('');
        feather.replace();
    }

    function renderProfilePage() {
        if (!currentUser) return;
        const displayName = currentUser.displayName || state.profile.displayName || 'User';
        const photoURL = currentUser.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random&color=fff`;

        document.getElementById('profile-page-photo').src = photoURL;
        document.getElementById('profile-page-name').textContent = displayName;
        document.getElementById('profile-page-email').textContent = currentUser.email;

        document.getElementById('display-name').value = displayName;
        document.getElementById('gender').value = state.profile?.gender || 'unspecified';
        document.getElementById('age').value = state.profile?.age || '';
        document.getElementById('bio').value = state.profile?.bio || '';
    }
    
    // ===================================================================
    // ====================== NEW: FRIEND & CHAT FUNCTIONS ===============
    // ===================================================================

    async function createLifeBuddyId(userId) {
        const userDocRef = db.collection('users').doc(userId);
        const displayName = currentUser.displayName || state.profile.displayName || 'user';
        const randomId = Math.floor(1000 + Math.random() * 9000);
        const lifebuddyId = `${displayName}#${randomId}`;
        await userDocRef.set({ profile: { lifebuddyId: lifebuddyId } }, { merge: true });
    }

    function setupFriendListeners(userId) {
        const friendsListener = db.collection('users').doc(userId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    state.friends = doc.data().friends || [];
                    if (document.getElementById('community-page').classList.contains('active')) {
                        renderFriendsList();
                    }
                }
            });

        const requestsListener = db.collection('users').doc(userId)
            .onSnapshot(doc => {
                if (doc.exists) {
                    state.friendRequestsReceived = doc.data().friendRequestsReceived || [];
                    if (document.getElementById('community-page').classList.contains('active')) {
                        renderFriendRequests();
                    }
                    const requestCount = state.friendRequestsReceived.length;
                    const badge = document.getElementById('request-count-badge');
                    const dot = document.getElementById('unread-notification-dot');

                    badge.textContent = requestCount;
                    badge.classList.toggle('hidden', requestCount === 0);
                    dot.classList.toggle('hidden', requestCount === 0);
                }
            });
            
        friendListeners.push(friendsListener, requestsListener);
    }

    async function renderFriendsList() {
        const listEl = document.getElementById('friends-list');
        listEl.innerHTML = '<li class="user-list-item empty-state">Loading...</li>';
        if (state.friends.length === 0) {
            listEl.innerHTML = '<li class="user-list-item empty-state">ยังไม่มีเพื่อน... ลองค้นหาดูสิ!</li>';
            return;
        }

        const friendPromises = state.friends.map(uid => db.collection('users').doc(uid).get());
        const friendDocs = await Promise.all(friendPromises);
        
        listEl.innerHTML = friendDocs.map(doc => {
            if (!doc.exists) return '';
            const friendData = doc.data();
            const displayName = friendData.profile.displayName || 'User';
            const avatarUrl = friendData.profile.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random&color=fff`;
            return `
                <li class="user-list-item" onclick="startChat('${doc.id}')">
                    <img src="${avatarUrl}" alt="${displayName}">
                    <div class="user-info">
                        <h4>${displayName}</h4>
                        <p>Level ${calculateLevel(friendData.exp || 0).level}</p>
                    </div>
                </li>
            `;
        }).join('');
    }

    async function renderFriendRequests() {
        const listEl = document.getElementById('friend-requests-list');
        listEl.innerHTML = '<li class="user-list-item empty-state">Loading...</li>';
        if (state.friendRequestsReceived.length === 0) {
            listEl.innerHTML = '<li class="user-list-item empty-state">ไม่มีคำขอเป็นเพื่อน</li>';
            return;
        }

        const requestPromises = state.friendRequestsReceived.map(uid => db.collection('users').doc(uid).get());
        const requestDocs = await Promise.all(requestPromises);

        listEl.innerHTML = requestDocs.map(doc => {
            if (!doc.exists) return '';
            const senderData = doc.data();
            const displayName = senderData.profile.displayName || 'User';
            const avatarUrl = senderData.profile.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random&color=fff`;
            return `
                <li class="user-list-item">
                    <img src="${avatarUrl}" alt="${displayName}">
                    <div class="user-info">
                        <h4>${displayName}</h4>
                        <p>${senderData.profile.lifebuddyId || ''}</p>
                    </div>
                    <div class="user-actions">
                        <button class="small-btn btn-success" onclick="acceptFriendRequest('${doc.id}')"><i data-feather="check"></i></button>
                        <button class="small-btn btn-danger" onclick="declineFriendRequest('${doc.id}')"><i data-feather="x"></i></button>
                    </div>
                </li>
            `;
        }).join('');
        feather.replace();
    }
    
    window.acceptFriendRequest = async (senderId) => {
        const batch = db.batch();
        batch.update(db.collection('users').doc(currentUser.uid), { friends: firebase.firestore.FieldValue.arrayUnion(senderId), friendRequestsReceived: firebase.firestore.FieldValue.arrayRemove(senderId) });
        batch.update(db.collection('users').doc(senderId), { friends: firebase.firestore.FieldValue.arrayUnion(currentUser.uid), friendRequestsSent: firebase.firestore.FieldValue.arrayRemove(currentUser.uid) });
        await batch.commit();
        showToast("เพิ่มเพื่อนสำเร็จ!");
    };

    window.declineFriendRequest = async (senderId) => {
        await db.collection('users').doc(currentUser.uid).update({
            friendRequestsReceived: firebase.firestore.FieldValue.arrayRemove(senderId)
        });
        showToast("ปฏิเสธคำขอแล้ว");
    };

    function calculateLevel(exp) {
        if (typeof exp === 'undefined') exp = 0;
        let currentLevel = 1, expForNextLevel = levelCaps[0], expInCurrentLevel = exp, prevLevelsTotalExp = 0;
        for (let i = 0; i < levelCaps.length; i++) {
            if (exp >= prevLevelsTotalExp + levelCaps[i]) {
                prevLevelsTotalExp += levelCaps[i];
                currentLevel++;
            } else {
                expForNextLevel = levelCaps[i];
                expInCurrentLevel = exp - prevLevelsTotalExp;
                break;
            }
        }
        if (currentLevel > levelCaps.length) { expInCurrentLevel = expForNextLevel; }
        return { level: currentLevel, expInCurrentLevel, expForNextLevel };
    }

    window.startChat = async (friendId) => {
        currentChatId = [currentUser.uid, friendId].sort().join('_');
        if (unsubscribeChatListener) { unsubscribeChatListener(); }
        
        const friendDoc = await db.collection('users').doc(friendId).get();
        if(!friendDoc.exists) return;
        const friendData = friendDoc.data().profile;
        const displayName = friendData.displayName || 'User';
        document.getElementById('chat-partner-photo').src = friendData.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random&color=fff`;
        document.getElementById('chat-partner-name').textContent = displayName;

        document.getElementById('chat-welcome-view').classList.add('hidden');
        document.getElementById('chat-conversation-view').classList.remove('hidden');
        
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = ''; 

        const chatQuery = db.collection('chats').doc(currentChatId).collection('messages').orderBy('timestamp', 'asc').limitToLast(50);

        unsubscribeChatListener = chatQuery.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const messageData = change.doc.data();
                    if (!messageData.text) return; // Ignore empty messages
                    const messageEl = document.createElement('div');
                    messageEl.classList.add('chat-message', messageData.senderId === currentUser.uid ? 'sent' : 'received');
                    const bubble = document.createElement('div');
                    bubble.classList.add('message-bubble');
                    bubble.textContent = messageData.text; // Use textContent for security
                    messageEl.appendChild(bubble);
                    messagesContainer.appendChild(messageEl);
                }
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }

    async function sendMessage(text) {
        if (!currentChatId || !text.trim()) return;

        const message = {
            text: text.trim(),
            senderId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const chatRef = db.collection('chats').doc(currentChatId);
        
        const todayStr = dayjs().format('YYYY-MM-DD');
        if (!state.chatStreaks[currentChatId] || state.chatStreaks[currentChatId] !== todayStr) {
            state.chatStreaks[currentChatId] = todayStr;
            state.streak = (state.streak || 0) + 1;
            showToast("ได้รับสตรีคจากการคุยกับเพื่อน! 🔥");
            updateHeaderUI();
            
            await db.collection('users').doc(currentUser.uid).update({ 
                chatStreaks: state.chatStreaks,
                streak: state.streak 
            });
        }

        await chatRef.collection('messages').add(message);
        await chatRef.set({ participants: currentChatId.split('_') }, { merge: true });
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
        document.getElementById('show-signup-link').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-view').classList.add('hidden'); document.getElementById('signup-view').classList.remove('hidden'); document.getElementById('auth-error').textContent = ''; });
        document.getElementById('show-login-link').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('signup-view').classList.add('hidden'); document.getElementById('login-view').classList.remove('hidden'); document.getElementById('auth-error').textContent = ''; });
        
        // --- AUTH ACTIONS ---
        document.getElementById('signup-form').addEventListener('submit', e => { e.preventDefault(); const email = document.getElementById('signup-email').value; const password = document.getElementById('signup-password').value; auth.createUserWithEmailAndPassword(email, password).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error)); });
        document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; auth.signInWithEmailAndPassword(email, password).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error)); });
        document.getElementById('google-signin-btn').addEventListener('click', () => { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error)); });
        
        // --- COMMUNITY & SEARCH LISTENERS ---
        document.getElementById('community-btn').addEventListener('click', () => showPage('community'));
        document.getElementById('search-friends-btn').addEventListener('click', () => { document.getElementById('search-friends-modal').classList.remove('hidden'); document.getElementById('search-results-container').innerHTML = ''; document.getElementById('search-friends-input').value = ''; });
        document.getElementById('close-search-modal-btn').addEventListener('click', () => document.getElementById('search-friends-modal').classList.add('hidden'));
        
        document.getElementById('search-friends-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = document.getElementById('search-friends-input').value.trim();
            if (!query) return;
            const resultsContainer = document.getElementById('search-results-container');
            resultsContainer.innerHTML = '<p>กำลังค้นหา...</p>';
            
            let userQuery = query.includes('#') 
                ? db.collection('users').where('profile.lifebuddyId', '==', query)
                : db.collection('users').orderBy('profile.displayName').startAt(query).endAt(query + '\uf8ff');

            const snapshot = await userQuery.get();
            
            if (snapshot.empty) {
                resultsContainer.innerHTML = '<p>ไม่พบผู้ใช้</p>';
                return;
            }
            
            resultsContainer.innerHTML = snapshot.docs.map(doc => {
                if (doc.id === currentUser.uid) return '';
                const userData = doc.data().profile;
                const displayName = userData.displayName || 'User';
                const avatarUrl = userData.photoURL || `https://ui-avatars.com/api/?name=${displayName.charAt(0)}&background=random&color=fff`;

                let buttonHtml;
                if (state.friends.includes(doc.id)) {
                    buttonHtml = '<button class="small-btn" disabled>เป็นเพื่อนกันแล้ว</button>';
                } else if (state.friendRequestsSent.includes(doc.id)) {
                    buttonHtml = '<button class="small-btn" disabled>ส่งคำขอแล้ว</button>';
                } else {
                    buttonHtml = `<button class="small-btn" onclick="sendFriendRequest('${doc.id}')">เพิ่มเพื่อน</button>`;
                }
                
                return `<div class="user-list-item"> <img src="${avatarUrl}" alt="${displayName}"> <div class="user-info"> <h4>${displayName}</h4> <p>${userData.lifebuddyId || ''}</p> </div> <div class="user-actions">${buttonHtml}</div> </div>`;
            }).join('');
        });

        window.sendFriendRequest = async (recipientId) => {
            state.friendRequestsSent.push(recipientId);
            const batch = db.batch();
            batch.update(db.collection('users').doc(recipientId), { friendRequestsReceived: firebase.firestore.FieldValue.arrayUnion(currentUser.uid) });
            batch.update(db.collection('users').doc(currentUser.uid), { friendRequestsSent: firebase.firestore.FieldValue.arrayUnion(recipientId) });
            await batch.commit();
            
            showToast('ส่งคำขอเป็นเพื่อนแล้ว!');
            document.getElementById('search-friends-form').dispatchEvent(new Event('submit', { cancelable: true }));
        };

        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            sendMessage(input.value);
            input.value = '';
        });

        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabName}-tab-content`).classList.add('active');
            });
        });

        // --- NAVIGATION & SIDEBAR ---
        document.getElementById('open-menu').addEventListener('click', () => { document.getElementById('sidebar').classList.add('show'); document.getElementById('overlay').classList.add('show'); });
        document.getElementById('close-menu').addEventListener('click', closeSidebar);
        document.getElementById('overlay').addEventListener('click', closeSidebar);
        allNavLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); showPage(e.currentTarget.dataset.page); }));

        // --- PROFILE LISTENERS ---
        document.getElementById('profile-link').addEventListener('click', (e) => { e.preventDefault(); showPage('profile'); });
        // ... (profile form listeners)

        // --- OTHER FEATURE LISTENERS ---
        document.getElementById('check-in-btn').addEventListener('click', () => {
            const todayStr = dayjs().format('YYYY-MM-DD');
            const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
            if (state.lastCheckIn !== todayStr) {
                state.streak = state.lastCheckIn === yesterdayStr ? (state.streak || 0) + 1 : 1;
                state.lastCheckIn = todayStr;
                addExp(40);
                saveState();
                updateHeaderUI();
            }
        });
        document.getElementById('todo-form').addEventListener('submit', e => { e.preventDefault(); const input = document.getElementById('todo-input'); if (input.value.trim()) { state.todos.push({ id: Date.now(), text: input.value.trim(), completed: false }); input.value = ''; updateHomePageUI(); saveState(); } });
        document.getElementById('todo-list').addEventListener('change', e => { if (e.target.type === 'checkbox') { const todo = state.todos.find(t => t.id === parseInt(e.target.dataset.id)); if (todo) { const wasCompleted = todo.completed; todo.completed = e.target.checked; if(todo.completed && !wasCompleted) { addExp(10); } updateHomePageUI(); saveState(); } } });
        document.getElementById('random-activity-btn').addEventListener('click', () => { document.getElementById('activity-suggestion').textContent = (state.userActivities || defaultActivities)[Math.floor(Math.random() * (state.userActivities || defaultActivities).length)]; });
        document.getElementById('random-advice-btn').addEventListener('click', () => { const advices = ["เหนื่อยได้ แต่อย่าลืมหายใจให้ลึก ๆ", "เก่งแล้วนะ ที่ยังอยู่ตรงนี้ได้", "ต้นไม้ไม่ได้โตในวันเดียว คนเราก็เช่นกัน", "ดื่มน้ำบ้างนะ วันนี้เธอทำดีแล้วล่ะ", "ใจล้า อย่าฝืน แต่ใจสู้ อย่าถอย"]; document.getElementById('daily-advice').textContent = advices[Math.floor(Math.random() * advices.length)]; });
        
        areListenersSetup = true;
    }
    
    function getFriendlyAuthError(error) {
        console.error("Auth Error:", error);
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
                if (error.message && error.message.includes("INVALID_LOGIN_CREDENTIALS")) {
                   return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                }
                return 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่';
            default: return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        }
    }

    function openAuthModal() { 
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('auth-error').textContent = '';
    }
    function closeAuthModal() { 
        document.getElementById('auth-modal').classList.add('hidden'); 
        document.getElementById('auth-error').textContent = ''; 
    }
});
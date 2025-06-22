document.addEventListener('DOMContentLoaded', () => {

    // =============================
    // ===== 1. FIREBASE SETUP =====
    // =============================

     const firebaseConfig = { apiKey: "AIzaSyBUs0Gqhv0P1Up-vDz1HE9iFfaZr0bAEms", authDomain: "life-buddy-xok07.firebaseapp.com", projectId: "life-buddy-xok07", storageBucket: "life-buddy-xok07.firebasestorage.app", messagingSenderId: "243239137119", appId: "1:243239137119:web:2baf84c64caddf211ad0ea" };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // =======================================
    // ===== 2. GLOBAL STATE & CONSTANTS =====
    // =======================================
    let currentUser = null;
    let state = {};
    const defaultActivities = ["เขียนสิ่งที่ขอบคุณวันนี้ 3 อย่าง", "ยืดเส้น 3 นาที", "โทรหาเพื่อนคนหนึ่ง", "จดไอเดียเรื่องที่สนใจ", "จัดโต๊ะทำงาน"];
    const defaultAdvices = ["เหนื่อยได้ แต่อย่าลืมหายใจให้ลึก ๆ", "เก่งแล้วนะ ที่ยังอยู่ตรงนี้ได้", "ต้นไม้ไม่ได้โตในวันเดียว คนเราก็เช่นกัน", "ดื่มน้ำบ้างนะ วันนี้เธอทำดีแล้วล่ะ", "ใจล้า อย่าฝืน แต่ใจสู้ อย่าถอย"];
    const profilePictures = [ 'girl_01.png', 'girl_02.png', 'girl_03.png', 'girl_04.png', 'girl_05.png', 'boy_01.png', 'boy_02.png', 'boy_03.png', 'boy_04.png', 'boy_05.png', 'cat_01.png', 'cat_02.png', 'cat_03.png', 'dog_01.png', 'dog_02.png', 'dog_03.png' ];
    
    const initialState = {
        coins: 50, coinHistory: [], 
        wishList: { name: 'ของชิ้นต่อไป!', target: 1000 }, 
        lastBonusDate: null, 
        lastCoinUsage: null, 
        exp: 0, 
        streak: 0, 
        lastCheckIn: null, 
        todos: [], 
        planner: {}, 
        revisitTopics: {}, 
        moods: {},
        focus: { totalSessions: 0, todaySessions: 0, lastFocusDate: null, combo: 0 },
        badges: { focus10: false, plan5: false, mood7: false, review20: false },
        settings: { theme: 'light', focusDuration: 25, breakDuration: 5, showEmail: true },
        userActivities: [...defaultActivities],
        userAdvice: [],
        unlocks: { accessories: ['ไม่มี', 'หูฟัง'], background: ['ไม่มี', 'ฟ้า'] },
        profile: { 
            displayName: '', gender: 'unspecified', age: '', bio: '', lifebuddyId: '', 
            photoURL: 'assets/profiles/startprofile.png',
        },
        following: [],
        followers: [],
        followRequests: [],
        sentFollowRequests: [],
        chatStreaks: {}
    };

    let timerInterval, timeLeft, isFocusing = true;
    let currentPlannerDate = dayjs(), selectedPlannerDate = dayjs().format('YYYY-MM-DD');
    let currentMoodDate = dayjs(), selectedMoodDate = dayjs().format('YYYY-MM-DD');
    let currentQuizTopic = null, shuffledFlashcards = [], currentCardIndex = 0;
    let toastTimeout, areListenersSetup = false;
    let currentChatId = null, unsubscribeChatListener = null, friendListeners = [];
    const allPages = document.querySelectorAll('.page');
    const allNavLinks = document.querySelectorAll('.nav-link');

    // =================================
    // ===== 3. APP INITIALIZATION =====
    // =================================
       auth.onAuthStateChanged(async (user) => {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
        if (user) {
            currentUser = user;
            state = await loadStateFromFirestore(user.uid);
            setupFriendListeners();
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
                return deepMerge(JSON.parse(JSON.stringify(initialState)), doc.data());
            } else {
                const freshState = JSON.parse(JSON.stringify(initialState));
                const initialName = currentUser.displayName || currentUser.email.split('@')[0];
                const randomTag = Math.floor(1000 + Math.random() * 9000);
                freshState.profile.displayName = initialName;
                freshState.profile.lifebuddyId = `${initialName}#${randomTag}`;
                await db.collection('users').doc(userId).set(freshState);
                return freshState;
            }
        } catch (error) { console.error("Error loading state:", error); return JSON.parse(JSON.stringify(initialState)); }
    }

    function runApp() {
        if (!areListenersSetup) {
            setupAllEventListeners();
            areListenersSetup = true;
        }
        applySettings();
        updateUIForLoginStatus();
        checkDailyReset();
        checkForIdleCoins();
        const hash = window.location.hash.substring(1);
        showPage(hash || 'home');
        document.getElementById('loading-overlay').style.opacity = '0';
        setTimeout(() => document.getElementById('loading-overlay').classList.add('hidden'), 500);
    }
    
    // =============================
    // ===== 4. CORE FUNCTIONS =====
    //==============================

    function saveState() { 
        if (!currentUser) return; 
        checkBadges(); db.collection('users').doc(currentUser.uid).set(state, { merge: true }).catch(error => console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล: ", error)); }
    
    function closeSidebar() { 
        document.getElementById('sidebar').classList.remove('show'); 
        document.getElementById('overlay').classList.remove('show'); }
    
    function applySettings() {
        if (!state.settings) return;
        document.body.dataset.theme = state.settings.theme;
    }
    
    function deepMerge(target, source) { const output = { ...target }; 
    if (isObject(target) && isObject(source)) { Object.keys(source).forEach(key => { if (isObject(source[key]) && key in target) { output[key] = deepMerge(target[key], source[key]); } else { Object.assign(output, { [key]: source[key] }); } }); } return output; }
    
    function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
    
    function checkDailyReset() { 
        if (!state.focus) { state.focus = { totalSessions: 0, todaySessions: 0, lastFocusDate: null, combo: 0 }; } 
        const todayStr = dayjs().format('YYYY-MM-DD'); if (state.focus.lastFocusDate !== todayStr) { state.focus.todaySessions = 0; 
            state.focus.lastFocusDate = todayStr; 
            state.focus.combo = 0; } }
    
    function showToast(message) { 
        const toast = document.getElementById('toast-notification'); 
        if (!toast) return; toast.textContent = message; 
        toast.classList.remove('hidden'); 
        clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toast.classList.add('hidden'); }, 3000); }
    
    function addExp(amount) { 
        if(!currentUser) return; if(typeof state.exp === 'undefined') state.exp = 0; state.exp += amount; showToast(`ได้รับ ${amount} EXP!`); updateHeaderUI(); updateSettingsUI(); }
    
    // ==================================
    // ===== 5. UI & PAGE RENDERING =====
    // ==================================

     window.showPage = (pageId) => {
        if (!pageId) pageId = 'home';
        const protectedPages = ['profile', 'rewards', 'settings', 'community'];
        if (protectedPages.includes(pageId) && !currentUser) { openAuthModal(); return; }
        allPages.forEach(p => p.classList.toggle('active', p.id === `${pageId}-page`));
        allNavLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
        if (history.pushState) { history.pushState(null, null, `#${pageId}`); } else { location.hash = `#${pageId}`; }
        
        switch(pageId) {
            case 'home': updateHomePageUI(); break;
            case 'planner': renderPlannerCalendar(currentPlannerDate); break;
            case 'mood': renderMoodCalendar(currentMoodDate); break;
            case 'profile': renderProfilePage(); break;
            case 'rewards': updateRewardsUI(); break;
            case 'settings': updateSettingsUI(); break;
            case 'focus': 
            resetTimer(); 
            renderFocusStats('day');
            break;
        }
        feather.replace();
        closeSidebar();
    }

    function updateUIForLoginStatus() {
        const guestHeader = document.getElementById('guest-header');
        const userHeader = document.getElementById('user-header');
        if (currentUser) {
            guestHeader.classList.add('hidden');
            userHeader.classList.remove('hidden');
            updateHeaderUI();
        } else {
            guestHeader.classList.remove('hidden');
            userHeader.classList.add('hidden');
        }
        closeAuthModal();
    }

    function updateHeaderUI() {
        if (!currentUser) return;
        renderProfilePicture(state.profile.photoURL, document.getElementById('user-photo'));
        
        document.getElementById('coin-display').innerHTML = `<i data-feather="dollar-sign"></i> ${state.coins || 0}`;
        const streakCountEl = document.getElementById('streak-count');
            if (streakCountEl) {
            streakCountEl.textContent = state.streak || 0;
        }
        const { level } = calculateLevel(state.exp); // คำนวณเลเวลปัจจุบัน
        const levelHeaderEl = document.getElementById('level-header-display');
        if (levelHeaderEl) {
            levelHeaderEl.innerHTML = `<i data-feather="star"></i> Level ${level}`;
        }

        const checkInBtn = document.getElementById('check-in-btn');
        if (checkInBtn) {
            const checkInText = checkInBtn.querySelector('.check-in-text');
            const checkInIcon = checkInBtn.querySelector('.check-in-icon');
            if (state.lastCheckIn === dayjs().format('YYYY-MM-DD')) {
                checkInBtn.disabled = true;
                checkInBtn.classList.add('checked');
                if(checkInText) checkInText.classList.add('hidden');
                if(checkInIcon) checkInIcon.classList.remove('hidden');
            } else {
                checkInBtn.disabled = false;
                checkInBtn.classList.remove('checked');
                if(checkInText) checkInText.classList.remove('hidden');
                if(checkInIcon) checkInIcon.classList.add('hidden');
            }
        }
        feather.replace();
    }
    
    function updateHomePageUI() {
        const page = document.getElementById('home-page');
        if (!page || !page.classList.contains('active')) return;

        // --- สรุปตารางงานวันนี้ ---
        const todayStr = dayjs().format('YYYY-MM-DD');
        const tasksList = document.getElementById('today-tasks-summary');
        if (tasksList) {
         const tasksForToday = (state.planner && state.planner[todayStr]) || [];
            tasksList.innerHTML = tasksForToday.map(t => `<li>${t.time} - ${t.name}</li>`).join('') || '<li>ไม่มีงานสำหรับวันนี้</li>';
        }

        // --- การทบทวนที่ต้องทำ (Defensive Version) ---
        const revisitList = document.getElementById('today-revisit-summary');
        if (revisitList) {
            let dueTopics = [];
            // 1. ตรวจสอบว่า state.revisitTopics เป็น Object จริงๆ
            if (state.revisitTopics && typeof state.revisitTopics === 'object' && !Array.isArray(state.revisitTopics)) {
                // 2. ถ้าเป็น Object ให้วนลูปด้วย Object.values
                Object.values(state.revisitTopics).forEach(subjectArray => {
                    // 3. ตรวจสอบว่า subjectArray เป็น Array จริงๆ ก่อนใช้ .filter
                    if (Array.isArray(subjectArray)) {
                        const dueInSubject = subjectArray.filter(t => t && t.nextReviewDate && dayjs(t.nextReviewDate).isSame(dayjs(), 'day'));
                        dueTopics = dueTopics.concat(dueInSubject);
                    }
                });
            }
            // ถ้าไม่ใช่ Object หรือไม่มีข้อมูลเลย dueTopics จะยังเป็น Array ว่างๆ
            revisitList.innerHTML = dueTopics.map(t => `<li>${t.name}</li>`).join('') || '<li>ไม่มีหัวข้อต้องทบทวน</li>';
        }

        // --- สถิติการโฟกัส ---
        const todayFocusCountEl = document.getElementById('today-focus-count');
        if (todayFocusCountEl) {
            todayFocusCountEl.textContent = state.focus?.todaySessions || 0;
        }
    
        // --- เป้าหมายรายวัน (Todo List) ---
        const todoList = document.getElementById('todo-list');
        if (todoList) {
            const todos = state.todos || [];
            todoList.innerHTML = todos.map(todo => 
                `<li class="${todo.completed ? 'completed' : ''}">
                    <input type="checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
                    <span>${todo.text}</span>
                </li>`
            ).join('');
        }

        // --- Wish List ---
        renderWishList();
    }

    function updateRewardsUI() {
        const page = document.getElementById('rewards-page');
        if (!page || !page.classList.contains('active')) return;
    
        const totalExpDisplay = document.getElementById('total-exp-display');
        const badgesContainer = document.getElementById('badges-container');
    if (!totalExpDisplay || !badgesContainer) return;

    if (!currentUser) {
        totalExpDisplay.textContent = 0;
        badgesContainer.innerHTML = '';
        return;
    }

    totalExpDisplay.textContent = state.exp || 0;

    const allBadges = {
        "ความสม่ำเสมอ & การเริ่มต้น": [
            { id: 'explorer', title: 'นักสำรวจ', desc: 'เปิดใช้งานครบทุกหน้าหลัก', icon: '🗺️' },
            { id: 'streak15', title: 'เช็คอินต่อเนื่อง 15 วัน', desc: 'เช็คอินต่อเนื่องครบ 15 วัน', icon: '🔥🥉' },
            { id: 'streak30', title: 'เช็คอินต่อเนื่อง 30 วัน', desc: 'เช็คอินต่อเนื่องครบ 30 วัน', icon: '🔥🥈' },
            { id: 'loyalist45', title: 'ผู้ภักดี', desc: 'เช็คอินต่อเนื่องครบ 45 วัน', icon: '🔥🥇' },
        ],
        "การวางแผน & การจัดการ": [
            { id: 'proPlanner', title: 'นักวางแผนมืออาชีพ', desc: 'เพิ่มกิจกรรมในตาราง 15 ครั้ง', icon: '📝' },
            { id: 'lifeArchitect', title: 'สถาปนิกชีวิต', desc: 'เพิ่มกิจกรรมในตาราง 30 ครั้ง', icon: '🗓️' },
            { id: 'powerhouse', title: 'วันแห่งประสิทธิภาพ', desc: 'ทำเป้าหมายสำเร็จ 10 อย่างในวันเดียว', icon: '🚀' },
        ],
        "การเรียนรู้ & การทบทวน": [
            { id: 'eagerLearner', title: 'ผู้ใฝ่รู้', desc: 'สร้างหัวข้อสำหรับทบทวนครั้งแรก', icon: '🧠' },
            { id: 'knowledgeHoarder', title: 'คลังความรู้', desc: 'สร้างหัวข้อสำหรับทบทวนครบ 10 หัวข้อ', icon: '📚' },
            { id: 'cardCreator', title: 'นักสร้างการ์ด', desc: 'สร้าง Flashcard ครบ 25 ใบ', icon: '🃏' },
            { id: 'revisionMaster', title: 'เซียนทบทวน', desc: 'ทำการทบทวนสำเร็จครบ 20 ครั้ง', icon: '🎓' },
        ],
        "การโฟกัส & สุขภาพจิต": [
            { id: 'deepFocus', title: 'สมาธิแน่วแน่', desc: 'โฟกัสสำเร็จ 5 รอบติดต่อกัน', icon: '🎯' },
            { id: 'focusMarathon', title: 'มาราธอนโฟกัส', desc: 'สะสมเวลาโฟกัสรวมครบ 5 ชั่วโมง', icon: '⏳' },
            { id: 'emotionalBalance', title: 'สมดุลทางอารมณ์', desc: 'บันทึกอารมณ์ต่อเนื่อง 7 วัน', icon: '😊' },
        ],
        "สังคม & ชุมชน": [
            { id: 'firstFriend', title: 'เพื่อนคนแรก', desc: 'เพิ่มเพื่อนสำเร็จคนแรก', icon: '👋' },
            { id: 'socialButterfly', title: 'ผีเสื้อสังคม', desc: 'มีเพื่อนครบ 10 คน', icon: '🦋' },
            { id: 'chatterbox', title: 'นักสนทนา', desc: 'ส่งข้อความในแชทครบ 100 ข้อความ', icon: '💬' },
        ],
        "เหรียญตราลับ": [
             { id: 'nightOwl', title: 'นักท่องราตรี', desc: '???', icon: '🦉' },
        ]
    };
    
    badgesContainer.innerHTML = ''; // Clear previous content

    for (const category in allBadges) {
        const categoryHtml = `
            <div class="badge-category">
                <h3 class="category-title">${category}</h3>
                <div class="badges-grid">
                    ${allBadges[category].map(badge => {
                        const unlocked = state.badges && state.badges[badge.id];
                        return `
                        <div class="badge-card ${unlocked ? 'unlocked' : ''}">
                            <div class="badge-icon">${badge.icon}</div>
                            <div class="badge-info">
                                <div class="badge-title">${badge.title}</div>
                                <div class="badge-desc">${badge.desc}</div>
                            </div>
                            ${unlocked ? '<div class="badge-unlocked-tick"><i data-feather="check"></i></div>' : ''}
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        badgesContainer.innerHTML += categoryHtml;
    }

    feather.replace();
}
    function updateSettingsUI() {
        const page = document.getElementById('settings-page');
        if (!page || !page.classList.contains('active')) return;

        // ใช้โค้ดนี้เสมอ ไม่ว่าจะเป็น user หรือ guest
        applySettings();
    
        const theme = state.settings?.theme || 'light';
        document.getElementById('theme-light-btn').classList.toggle('active', theme === 'light');
        document.getElementById('theme-dark-btn').classList.toggle('active', theme === 'dark');

        if (!currentUser) return;

        const { level, expInCurrentLevel, expForNextLevel, progress } = calculateLevel(state.exp);

        const currentLevelEl = document.getElementById('current-level');
        if (currentLevelEl) currentLevelEl.textContent = `Level ${level}`;

        const expProgressTextEl = document.getElementById('exp-progress-text');
        if (expProgressTextEl) expProgressTextEl.textContent = `${expInCurrentLevel} / ${expForNextLevel} EXP`;

        const expProgressBarEl = document.getElementById('exp-progress-bar');
        if (expProgressBarEl) expProgressBarEl.style.width = `${progress}%`;
    }
    
    function renderProfilePage() {
        const page = document.getElementById('profile-page');
        // เพิ่มการตรวจสอบว่าหน้านี้กำลังถูกแสดงผลหรือไม่
        if (!page || !page.classList.contains('active')) return;
        if (!currentUser) return;

        // --- ส่วนแสดงผลโปรไฟล์ (View Mode) ---
        document.getElementById('profile-view-mode').classList.remove('hidden');
        document.getElementById('profile-edit-mode').classList.add('hidden');
    
        const displayName = state.profile.displayName || currentUser.displayName || 'User';
        renderProfilePicture(state.profile.photoURL, document.getElementById('profile-view-photo'));
        document.getElementById('profile-view-name').textContent = displayName;

        const { level } = calculateLevel(state.exp);
        const profileLevelEl = document.getElementById('profile-view-level');
        if (profileLevelEl) {
            profileLevelEl.textContent = `Level ${level}`;
        }

        document.getElementById('profile-view-lifebuddy-id').textContent = state.profile.lifebuddyId || '';
        document.getElementById('profile-view-bio').textContent = state.profile.bio || 'ยังไม่มีคำอธิบายตัวตน...';
    
        if (currentUser.metadata.creationTime) {
            const joinDate = dayjs(currentUser.metadata.creationTime).format('D MMMM YYYY');
            document.getElementById('profile-view-joindate').innerHTML = `<i data-feather="calendar"></i> เข้าร่วมเมื่อ ${joinDate}`;
        }
    
        // อัปเดตสถิติ
        document.getElementById('profile-stat-streak').textContent = state.streak || 0;
        document.getElementById('profile-stat-total-exp').textContent = state.exp || 0;
        document.getElementById('profile-stat-focus').textContent = state.focus?.totalSessions || 0;
        document.getElementById('profile-stat-moods').textContent = Object.keys(state.moods || {}).length;
    
        const followersCount = (state.followers || []).length;
        const followingCount = (state.following || []).length;
        document.getElementById('profile-stat-followers').textContent = followersCount;
        document.getElementById('profile-stat-following').textContent = followingCount;

        // แสดงความสำเร็จ (Achievements)
        const achievementsContainer = document.getElementById('profile-achievements-container');
        if (achievementsContainer) {
            const badgeData = [ 
                { id: 'focus10', title: 'นักโฟกัสหน้าใหม่'}, 
                { id: 'plan5', title: 'นักวางแผนตัวยง'}, 
                { id: 'mood7', title: 'จิตใจเบิกบาน'}, 
                { id: 'review20', title: 'ยอดนักทบทวน'} 
                // เพิ่ม badge อื่นๆ ที่ต้องการโชว์ที่นี่
            ];
            const unlockedBadges = badgeData.filter(badge => state.badges && state.badges[badge.id]);
            if (unlockedBadges.length > 0) {
                achievementsContainer.innerHTML = unlockedBadges.map(badge => `<div class="stat-item">${badge.title}</div>`).join('');
            } else {
                achievementsContainer.innerHTML = '<p class="subtle-text">ยังไม่มีความสำเร็จ... มาเริ่มสะสมกันเลย!</p>';
            }
        }

        // --- ส่วนแก้ไขโปรไฟล์ (Edit Mode) ---
        // เตรียมข้อมูลสำหรับหน้าแก้ไขไว้ล่วงหน้า
        renderProfilePicture(state.profile.photoURL, document.getElementById('profile-edit-photo'));
        document.getElementById('profile-edit-name').textContent = displayName;
        document.getElementById('profile-edit-email').textContent = currentUser.email;
        document.getElementById('display-name').value = state.profile.displayName || '';
        document.getElementById('gender').value = state.profile?.gender || 'unspecified';
        document.getElementById('age').value = state.profile?.age || '';
        document.getElementById('bio').value = state.profile?.bio || '';
        document.getElementById('show-email-toggle').checked = state.settings?.showEmail ?? true;

        // อัปเดตไอคอนทั้งหมด
        feather.replace();
    }

    // =========================================
    // ===== 6. FEATURE-SPECIFIC FUNCTIONS =====
    // =========================================

    function checkBadges() { 
        if(!currentUser) return; 
        if(!state.badges) state.badges = {};

        // --- Consistency & Onboarding ---
        state.badges.streak15 = (state.streak || 0) >= 15;
        state.badges.streak30 = (state.streak || 0) >= 30;
        state.badges.loyalist45 = (state.streak || 0) >= 45;

        // --- Planner & Productivity ---
        let totalPlannerEntries = 0;
        if (typeof state.planner === 'object' && state.planner !== null) {
            for (const date in state.planner) {
                if (Array.isArray(state.planner[date])) {
                    totalPlannerEntries += state.planner[date].length;
                }
            }
        }
        state.badges.proPlanner = totalPlannerEntries >= 15;
        state.badges.lifeArchitect = totalPlannerEntries >= 30;

        // --- Learning & Revision ---
        let totalTopics = 0;
        let totalFlashcards = 0;
        let totalReviews = 0;
    
        // === [ส่วนที่แก้ไข] ตรวจสอบว่าเป็น Object ก่อนวนลูป ===
        if (typeof state.revisitTopics === 'object' && state.revisitTopics !== null) {
            Object.values(state.revisitTopics).forEach(subjectArray => {
                if (Array.isArray(subjectArray)) {
                    totalTopics += subjectArray.length;
                    subjectArray.forEach(topic => {
                        totalFlashcards += (topic.flashcards || []).length;
                        totalReviews += (topic.reviewCount || 0);
                    });
                }
            });
        }
        // === [สิ้นสุดส่วนที่แก้ไข] ===

        state.badges.eagerLearner = totalTopics > 0;
        state.badges.knowledgeHoarder = totalTopics >= 10;
        state.badges.cardCreator = totalFlashcards >= 25;
        state.badges.revisionMaster = totalReviews >= 20;

        // --- Focus & Well-being ---
        const focusDurationHours = (state.settings?.focusDuration || 25) / 60;
        state.badges.deepFocus = (state.focus?.combo || 0) >= 5;
        state.badges.focusMarathon = (state.focus?.totalSessions || 0) * focusDurationHours >= 5;
    
        let moodStreak = 0; 
        if(typeof state.moods === 'object' && state.moods !== null) {
            let sortedMoodDays = Object.keys(state.moods).sort((a,b) => b.localeCompare(a)); 
            for(let i = 0; i < sortedMoodDays.length; i++) { 
                if (i === 0 || dayjs(sortedMoodDays[i-1]).diff(dayjs(sortedMoodDays[i]), 'day') === 1) { 
                    moodStreak++; 
                } else { break; } 
            }
        }
        state.badges.emotionalBalance = moodStreak >= 7;

        // --- Social & Community ---
        state.badges.firstFriend = (state.friends || []).length > 0;
        state.badges.socialButterfly = (state.friends || []).length >= 10;

        // --- Backward Compatibility ---
        state.badges.focus10 = (state.focus?.totalSessions || 0) >= 10;
        if(typeof state.planner === 'object' && state.planner !== null) {
            let uniquePlannerDays = new Set(Object.keys(state.planner).filter(key => state.planner[key] && state.planner[key].length > 0));
            state.badges.plan5 = uniquePlannerDays.size >= 5;
        }
    }
    
    
    function calculateLevel(exp) {
        if (typeof exp === 'undefined' || exp === null) exp = 0;

        let currentLevel = 1;
        let expForNextLevel = 100; // EXP ที่ต้องใช้เพื่อไปเลเวล 2
        let accumulatedExp = 0; // EXP สะสมของเลเวลก่อนหน้าทั้งหมด

        while (exp >= accumulatedExp + expForNextLevel && currentLevel < 999) {
            accumulatedExp += expForNextLevel;
            currentLevel++;
            // ทุกๆ เลเวลถัดไป จะใช้ EXP เพิ่มขึ้น 100
            // Level 1 -> 2: 100 EXP
            // Level 2 -> 3: 200 EXP
            // Level 3 -> 4: 300 EXP
            expForNextLevel = currentLevel * 100;
        }
    
        const expInCurrentLevel = exp - accumulatedExp;

        // ถ้าเลเวล 999 แล้ว ให้ถือว่าเต็ม
        if (currentLevel === 999) {
            return { level: 999, expInCurrentLevel: expForNextLevel, expForNextLevel: expForNextLevel, progress: 100 };
        }

        const progress = Math.min(100, (expInCurrentLevel / expForNextLevel) * 100);

        return { level: currentLevel, expInCurrentLevel, expForNextLevel, progress };
    }
    
    window.renderPlannerCalendar = (date) => {
        const calendarEl = document.getElementById('planner-calendar');
        if (!calendarEl) return;
        
        currentPlannerDate = date;
        document.getElementById('planner-month-year').textContent = date.format('MMMM YYYY');
        
        calendarEl.innerHTML = '';
        const monthStart = date.startOf('month'), startDay = monthStart.day(), daysInMonth = date.daysInMonth();
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`);
        for (let i = 0; i < startDay; i++) calendarEl.innerHTML += '<div></div>';
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            dayElem.textContent = i;
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            if (currentDate.isSame(dayjs(), 'day')) dayElem.classList.add('today');
            if (dateStr === selectedPlannerDate) dayElem.classList.add('selected');
            if (state.planner && state.planner[dateStr]?.length > 0) dayElem.innerHTML += '<div class="event-dot"></div>';
            dayElem.addEventListener('click', () => { selectedPlannerDate = dateStr; renderPlannerCalendar(date); });
            calendarEl.appendChild(dayElem);
        }
        renderPlannerDetails(selectedPlannerDate);
    };

    function renderPlannerDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-planner-date-display');
        const eventsList = document.getElementById('events-list');
        if (!dateDisplay || !eventsList) return;

        dateDisplay.textContent = `สำหรับวันที่ ${dayjs(dateStr).format('D MMMM')}`;
        eventsList.innerHTML = (state.planner[dateStr] || []).sort((a,b) => a.time.localeCompare(b.time)).map(e => `<li><strong>${e.time}</strong> - ${e.name} (${e.category})</li>`).join('') || '<li>ไม่มีกิจกรรม</li>';
    }

    window.renderRevisitList = () => {
        const container = document.getElementById('revisit-topics-by-subject');
        if (!container) return;

        container.innerHTML = ''; // ล้างของเก่า
        let hasTopics = false;

        for (const subject in state.revisitTopics) {
            if (state.revisitTopics[subject].length > 0) {
                hasTopics = true;
                const subjectGroup = document.createElement('div');
                subjectGroup.className = 'subject-group';
            
                // สร้าง Title ของวิชา
                const subjectTitle = document.createElement('h3');
                subjectTitle.className = 'subject-title';
                subjectTitle.textContent = document.querySelector(`#revisit-subject option[value="${subject}"]`).textContent;
                subjectGroup.appendChild(subjectTitle);

                // สร้าง List ของหัวข้อในวิชานั้นๆ
                const topicList = document.createElement('ul');
                topicList.className = 'topic-list';
                topicList.innerHTML = state.revisitTopics[subject].map(topic => `
                    <li class="topic-item">
                        <div class="topic-info">
                            <span>${topic.name}</span>
                            <div class="next-review">ทบทวนครั้งถัดไป: ${dayjs(topic.nextReviewDate).format('D MMM YYYY')}</div>
                        </div>
                        <button class="small-btn" onclick="startReviewSession('${subject}', ${topic.id})">ทบทวน</button>
                    </li>
                `).join('');
                subjectGroup.appendChild(topicList);
                container.appendChild(subjectGroup);
            }
        }
    
        if (!hasTopics) {
            container.innerHTML = '<p class="subtle-text" style="text-align:center;">ยังไม่มีหัวข้อสำหรับทบทวน ลองเพิ่มดูสิ!</p>';
        }

        // อัปเดต Summary ในหน้า Home ด้วย
        updateHomePageUI();
    };

    window.renderMoodCalendar = (date) => {
        const calendarEl = document.getElementById('mood-calendar');
        if (!calendarEl) return;

        currentMoodDate = date;
        document.getElementById('mood-month-year').textContent = date.format('MMMM YYYY');
        
        calendarEl.innerHTML = '';
        const monthStart = date.startOf('month'), startDay = monthStart.day(), daysInMonth = date.daysInMonth();
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`);
        for (let i = 0; i < startDay; i++) calendarEl.innerHTML += '<div></div>';
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            dayElem.textContent = i;
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            if (currentDate.isSame(dayjs(), 'day')) dayElem.classList.add('today');
            if (dateStr === selectedMoodDate) dayElem.classList.add('selected');
            const moodEntry = state.moods && state.moods[dateStr];
            if (moodEntry) {
                const moodColors = { happy: '#ffcc00', excited: '#ff9500', neutral: '#8e8e93', sad: '#007aff', angry: '#ff3b30' };
                dayElem.style.backgroundColor = moodColors[moodEntry.mood];
                dayElem.style.color = 'white';
            }
            dayElem.addEventListener('click', () => { selectedMoodDate = dateStr; renderMoodCalendar(date); });
            calendarEl.appendChild(dayElem);
        }
        renderMoodDetails(selectedMoodDate);
    };
    
    function renderMoodDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-mood-date-display');
        const detailsEl = document.getElementById('mood-details');
        if(!dateDisplay || !detailsEl) return;

        dateDisplay.textContent = dayjs(dateStr).format('D MMMM YYYY');
        const entry = state.moods && state.moods[dateStr];
        if (entry) {
            detailsEl.innerHTML = `<p><strong>อารมณ์:</strong> ${entry.mood}</p><p><strong>บันทึก:</strong> ${entry.notes || '<em>ไม่มี</em>'}</p><p><strong>เหตุผล:</strong> ${(entry.reasons || []).join(', ') || '<em>ไม่ระบุ</em>'}</p>`;
        } else {
            detailsEl.innerHTML = '<p><i>ยังไม่มีการบันทึกสำหรับวันนี้</i></p>';
        }
    }    

    function updateCoins(amount, reason) { 
        if (!currentUser) return; 
        state.coins = (state.coins || 0) + amount; 
        const actionText = amount > 0 ? "ได้รับ" : "ใช้"; 
        showToast(`${actionText} ${Math.abs(amount)} Coins! (${reason})`); 
        if (!state.coinHistory) state.coinHistory = []; 
        state.coinHistory.unshift({ amount: amount, reason: reason, date: new Date().toISOString() }); 
        if (state.coinHistory.length > 50) { state.coinHistory.pop(); } 
        if (amount < 0) { state.lastCoinUsage = new Date().toISOString(); } 
        updateHeaderUI(); 
        renderWishList(); }
    
    function checkForDailyBonus() { const today = dayjs().format('YYYY-MM-DD'); 
        if (state.lastBonusDate === today) return; 
        const checkedInToday = state.lastCheckIn === today; 
        const focusedToday = state.focus.lastFocusDate === today && state.focus.todaySessions > 0; 
        const moodLoggedToday = state.moods[today] !== undefined; 
        if (checkedInToday && focusedToday && moodLoggedToday) { updateCoins(50, "โบนัสความขยัน!"); 
            state.lastBonusDate = today; saveState(); 
            Swal.fire('ยอดเยี่ยม!', 'คุณได้รับโบนัสความขยัน +50 Coins!', 'success'); } }

    function checkForIdleCoins() { 
        if (!currentUser || !state.lastCoinUsage) return; 
        const daysSinceLastUse = dayjs().diff(dayjs(state.lastCoinUsage), 'day'); 
        if (daysSinceLastUse >= 7 && state.coins > 100) { setTimeout(() => { showToast("เหรียญในกระเป๋าคิดถึงคุณนะ! ลองไปร้านค้าดูสิ 🛍️"); }, 3000); 
        state.lastCoinUsage = new Date().toISOString(); } }

    function renderWishList() { 
        const wishlistContainer = document.getElementById('wishlist-container'); 
        if (!currentUser || !wishlistContainer) return; 
        const wishlist = state.wishList || { name: 'ของชิ้นต่อไป!', target: 1000 }; 
        const currentCoins = state.coins || 0; 
        const targetCoins = wishlist.target || 1000; 
        const percentage = Math.min(100, (currentCoins / targetCoins) * 100); 
        document.getElementById('wishlist-name').textContent = wishlist.name || 'ของชิ้นต่อไป!'; 
        document.getElementById('wishlist-progress-text').textContent = `${currentCoins} / ${targetCoins}`; 
        document.getElementById('wishlist-percentage').textContent = `${Math.floor(percentage)}%`; 
        document.getElementById('wishlist-progress-bar').style.width = `${percentage}%`; }

    window.startReviewSession = (subject, topicId) => {
    // หาหัวข้อที่ถูกต้องจาก subject และ id
        currentQuizTopic = state.revisitTopics[subject].find(t => t.id === topicId);
        if (!currentQuizTopic) return;
    
        // สลับหน้าจอ - ใช้ showPage เพื่อความแน่นอน
        showPage('revisit'); // อยู่หน้าเดิม แต่จะเปลี่ยน view ข้างใน
        document.getElementById('revisit-list-view').classList.add('hidden');
        document.getElementById('flashcard-view').classList.remove('hidden');

        // แสดงข้อมูลหัวข้อ
        document.getElementById('flashcard-topic-title').textContent = currentQuizTopic.name;
        document.getElementById('flashcard-topic-notes').textContent = currentQuizTopic.notes || "ไม่มีโน้ตย่อ";
    
        // เก็บข้อมูลสำหรับใช้ภายหลัง
        const flashcardForm = document.getElementById('flashcard-form');
        flashcardForm.dataset.subject = subject;
        flashcardForm.dataset.topicId = String(topicId); // แปลงเป็น String เพื่อความแน่นอน

        // เตรียม Flashcard สำหรับเล่น
        shuffledFlashcards = [...(currentQuizTopic.flashcards || [])].sort(() => 0.5 - Math.random());
        currentCardIndex = 0;
    
        const flashcardQuizEl = document.getElementById('flashcard-quiz');
        if(shuffledFlashcards.length > 0) {
            flashcardQuizEl.classList.remove('hidden');
            displayNextFlashcard(); 
        } else { 
            flashcardQuizEl.classList.add('hidden'); 
            showToast("ยังไม่มี Flashcard ในหัวข้อนี้ ลองสร้างเพิ่มดูสิ!");
        }
    }

    async function handleEditWishList() {
        if (!currentUser) return;

        const currentWishList = state.wishList || { name: 'ของชิ้นต่อไป!', target: 1000 };

        const { value: formValues } = await Swal.fire({
            title: 'แก้ไขเป้าหมาย Wish List',
            html:
                `<input id="swal-input-name" class="swal2-input" placeholder="ชื่อของที่อยากได้" value="${currentWishList.name}">` +
                `<input id="swal-input-target" type="number" class="swal2-input" placeholder="ราคา (Coins)" value="${currentWishList.target}" min="1">`,
            focusConfirm: false,
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value.trim();
                const target = parseInt(document.getElementById('swal-input-target').value);
                if (!name || !target || target <= 0) {
                    Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
                    return false;
                }
                return { name: name, target: target };
            },
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก'
        });

        if (formValues) {
            state.wishList = {
                name: formValues.name,
                target: formValues.target
            };
            saveState();
            renderWishList();
            Swal.fire('สำเร็จ!', 'อัปเดต Wish List ของคุณแล้ว', 'success');
        }
    }

    // ===> แก้ไขฟังก์ชัน displayNextFlashcard <===
    function displayNextFlashcard() {
        if (currentCardIndex >= shuffledFlashcards.length) {
            finishQuiz();
            return;
        }
        const card = shuffledFlashcards[currentCardIndex];
        const flashcardEl = document.querySelector('#flashcard-view .flashcard'); // ทำให้ selector เฉพาะเจาะจงขึ้น
    
        if (flashcardEl) { // เพิ่มการตรวจสอบ
            flashcardEl.classList.remove('flipped');
        
            setTimeout(() => {
                document.getElementById('quiz-question').textContent = card.q;
                document.getElementById('quiz-answer').textContent = card.a;
                document.getElementById('reveal-answer-btn').classList.remove('hidden');
                document.getElementById('quiz-feedback-btns').classList.add('hidden');
            }, 300);
        }
    }

    function finishQuiz() {
        Swal.fire({
            title: 'ทบทวนหัวข้อนี้เสร็จแล้ว!',
            text: 'เก่งมาก! คุณได้ทบทวน Flashcard ทั้งหมดแล้ว',
            icon: 'success',
            confirmButtonText: 'ยอดเยี่ยม!'
        });
        
        const nextLevel = (currentQuizTopic.level || 0) + 1;
        
        if (nextLevel < currentQuizTopic.reviewIntervals.length) {
            currentQuizTopic.level = nextLevel;
            const daysToAdd = currentQuizTopic.reviewIntervals[nextLevel];
            currentQuizTopic.nextReviewDate = dayjs().add(daysToAdd, 'day').format('YYYY-MM-DD');
        } else {
            currentQuizTopic.nextReviewDate = dayjs().add(1, 'year').format('YYYY-MM-DD'); // ทบทวนครบรอบแล้ว
            showToast("ยินดีด้วย! คุณทบทวนหัวข้อนี้ครบรอบแล้ว");
        }
        
        addExp(5);
        saveState();
        
        // กลับไปหน้ารวม
        document.getElementById('back-to-revisit-list').click();
    }

    function renderFocusStats(period = 'day') {
        const displayEl = document.getElementById('focus-stats-display');
        if (!displayEl) return;

        const allFocusHistory = state.focusHistory || [];
        
        let filteredHistory = [];
        const now = dayjs();
        if (period === 'day') {
            filteredHistory = allFocusHistory.filter(item => dayjs(item.date).isSame(now, 'day'));
        } else if (period === 'week') {
            filteredHistory = allFocusHistory.filter(item => dayjs(item.date).isSame(now, 'week'));
        } else {
            filteredHistory = allFocusHistory;
        }

        if (filteredHistory.length === 0) {
            displayEl.innerHTML = '<p style="text-align:center; color:var(--subtle-text-color);"><i>ยังไม่มีข้อมูลการโฟกัสในช่วงเวลานี้</i></p>';
            return;
        }

        const statsByTopic = filteredHistory.reduce((acc, item) => {
            const topicKey = item.topic || 'general';
            if (!acc[topicKey]) {
                acc[topicKey] = 0;
            }
            acc[topicKey] += item.duration;
            return acc;
        }, {});

        const sortedStats = Object.entries(statsByTopic)
            .map(([topic, totalMinutes]) => ({ topic, totalMinutes }))
            .sort((a, b) => b.totalMinutes - a.totalMinutes);

        const topicOptions = {};
        document.querySelectorAll('#focus-topic option').forEach(opt => {
            topicOptions[opt.value] = opt.textContent;
        });

        displayEl.innerHTML = sortedStats.map(stat => {
            const topicName = topicOptions[stat.topic] || 'เรื่องทั่วไป';
            const hours = Math.floor(stat.totalMinutes / 60);
            const minutes = stat.totalMinutes % 60;
            let timeString = '';
            if (hours > 0) timeString += `${hours} ชั่วโมง `;
            if (minutes > 0 || hours === 0) timeString += `${minutes} นาที`;
            if (timeString.trim() === '0 นาที') timeString = 'น้อยกว่า 1 นาที';

            return `
                <div class="stat-item-focus">
                    <span class="stat-topic-name">${topicName}</span>
                    <span class="stat-topic-time">${timeString}</span>
                </div>
            `;
        }).join('');
    }
    
    function startTimer() {
        const startBtn = document.getElementById('start-timer-btn');
        if (!startBtn) return;

        startBtn.innerHTML = '<i data-feather="pause"></i> หยุดชั่วคราว';
        feather.replace();

        // ปิดการใช้งาน dropdown และปุ่มตั้งค่าขณะจับเวลา
        const topicSelect = document.getElementById('focus-topic');
        const settingsBtn = document.getElementById('settings-timer-btn');
        if (topicSelect) topicSelect.disabled = true;
        if (settingsBtn) settingsBtn.disabled = true;

        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;

                if (isFocusing) {
                    // --- จบช่วง Focus ---
                    state.focus.combo = (state.focus.combo || 0) + 1;
                    state.focus.todaySessions = (state.focus.todaySessions || 0) + 1;
                    state.focus.totalSessions = (state.focus.totalSessions || 0) + 1;
                    state.focus.lastFocusDate = dayjs().format('YYYY-MM-DD');

                    const topicSelectEl = document.getElementById('focus-topic');
                    const topicText = topicSelectEl ? topicSelectEl.options[topicSelectEl.selectedIndex].text : 'เรื่องทั่วไป';
                
                    // คำนวณรางวัล
                    const baseCoin = 10;
                    const comboBonus = state.focus.combo >= 5 ? 20 : state.focus.combo >= 3 ? 10 : 0;
                    const totalCoin = baseCoin + comboBonus;

                    updateCoins(totalCoin, `โฟกัส: ${topicText}`);
                    addExp(25);

                    // บันทึกประวัติการโฟกัส (สำหรับหน้าสถิติ)
                    const topicValue = topicSelectEl ? topicSelectEl.value : 'general';
                    const duration = state.settings.focusDuration || 25;

                    if (!state.focusHistory) state.focusHistory = [];
                    state.focusHistory.push({
                        date: new Date().toISOString(),
                        topic: topicValue,
                        duration: duration // บันทึกเป็นนาที
                    });
                
                    // จำกัดขนาดของ History เพื่อไม่ให้ใหญ่เกินไป
                    if(state.focusHistory.length > 500) {
                        state.focusHistory.shift();
                    }

                    saveState();
                    checkForDailyBonus();
                    renderFocusStats(); // อัปเดตสถิติหลังโฟกัสเสร็จ

                    // สลับไปโหมดพัก
                    isFocusing = false;
                    timeLeft = (state.settings.breakDuration || 5) * 60;
                    document.getElementById('timer-mode').textContent = 'Break';
                    updateTimerDisplay(timeLeft);
                
                    Swal.fire({
                        title: "เยี่ยมมาก! โฟกัสสำเร็จ",
                        text: `พักสักหน่อยนะ 🧘 (${state.settings.breakDuration} นาที)`,
                        icon: "success",
                        timer: 5000,
                        timerProgressBar: true,
                        didClose: () => {
                            // ถ้าผู้ใช้ปิด popup ก่อนเวลาหมด ให้เริ่มจับเวลาพักต่อเลย
                            if (!timerInterval) startTimer();
                        }
                    });

                } else {
                    // --- จบช่วงพัก (Break) ---
                    isFocusing = true;
                    timeLeft = (state.settings.focusDuration || 25) * 60;
                    document.getElementById('timer-mode').textContent = 'Focus';
                    updateTimerDisplay(timeLeft);
                
                    // เปิดให้เลือกหัวข้อและตั้งค่าได้อีกครั้ง
                    if (topicSelect) topicSelect.disabled = false;
                    if (settingsBtn) settingsBtn.disabled = false;

                    Swal.fire("หมดเวลาพักแล้ว", "กลับมาโฟกัสกันต่อ! 💪", "info");
                
                    // รีเซ็ตสถานะปุ่ม แต่ไม่รีเซ็ตเวลา
                    const startBtnEl = document.getElementById('start-timer-btn');
                    if(startBtnEl) {
                        startBtnEl.innerHTML = '<i data-feather="play"></i> เริ่ม';
                        feather.replace();
                    }
                }
            }
        }, 1000);
    }

    function stopTimer() { 
        clearInterval(timerInterval); 
        const startBtn = document.getElementById('start-timer-btn'); 
        startBtn.innerHTML = '<i data-feather="play"></i> ทำต่อ'; 
        feather.replace(); }

    function resetTimer() { 
        clearInterval(timerInterval); 
        timerInterval = null; 
        isFocusing = true; 
        timeLeft = (state.settings?.focusDuration || 25) * 60; 
    
        const timerDisplay = document.getElementById('timer-display'); 
        if(timerDisplay) updateTimerDisplay(timeLeft); 
    
        const timerMode = document.getElementById('timer-mode'); 
        if(timerMode) timerMode.textContent = 'Focus'; 
    
        const startBtn = document.getElementById('start-timer-btn'); 
        if(startBtn) { 
            startBtn.innerHTML = '<i data-feather="play"></i> เริ่ม'; 
            feather.replace(); 
        }
    
        const topicSelect = document.getElementById('focus-topic');
        const settingsBtn = document.getElementById('settings-timer-btn');
        if (topicSelect) topicSelect.disabled = false;
        if (settingsBtn) settingsBtn.disabled = false;
    }

    function updateTimerDisplay(time) { 
        const timerDisplayEl = document.getElementById('timer-display'); 
        if (!timerDisplayEl) return; 
        const minutes = Math.floor(time / 60); 
        const seconds = time % 60; 
        timerDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }
    
    function renderProfilePicture(photoURL, imgElement) { 
        if (!imgElement) return; 
        const defaultImg = 'assets/profiles/startprofile.png'; 
        imgElement.src = photoURL || defaultImg; 
        imgElement.onerror = () => { imgElement.src = defaultImg; }; }

    function populateProfileSelector() { 
        const container = document.querySelector('.profile-selector-body'); if (!container) return; container.innerHTML = ''; profilePictures.forEach(pic => { const path = `assets/profiles/${pic}`; const option = document.createElement('div'); option.className = 'profile-option'; option.dataset.url = path; const img = document.createElement('img'); img.src = path; option.appendChild(img); if (path === state.profile.photoURL) { option.classList.add('selected'); } container.appendChild(option); }); }
    
    function renderProfilePage() {
        const page = document.getElementById('profile-page');
        if (!page || !page.classList.contains('active')) return;
        if (!currentUser) return;

        // --- ส่วนแสดงผลโปรไฟล์ (View Mode) ---
        document.getElementById('profile-view-mode').classList.remove('hidden');
        document.getElementById('profile-edit-mode').classList.add('hidden');
    
        const displayName = state.profile.displayName || currentUser.displayName || 'User';
        renderProfilePicture(state.profile.photoURL, document.getElementById('profile-view-photo'));
        document.getElementById('profile-view-name').textContent = displayName;

        const { level } = calculateLevel(state.exp);
        const profileLevelEl = document.getElementById('profile-view-level');
        if (profileLevelEl) {
            profileLevelEl.textContent = `Level ${level}`;
        }

        document.getElementById('profile-view-lifebuddy-id').textContent = state.profile.lifebuddyId || '';
        document.getElementById('profile-view-bio').textContent = state.profile.bio || 'ยังไม่มีคำอธิบายตัวตน...';
    
        if (currentUser.metadata.creationTime) {
            const joinDate = dayjs(currentUser.metadata.creationTime).format('D MMMM YYYY');
            document.getElementById('profile-view-joindate').innerHTML = `<i data-feather="calendar"></i> เข้าร่วมเมื่อ ${joinDate}`;
        }
    
        // อัปเดตสถิติ
        document.getElementById('profile-stat-streak').textContent = state.streak || 0;
        document.getElementById('profile-stat-total-exp').textContent = state.exp || 0;
        document.getElementById('profile-stat-focus').textContent = state.focus?.totalSessions || 0;
        document.getElementById('profile-stat-moods').textContent = Object.keys(state.moods || {}).length;
    
        // แสดงความสำเร็จ (Achievements)
        const achievementsContainer = document.getElementById('profile-achievements-container');
        if (achievementsContainer) {
            const badgeData = [ 
                { id: 'focus10', title: 'นักโฟกัสหน้าใหม่'}, 
                { id: 'plan5', title: 'นักวางแผนตัวยง'}, 
                { id: 'mood7', title: 'จิตใจเบิกบาน'}, 
                { id: 'review20', title: 'ยอดนักทบทวน'} 
            ];
            const unlockedBadges = badgeData.filter(badge => state.badges && state.badges[badge.id]);
            if (unlockedBadges.length > 0) {
                achievementsContainer.innerHTML = unlockedBadges.map(badge => `<div class="stat-item">${badge.title}</div>`).join('');
            } else {
                achievementsContainer.innerHTML = '<p class="subtle-text">ยังไม่มีความสำเร็จ... มาเริ่มสะสมกันเลย!</p>';
            }
        }

        // --- ส่วนแก้ไขโปรไฟล์ (Edit Mode) ---
        renderProfilePicture(state.profile.photoURL, document.getElementById('profile-edit-photo'));
        document.getElementById('profile-edit-name').textContent = displayName;
        document.getElementById('profile-edit-email').textContent = currentUser.email;
        document.getElementById('display-name').value = state.profile.displayName || '';
        document.getElementById('gender').value = state.profile?.gender || 'unspecified';
        document.getElementById('age').value = state.profile?.age || '';
        document.getElementById('bio').value = state.profile?.bio || '';
        document.getElementById('show-email-toggle').checked = state.settings?.showEmail ?? true;
    
        renderWishList();
        feather.replace();
    }

    
    function setupFriendListeners(userId) {
        // 1. ป้องกันการทำงานซ้ำซ้อน ถ้าไม่มี userId ให้หยุดทำงาน
        if (!userId) return;

        // 2. เคลียร์ Listener เก่าที่อาจจะยังทำงานค้างอยู่ทุกครั้งที่เรียกใช้ฟังก์ชันนี้
        // เพื่อป้องกันการรั่วไหลของหน่วยความจำ (Memory Leak)
        if (friendListeners.length > 0) {
            friendListeners.forEach(unsubscribe => unsubscribe());
            friendListeners = []; // รีเซ็ต array ของ listeners
        }

        // 3. สร้าง Listener ตัวใหม่เพียงตัวเดียวเพื่อ "ฟัง" การเปลี่ยนแปลงข้อมูลทั้งหมดของ user ที่ล็อกอินอยู่
        // การใช้ Listener ตัวเดียวมีประสิทธิภาพมากกว่าการสร้างหลายๆ ตัวสำหรับแต่ละ field
        const userListener = db.collection('users').doc(userId).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();

                // 4. อัปเดต state ในเครื่อง (client-side) ด้วยข้อมูลล่าสุดจาก Firestore
                state.following = data.following || []; // คนที่เรากำลังติดตาม
                state.followers = data.followers || []; // คนที่ติดตามเรา
                state.followRequests = data.followRequests || []; // คำขอติดตามที่ได้รับ
                state.sentFollowRequests = data.sentFollowRequests || []; // คำขอติดตามที่เราส่งไป

                // 5. จัดการการแสดงผลการแจ้งเตือน (จุดสีแดงและตัวเลข)
                const requestCount = state.followRequests.length;
                const badge = document.getElementById('request-count-badge'); // ตัวเลขในแท็บ "คำขอ"
                const dot = document.getElementById('unread-notification-dot');   // จุดแดงที่ไอคอนแชทบน Header

                // อัปเดตตัวเลขในแท็บ "คำขอ" ในหน้า Community
                if (badge) {
                    badge.textContent = requestCount;
                    badge.classList.toggle('hidden', requestCount === 0);
                }
                // อัปเดตจุดแจ้งเตือนสีแดงที่ Header
                if (dot) {
                    dot.classList.toggle('hidden', requestCount === 0);
                }

                // 6. อัปเดต UI ของหน้าที่กำลังเปิดอยู่แบบ Real-time
                const communityPage = document.getElementById('community-page');
                const profilePage = document.getElementById('profile-page');
            
                // ถ้ากำลังเปิดหน้า Community อยู่ ให้ re-render รายการให้ถูกต้องตามแท็บที่เปิด
                if (communityPage && communityPage.classList.contains('active')) {
                    const activeTab = communityPage.querySelector('.tab-btn.active');
                    if (activeTab && activeTab.dataset.tab === 'requests') {
                        renderFollowRequests(); // ถ้าอยู่แท็บ "คำขอ" ก็ re-render หน้าคำขอ
                    } else {
                        renderFollowingList(); // ถ้าอยู่แท็บ "กำลังติดตาม" ก็ re-render หน้านั้น
                    }
                }
            
                // ถ้ากำลังเปิดหน้า Profile อยู่ ให้ re-render เพื่ออัปเดตจำนวนผู้ติดตาม/กำลังติดตาม
                if (profilePage && profilePage.classList.contains('active')) {
                    renderProfilePage();
                }
            }
        }, error => {
            // จัดการกรณีเกิด Error ขณะฟังข้อมูล
            console.error("Error listening to user document:", error);
        });

        // 7. เก็บฟังก์ชัน unsubscribe ของ Listener ใหม่ไว้ใน array เพื่อให้เราสามารถหยุดการทำงานของมันได้ในอนาคต
        friendListeners.push(userListener);
    }

    async function renderFollowingList() {
        const listEl = document.getElementById('friends-list'); // ยังใช้ id เดิมของ list
        if (!listEl) return;
        listEl.innerHTML = '<li>กำลังโหลด...</li>';

        const followingIds = state.following || [];
        if (followingIds.length === 0) {
            listEl.innerHTML = '<li>ยังไม่ได้ติดตามใครเลย...</li>';
            return;
        }

        try {
            const followingPromises = followingIds.map(uid => db.collection('users').doc(uid).get());
            const followingDocs = await Promise.all(followingPromises);

            listEl.innerHTML = followingDocs.map(doc => {
                if (!doc.exists) return '';
                const friendData = doc.data();

                const isMutual = (friendData.following || []).includes(currentUser.uid);

                const displayName = friendData.profile.displayName || 'User';
                const img = document.createElement('img');
                renderProfilePicture(friendData.profile.photoURL, img);

                const listItemClass = isMutual ? 'user-list-item' : 'user-list-item disabled';
                const onClickAction = isMutual ? 
                    `onclick="startChat('${doc.id}')"` : 
                    `onclick="showToast('ต้องติดตามซึ่งกันและกันถึงจะแชทได้')"`;
                const mutualIcon = isMutual ? '<i data-feather="repeat" class="mutual-icon" title="ติดตามซึ่งกันและกัน"></i>' : '';

                return `
                    <li class="${listItemClass}" ${onClickAction}>
                        <div class="user-list-avatar">${img.outerHTML}</div>
                        <div class="user-info">
                            <h4>${displayName}</h4>
                            <p>Level ${calculateLevel(friendData.exp || 0).level}</p>
                        </div>
                        ${mutualIcon}
                    </li>
                `;
            }).join('');

            feather.replace();

        } catch (error) {
            console.error("Error rendering following list:", error);
            listEl.innerHTML = '<li>เกิดข้อผิดพลาดในการโหลดข้อมูล</li>';
        }
    }

    // ฟังก์ชันสำหรับจัดการการค้นหาเพื่อน
    let lastSearchResults = [];
    async function handleFriendSearch(e) {
        e.preventDefault();
        const searchInput = document.getElementById('search-friends-input');
        const query = searchInput.value.trim();
        if (query.length < 3) {
         showToast("กรุณากรอกอย่างน้อย 3 ตัวอักษร");
            return;
        }

        const resultsContainer = document.getElementById('search-results-container');
        resultsContainer.innerHTML = '<p>กำลังค้นหา...</p>';

        try {
            // ค้นหาด้วย displayName
            const nameQuery = db.collection('users')
                .where('profile.displayName', '>=', query)
                .where('profile.displayName', '<=', query + '\uf8ff')
                .limit(10);
        
            // ค้นหาด้วย LifeBuddy ID
            const idQuery = db.collection('users')
                .where('profile.lifebuddyId', '==', query)
                .limit(10);
        
            const [nameSnapshot, idSnapshot] = await Promise.all([nameQuery.get(), idQuery.get()]);

            const results = new Map();
        
            nameSnapshot.forEach(doc => {
                if (doc.id !== currentUser.uid) { // ไม่แสดงตัวเอง
                    results.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
            idSnapshot.forEach(doc => {
                if (doc.id !== currentUser.uid) {
                    results.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });

            renderSearchResults(Array.from(results.values()));

        } catch (error) {
            console.error("Error searching for friends:", error);
            resultsContainer.innerHTML = '<p class="error-message">เกิดข้อผิดพลาดในการค้นหา</p>';
        }
    }

    // ฟังก์ชันสำหรับแสดงผลการค้นหา
    function renderSearchResults(users) {
        lastSearchResults = users;
        const resultsContainer = document.getElementById('search-results-container');
        if (users.length === 0) {
            resultsContainer.innerHTML = '<p>ไม่พบผู้ใช้</p>';
            return;
        }

        resultsContainer.innerHTML = users.map(user => {
            const profile = user.profile;
            const amIFollowing = (state.following || []).includes(user.id);
            const requestSent = (state.sentFollowRequests || []).includes(user.id);

            let actionButton = '';
            if (amIFollowing) {
                actionButton = `<button class="small-btn btn-secondary" disabled>กำลังติดตาม</button>`;
            } else if (requestSent) {
                actionButton = `<button class="small-btn" disabled>ส่งคำขอแล้ว</button>`;
            } else {
                actionButton = `<button class="small-btn" onclick="handleSendFollowRequest('${user.id}')">ติดตาม</button>`;
            }

            return `
                <div class="search-result-item">
                    <img src="${profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="profile-pic">
                    <div class="user-info">
                        <h4>${profile.displayName || 'ผู้ใช้'}</h4>
                        <p class="subtle-text">${profile.lifebuddyId || ''}</p>
                    </div>
                    <div class="user-actions">
                        ${actionButton}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ฟังก์ชันใหม่: สำหรับส่งคำขอติดตาม
    window.handleSendFollowRequest = async (recipientId) => {
        if (!currentUser) return;

        const senderId = currentUser.uid;
        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);

        const batch = db.batch();

        // 1. เพิ่ม recipientId ใน "sentFollowRequests" ของผู้ส่ง
        batch.update(senderRef, {
            sentFollowRequests: firebase.firestore.FieldValue.arrayUnion(recipientId)
        });
        // 2. เพิ่ม senderId ใน "followRequests" ของผู้รับ
        batch.update(recipientRef, {
            followRequests: firebase.firestore.FieldValue.arrayUnion(senderId)
        });

        await batch.commit();
        showToast("ส่งคำขอติดตามแล้ว!");

        // อัปเดต state ในเครื่องและ UI ทันที
        if (!state.sentFollowRequests) state.sentFollowRequests = [];
        state.sentFollowRequests.push(recipientId);
        renderSearchResults(lastSearchResults); // อัปเดตปุ่มในหน้าค้นหา
    };

    // ฟังก์ชันใหม่: สำหรับตอบรับคำขอ
    window.handleAcceptFollowRequest = async (senderId) => {
        if (!currentUser) return;
        const recipientId = currentUser.uid; // ตัวเราคือผู้รับ

        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);

        const batch = db.batch();

        // 1. ทำให้ผู้ส่ง "กำลังติดตาม" เรา
        batch.update(senderRef, {
            following: firebase.firestore.FieldValue.arrayUnion(recipientId),
            sentFollowRequests: firebase.firestore.FieldValue.arrayRemove(recipientId) // ลบคำขอที่ส่งออก
        });
        // 2. ทำให้เรามีผู้ส่งเป็น "ผู้ติดตาม"
        batch.update(recipientRef, {
            followers: firebase.firestore.FieldValue.arrayUnion(senderId),
            followRequests: firebase.firestore.FieldValue.arrayRemove(senderId) // ลบคำขอที่ได้รับออก
        });

        await batch.commit();
        showToast("ตอบรับคำขอแล้ว");
        // ไม่ต้องอัปเดต state ในเครื่อง เพราะ listener จะทำงานและ re-render เอง
    };

    // ฟังก์ชันใหม่: สำหรับปฏิเสธคำขอ
    window.handleDeclineFollowRequest = async (senderId) => {
        if (!currentUser) return;
        const recipientId = currentUser.uid;

        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);

        const batch = db.batch();
        // ลบคำขอออกจากทั้งสองฝั่ง
        batch.update(senderRef, { sentFollowRequests: firebase.firestore.FieldValue.arrayRemove(recipientId) });
        batch.update(recipientRef, { followRequests: firebase.firestore.FieldValue.arrayRemove(senderId) });

        await batch.commit();
        showToast("ปฏิเสธคำขอแล้ว");
    };

    // ฟังก์ชันใหม่: สำหรับแสดงผลคำขอที่ได้รับ
    async function renderFollowRequests() {
        const listEl = document.getElementById('friend-requests-list');
        if (!listEl) return;
        listEl.innerHTML = '<li>กำลังโหลด...</li>';

        const requestIds = state.followRequests || [];
        if (requestIds.length === 0) {
            listEl.innerHTML = '<li>ไม่มีคำขอติดตาม</li>';
            return;
        }

        // ดึงข้อมูลโปรไฟล์ของคนที่ส่งคำขอมา
        const requestPromises = requestIds.map(uid => db.collection('users').doc(uid).get());
        const requestDocs = await Promise.all(requestPromises);

        listEl.innerHTML = requestDocs.map(doc => {
            if (!doc.exists) return '';
            const senderData = doc.data();
            const displayName = senderData.profile.displayName || 'User';
            const img = document.createElement('img');
            renderProfilePicture(senderData.profile.photoURL, img);
            return `
                <li class="user-list-item">
                    <div class="user-list-avatar">${img.outerHTML}</div>
                    <div class="user-info">
                        <h4>${displayName}</h4>
                        <p>${senderData.profile.lifebuddyId || ''}</p>
                    </div>
                    <div class="user-actions">
                        <button class="small-btn" onclick="handleAcceptFollowRequest('${doc.id}')"><i data-feather="check"></i> ยอมรับ</button>
                        <button class="small-btn btn-secondary" onclick="handleDeclineFollowRequest('${doc.id}')"><i data-feather="x"></i> ปฏิเสธ</button>
                    </div>
                </li>
            `;
        }).join('');
        feather.replace();
    }

    function calculateLevel(exp) {
        if (typeof exp === 'undefined' || exp === null) exp = 0;

        let currentLevel = 1;
        // EXP ที่ต้องใช้เพื่อไปเลเวล 2 คือ 100
        let expForNextLevel = 100; 
        // EXP สะสมของเลเวลก่อนหน้าทั้งหมด
        let accumulatedExp = 0; 

        // วนลูปเพื่อหาเลเวลปัจจุบัน
        // ตราบใดที่ EXP ที่มี มากกว่า EXP ที่ต้องใช้เพื่อเลเวลอัพ และยังไม่ถึงเลเวล 999
        while (exp >= accumulatedExp + expForNextLevel && currentLevel < 999) {
            accumulatedExp += expForNextLevel;
            currentLevel++;
            // EXP ที่ต้องใช้ในเลเวลถัดไปจะเพิ่มขึ้นทีละ 100
            // เช่น เวล 2->3 ใช้ 200, เวล 3->4 ใช้ 300
            expForNextLevel = currentLevel * 100;
        }
    
        // EXP ที่มีในเลเวลปัจจุบัน
        const expInCurrentLevel = exp - accumulatedExp;

        // กรณีเลเวล 999 แล้ว ให้ถือว่าเต็ม
        if (currentLevel === 999) {
            return { 
                level: 999, 
                expInCurrentLevel: expForNextLevel, 
                expForNextLevel: expForNextLevel, 
                progress: 100 
            };
        }

        // คำนวณ % ของหลอด EXP
        const progress = Math.min(100, (expInCurrentLevel / expForNextLevel) * 100);

        return { level: currentLevel, expInCurrentLevel, expForNextLevel, progress };
    }

    window.startChat = async (friendId) => {
        currentChatId = [currentUser.uid, friendId].sort().join('_');
        if (unsubscribeChatListener) { unsubscribeChatListener(); }
        
        const friendDoc = await db.collection('users').doc(friendId).get();
        if(!friendDoc.exists) return;
        const friendData = friendDoc.data().profile;
        const displayName = friendData.displayName || 'User';
        
        renderProfilePicture(friendData.photoURL, document.getElementById('chat-partner-photo'));
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
                    if (!messageData.text) return;
                    const messageEl = document.createElement('div');
                    messageEl.classList.add('chat-message', messageData.senderId === currentUser.uid ? 'sent' : 'received');
                    const bubble = document.createElement('div');
                    bubble.classList.add('message-bubble');
                    bubble.textContent = messageData.text;
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
        await chatRef.collection('messages').add(message);
        await chatRef.set({ participants: currentChatId.split('_') }, { merge: true });
    }

    // =========================================
    // ===== 7. EVENT LISTENERS & HANDLERS =====
    // =========================================

    function handleCheckIn() { if (document.getElementById('check-in-btn').disabled) return; 
        const todayStr = dayjs().format('YYYY-MM-DD'); 
        if (state.lastCheckIn !== todayStr) { const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD'); 
            state.streak = state.lastCheckIn === yesterdayStr ? (state.streak || 0) + 1 : 1; 
            state.lastCheckIn = todayStr; addExp(40); updateCoins(5, "เช็คอินรายวัน"); saveState(); 
            updateHeaderUI(); 
            checkForDailyBonus(); } }

    function handleProfileFormSubmit(e) { e.preventDefault(); 
        if (!currentUser) return; Swal.fire({ title: 'ยืนยันการบันทึก', 
            text: "คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลใช่หรือไม่?", 
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonColor: 'var(--primary-color)', 
            cancelButtonColor: 'var(--danger-color)', 
            confirmButtonText: 'ใช่, บันทึกเลย!', 
            cancelButtonText: 'ยกเลิก' }).then(async (result) => { if (result.isConfirmed) { state.profile.displayName = document.getElementById('display-name').value.trim(); 
                state.profile.gender = document.getElementById('gender').value; 
                state.profile.age = document.getElementById('age').value; 
                state.profile.bio = document.getElementById('bio').value; 
                state.settings.showEmail = document.getElementById('show-email-toggle').checked; await saveState(); updateHeaderUI(); Swal.fire('บันทึกสำเร็จ!', 'ข้อมูลโปรไฟล์ของคุณถูกอัปเดตแล้ว', 'success').then(() => { document.getElementById('profile-edit-mode').classList.add('hidden'); document.getElementById('profile-view-mode').classList.remove('hidden'); renderProfilePage(); }); } }); }
    
    function handleMoodFormSubmit(e) { e.preventDefault(); 
        const selectedMood = document.getElementById('selected-mood').value; 
        if (!selectedMood) { showToast("กรุณาเลือกอารมณ์ของคุณก่อน"); return; } 
        const notes = document.getElementById('mood-notes').value; 
        const reasons = Array.from(document.querySelectorAll('input[name="mood-reason"]:checked')).map(el => el.value); 
        const todayStr = dayjs().format('YYYY-MM-DD'); if (!state.moods) state.moods = {}; 
        const hadPreviousEntry = !!state.moods[todayStr]; state.moods[todayStr] = { mood: selectedMood, notes: notes, reasons: reasons }; 
        if (!hadPreviousEntry) { updateCoins(5, "บันทึกอารมณ์"); } document.getElementById('mood-form').reset(); document.querySelectorAll('.emoji-option.selected').forEach(el => el.classList.remove('selected')); 
        saveState(); renderMoodCalendar(currentMoodDate); 
        showToast("บันทึกอารมณ์เรียบร้อยแล้ว!"); c
        heckForDailyBonus(); }
    
    function handlePlannerFormSubmit(e) { e.preventDefault(); 
        const eventNameInput = document.getElementById('event-name'); 
        const eventCategoryInput = document.getElementById('event-category'); 
        const eventTimeInput = document.getElementById('event-time'); 
        const eventName = eventNameInput.value.trim(); 
        const eventCategory = eventCategoryInput.value; 
        const eventTime = eventTimeInput.value; if (eventName && eventCategory && eventTime) { const newEvent = { name: eventName, category: eventCategory, time: eventTime }; if (!state.planner) state.planner = {}; 
        if (!state.planner[selectedPlannerDate]) { state.planner[selectedPlannerDate] = []; } state.planner[selectedPlannerDate].push(newEvent); 
        saveState(); renderPlannerCalendar(currentPlannerDate); 
        renderPlannerDetails(selectedPlannerDate); 
        eventNameInput.value = ''; 
        eventCategoryInput.value = ''; 
        eventTimeInput.value = ''; 
        showToast("เพิ่มกิจกรรมเรียบร้อยแล้ว!"); } 
        else { showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง"); } }

    function handleRevisitFormSubmit(e) {
        e.preventDefault();
        const subject = document.getElementById('revisit-subject').value;
        const topicName = document.getElementById('revisit-topic-name').value.trim();
        const topicNotes = document.getElementById('revisit-topic-notes').value.trim();
        const intervals = Array.from(document.querySelectorAll('input[name="review-interval"]:checked')).map(el => parseInt(el.value));

        if (!subject || !topicName) {
            showToast("กรุณาเลือกวิชาและใส่ชื่อหัวข้อ");
            return;
        }
        if (intervals.length === 0) {
            showToast("กรุณาเลือกรอบการทบทวนอย่างน้อย 1 รอบ");
            return;
        }

        const newTopic = {
            id: Date.now(),
            name: topicName,
            notes: topicNotes,
            // --- ระบบทบทวนใหม่ ---
            level: 0, // level คือ index ของ intervals array
            reviewIntervals: intervals.sort((a, b) => a - b), // [1, 3, 7, 30]
            nextReviewDate: dayjs().add(intervals[0], 'day').format('YYYY-MM-DD'),
            // ---
            flashcards: []
        };

        if (!state.revisitTopics[subject]) {
            state.revisitTopics[subject] = [];
        }
        state.revisitTopics[subject].push(newTopic);

        saveState();
        renderRevisitList(); 
        renderRevisitList(); // อัปเดตรายการใหม่
        document.getElementById('revisit-form').reset();
        showToast(`เพิ่มหัวข้อ "${topicName}" ในวิชา${subject}แล้ว!`);
        addExp(15);
    }

    //===== setupAllEventListeners =====//

    function setupAllEventListeners() {
    if (areListenersSetup) return;

    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) {
        console.log("ปุ่ม Google ถูกพบใน DOM, กำลังเพิ่ม Event Listener...");
        googleBtn.addEventListener('click', () => {
            console.log("ปุ่ม Google ถูกคลิก!"); // <--- จุด Debugging
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    console.log("Google Sign-In สำเร็จ:", result.user.email);
                    // ไม่ต้องทำอะไรต่อ เพราะ onAuthStateChanged จะจัดการเอง
                })
                .catch(error => {
                    console.error("Google Sign-in Error:", error);
                    const errorMessage = getFriendlyAuthError(error);
                    const authErrorEl = document.getElementById('auth-error');
                    if (authErrorEl) authErrorEl.textContent = errorMessage;
                });
        });
    } else {
        console.error("ไม่พบปุ่ม #google-signin-btn ใน DOM!");
    }
    
    // --- Listener สำหรับการคลิก ---
    document.body.addEventListener('click', (e) => {
        const closest = (selector) => e.target.closest(selector);

        const communityTabBtn = closest('.tab-btn');
        if (communityTabBtn && closest('#friend-list-panel')) {
            const tab = communityTabBtn.dataset.tab;
        
            // ซ่อน content ทั้งหมดและเอา active ออกจากปุ่มทั้งหมด
            document.querySelectorAll('#friend-list-panel .tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('#friend-list-panel .tab-content').forEach(content => content.classList.remove('active'));

            // แสดงอันที่เลือก
            communityTabBtn.classList.add('active');
            document.getElementById(`${tab}s-tab-content`).classList.add('active'); // เช่น friends-tab-content

            // เรียก render ตามแท็บที่กด
            if (tab === 'friends') {
                renderFollowingList();
            } else if (tab === 'requests') {
                renderFollowRequests();
            }
            return; // จบการทำงานใน event listener
        }

        // จัดการการคลิกที่ Navigation Links ใน Sidebar
        const navLink = closest('.nav-link'); 
        if (navLink) { 
            e.preventDefault(); 
            showPage(navLink.dataset.page); 
            return; 
        }

        // จัดการการคลิกที่ปุ่มปิด (X) ใน Modal ทุกอัน
        if (closest('.close-btn')) { 
            const modal = closest('.modal-overlay'); 
            if (modal) modal.classList.add('hidden'); 
            return; 
        }
        
        const emojiOption = closest('.emoji-option');
        if (emojiOption) {
            document.querySelectorAll('.emoji-option').forEach(opt => opt.classList.remove('selected'));
        
            emojiOption.classList.add('selected');
        
            const selectedMoodValue = emojiOption.dataset.mood;
        
            const selectedMoodInput = document.getElementById('selected-mood');
            if (selectedMoodInput) {
                selectedMoodInput.value = selectedMoodValue;
            }
            return; 
        }

        // จัดการการเลือกรูปโปรไฟล์
        const profileOption = closest('.profile-option');
        if (profileOption) {
            document.querySelectorAll('.profile-option.selected').forEach(opt => opt.classList.remove('selected'));
            profileOption.classList.add('selected');
            const newPhotoURL = profileOption.dataset.url;
            state.profile.photoURL = newPhotoURL;
            renderProfilePicture(newPhotoURL, document.getElementById('profile-edit-photo'));
            saveState();
            document.getElementById('profile-selector-modal').classList.add('hidden');
            showToast('เปลี่ยนรูปโปรไฟล์เรียบร้อย!');
            return; 
        }

        const statsTabBtn = closest('.stats-tab-btn');
            if (statsTabBtn) {
                document.querySelectorAll('.stats-tab-btn').forEach(btn => btn.classList.remove('active'));
                statsTabBtn.classList.add('active');
                const period = statsTabBtn.dataset.period;
                renderFocusStats(period);
                return; // จบการทำงาน ไม่ต้องไปต่อที่ switch
            }

        // === จัดการการติ๊ก Todo List ===
        if (e.target.matches('#todo-list input[type="checkbox"]')) {
            const todoId = parseInt(e.target.dataset.id);
            const todo = state.todos.find(t => t.id === todoId);
            if (todo) {
                todo.completed = e.target.checked;
                const listItem = e.target.closest('li');
                if(listItem) {
                    listItem.classList.toggle('completed', todo.completed);
                }
                if (todo.completed) {
                    addExp(2); // เพิ่ม EXP เมื่อทำสำเร็จ
                    showToast(`ทำ "${todo.text}" สำเร็จ! +2 EXP`);
                    setTimeout(() => {
                        state.todos = state.todos.filter(t => t.id !== todoId);
                        saveState();
                        updateHomePageUI(); 
                    }, 300000); // 300,000ms = 5 นาที
                }
                saveState();
            }
            return;
        }

        const deleteActivityBtn = e.target.closest('.delete-activity-btn');
        if (deleteActivityBtn) {
            const index = parseInt(deleteActivityBtn.dataset.index);
            state.userActivities.splice(index, 1);
            saveState();
            renderActivityList();
            return;
        }

        const deleteAdviceBtn = e.target.closest('.delete-advice-btn');
        if (deleteAdviceBtn) {
            const index = parseInt(deleteAdviceBtn.dataset.index);
            state.userAdvice.splice(index, 1);
            saveState();
            renderUserAdviceList();
            return;
        }
        
        // จัดการการคลิกตาม ID ของ Element (โค้ดเดิม + ที่แก้ไข)
        const targetId = e.target.id || closest('[id]')?.id;    

        switch(targetId) {
            case 'login-btn': openAuthModal(); break;
            case 'logout-btn': auth.signOut(); break;
            case 'open-menu': 
                document.getElementById('sidebar').classList.add('show'); 
                document.getElementById('overlay').classList.add('show'); 
                break;
            case 'close-menu': 
            case 'overlay': 
                closeSidebar(); 
                break;
            case 'check-in-btn': handleCheckIn(); break;
            case 'start-timer-btn': 
                if (timerInterval) { 
                    stopTimer(); 
                    timerInterval = null; 
                } else { 
                    startTimer(); 
                } 
                break;
            case 'reset-timer-btn': resetTimer(); break;
            case 'settings-timer-btn': 
                document.getElementById('timer-settings').classList.toggle('hidden'); 
                break;
            case 'go-to-edit-profile-btn': 
                document.getElementById('profile-view-mode').classList.add('hidden'); 
                document.getElementById('profile-edit-mode').classList.remove('hidden'); 
                break;
            case 'cancel-edit-profile-btn': 
                document.getElementById('profile-edit-mode').classList.add('hidden'); 
                document.getElementById('profile-view-mode').classList.remove('hidden'); 
                renderProfilePage(); 
                break;
            case 'edit-profile-picture-btn': 
                populateProfileSelector(); 
                document.getElementById('profile-selector-modal').classList.remove('hidden'); 
                break;
            case 'manage-activities-btn': 
                openActivityManager(); 
                break;
            case 'manage-advice-btn': 
                openAdviceManager(); 
                break;
            case 'theme-light-btn': 
                if (state.settings.theme !== 'light') { 
                    state.settings.theme = 'light'; 
                    applySettings(); 
                    saveState(); 
                } 
                break;
            case 'theme-dark-btn': 
                if (state.settings.theme !== 'dark') { 
                    state.settings.theme = 'dark'; 
                    applySettings(); 
                    saveState(); 
                } 
                break;
            case 'back-to-revisit-list':
                document.getElementById('flashcard-view').classList.add('hidden');
                document.getElementById('revisit-list-view').classList.remove('hidden');
                renderRevisitList();
                break;
            case 'reveal-answer-btn':
                const flashcard = document.querySelector('#flashcard-view .flashcard');
                if (flashcard) flashcard.classList.add('flipped');
                document.getElementById('reveal-answer-btn').classList.add('hidden');
                document.getElementById('quiz-feedback-btns').classList.remove('hidden');
                break;
            case 'quiz-understood-btn':
                currentCardIndex++;
                displayNextFlashcard();
                break;
            case 'quiz-not-understood-btn':
                if (shuffledFlashcards[currentCardIndex]) {
                    shuffledFlashcards.push(shuffledFlashcards[currentCardIndex]);
                }
                currentCardIndex++;
                displayNextFlashcard();
                break;
            case 'search-friends-btn':
                document.getElementById('search-friends-modal').classList.remove('hidden');
                break;
            case 'community-btn':
                showPage('community');
                break;
            case 'edit-wishlist-btn':
                handleEditWishList();
                break;
            case 'copy-id-btn':
                if (state.profile && state.profile.lifebuddyId) {
                    navigator.clipboard.writeText(state.profile.lifebuddyId)
                        .then(() => {
                            showToast('คัดลอก ID สำเร็จ!');
                        })
                        .catch(err => {
                            console.error('ไม่สามารถคัดลอก ID ได้: ', err);
                            showToast('เกิดข้อผิดพลาดในการคัดลอก');
                        });
                }
                break;
            case 'google-signin-btn':
                const provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider)
                    .catch(error => {
                        const errorMessage = getFriendlyAuthError(error);
                        const authErrorEl = document.getElementById('auth-error');
                        if(authErrorEl) authErrorEl.textContent = errorMessage;
                        console.error("Google Sign-in Error:", error);
                    });
                break;

        }
    });

    // --- Listener สำหรับการ Submit ฟอร์ม ---
    document.body.addEventListener('submit', (e) => {
        e.preventDefault();
        
        switch (e.target.id) {
            case 'todo-form': 
                const input = document.getElementById('todo-input'); 
                if (input.value.trim()) { 
                    if (!state.todos) state.todos = [];
                    state.todos.push({ id: Date.now(), text: input.value.trim(), completed: false }); 
                    input.value = ''; 
                    updateHomePageUI(); 
                    saveState(); 
                } 
                break;
            case 'revisit-form': handleRevisitFormSubmit(e); break;
            case 'planner-form': handlePlannerFormSubmit(e); break;
            case 'mood-form': handleMoodFormSubmit(e); break;
            case 'profile-form': handleProfileFormSubmit(e); break;
            case 'add-activity-form': 
                const inputAct = document.getElementById('new-activity-input'); 
                if (inputAct.value.trim()) { 
                    if (!state.userActivities) state.userActivities = [...defaultActivities]; 
                    state.userActivities.push(inputAct.value.trim()); 
                    saveState(); 
                    renderActivityList(); 
                    inputAct.value = ''; 
                    showToast('เพิ่มกิจกรรมใหม่แล้ว!'); 
                } 
                break;
            case 'add-advice-form': 
                const inputAdv = document.getElementById('new-advice-input'); 
                if (inputAdv.value.trim()) { 
                    if (!state.userAdvice) state.userAdvice = []; 
                    state.userAdvice.push(inputAdv.value.trim()); 
                    saveState(); 
                    renderUserAdviceList();
                    inputAdv.value = ''; 
                    showToast('เพิ่มคำแนะนำใหม่แล้ว!'); 
                } 
                break;
            case 'signup-form': 
                const emailS = document.getElementById('signup-email').value; 
                const passwordS = document.getElementById('signup-password').value; 
                auth.createUserWithEmailAndPassword(emailS, passwordS)
                    .catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error)); 
                break;
            case 'login-form': 
                const emailL = document.getElementById('login-email').value; 
                const passwordL = document.getElementById('login-password').value; 
                auth.signInWithEmailAndPassword(emailL, passwordL)
                    .catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error)); 
                break;
            case 'flashcard-form':
                const flashcardForm = e.target;
                const subject = flashcardForm.dataset.subject;
                const topicId = parseInt(flashcardForm.dataset.topicId);
                const question = document.getElementById('flashcard-question').value.trim();
                const answer = document.getElementById('flashcard-answer').value.trim();
            
                if (subject && !isNaN(topicId) && question && answer) {
                    const topic = state.revisitTopics[subject].find(t => t.id === topicId);
                    if (topic) {
                        if (!topic.flashcards) topic.flashcards = [];
                        topic.flashcards.push({ q: question, a: answer });
                        saveState();
                        showToast("เพิ่ม Flashcard ใหม่แล้ว!");
                        flashcardForm.reset();
                        shuffledFlashcards = [...(topic.flashcards || [])].sort(() => 0.5 - Math.random());
                        const quizEl = document.getElementById('flashcard-quiz');
                        if (quizEl) quizEl.classList.remove('hidden');
                    }
                }
                break;
            case 'search-friends-form':
                handleFriendSearch(e);
                break;
        }
    });
    
    areListenersSetup = true;
}

    // ===================================
    // ===== 8. AUTH MODAL FUNCTIONS =====
    // ===================================

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
            case 'auth/internal-error': if (error.message && error.message.includes("INVALID_LOGIN_CREDENTIALS")) { return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'; } return 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่';
            default: return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        }
    }

    function openAuthModal() { 
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('auth-error').textContent = '';
    }

    function renderActivityList() {
        const container = document.getElementById('activity-list-container');
        if (!container) return;
        const activities = state.userActivities || defaultActivities;
        container.innerHTML = activities.map((activity, index) => `
            <div class="activity-item">
            <span>${activity}</span>
                <button class="delete-activity-btn" data-index="${index}" title="ลบ"><i data-feather="trash-2"></i></button>
            </div>
        `).join('');
        feather.replace();
    }

    // ฟังก์ชันสำหรับเปิด Modal จัดการกิจกรรม
    function openActivityManager() {
        renderActivityList();
        document.getElementById('activity-manager-modal').classList.remove('hidden');
    }

    // ฟังก์ชันสำหรับแสดงรายการคำแนะนำใน Modal
    function renderUserAdviceList() {
        const container = document.getElementById('advice-list-container');
        if (!container) return;
        const advices = state.userAdvice || [];
        container.innerHTML = advices.map((advice, index) => `
            <div class="activity-item">
                <span>${advice}</span>
                <button class="delete-advice-btn" data-index="${index}" title="ลบ"><i data-feather="trash-2"></i></button>
            </div>
        `).join('');
        feather.replace();
    }

    // ฟังก์ชันสำหรับเปิด Modal จัดการคำแนะนำ
    function openAdviceManager() {
        renderUserAdviceList();
        document.getElementById('advice-manager-modal').classList.remove('hidden');
    }

    function closeAuthModal() { 
        document.getElementById('auth-modal').classList.add('hidden'); 
        document.getElementById('auth-error').textContent = ''; 
    }
});
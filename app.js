document.addEventListener('DOMContentLoaded', () => {

    // =============================
    // ===== 1. FIREBASE SETUP =====
    // =============================
    const firebaseConfig = {
        apiKey: "AIzaSyBUs0Gqhv0P1Up-vDz1HE9iFfaZr0bAEms",
        authDomain: "life-buddy-xok07.firebaseapp.com",
        projectId: "life-buddy-xok07",
        storageBucket: "life-buddy-xok07.firebasestorage.app",
        messagingSenderId: "243239137119",
        appId: "1:243239137119:web:2baf84c64caddf211ad0ea"
    };
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
        coins: 50,
        coinHistory: [],
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
        focusHistory: [],
        badges: { },
        settings: { theme: 'light', focusDuration: 25, breakDuration: 5, showEmail: true },
        userActivities: [...defaultActivities],
        userAdvice: [...defaultAdvices],
        unlocks: { 
            banners: ['banner_default']
        },
        shopItems: {
            banners: [
                 { id: 'GalaxyBanner.png', name: 'แบนเนอร์กาแล็กซี', price:250, image: 'assets/banner/GalaxyBanner.png' },
                { id: 'ForestBanner.png', name: 'แบนเนอร์ผืนป่า', price:250, image: 'assets/banner/ForestBanner.png' },
                { id: 'BeachBanner.png', name: 'แบนเนอร์ชายหาด', price: 250,image: 'assets/banner/BeachBanner.png' },
                { id: 'CyberpunkBanner.png', name: 'แบนเนอร์ไซเบอร์พังค์', price: 300 , image: 'assets/banner/CyberpunkBanner.png' },
                { id: 'CuteBanner.png', name: 'แบนเนอร์สุดคิวท์', price: 350 , image: 'assets/banner/CuteBanner.png' }
            ]
        },
        profile: { 
            displayName: '', 
            gender: 'unspecified', 
            age: '', 
            bio: '', 
            lifebuddyId: '', 
            photoURL: 'assets/profiles/startprofile.png',
            currentBanner: 'banner_default'
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
    let lastSearchResults = [];
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
            setupFriendListeners(user.uid);
        } else {
            currentUser = null;
            state = JSON.parse(JSON.stringify(initialState));
            if (friendListeners.length > 0) {
                friendListeners.forEach(unsub => unsub());
                friendListeners = [];
            }
        }
        runApp();
    });

    async function loadStateFromFirestore(userId) {
        try {
            const docRef = db.collection('users').doc(userId);
            const doc = await docRef.get();

            if (doc.exists) {
                // ถ้ามีข้อมูลอยู่แล้ว ก็โหลดมาใช้ได้เลย
                // ใช้ deepMerge เพื่อให้แน่ใจว่าถ้ามี key ใหม่ๆ ใน initialState จะถูกเพิ่มเข้าไปด้วย
                return deepMerge(JSON.parse(JSON.stringify(initialState)), doc.data());
            } else {
                // [สำคัญ] ถ้าไม่มีข้อมูลใน Firestore (ซึ่งไม่ควรจะเกิดขึ้นกับผู้ใช้ที่สมัครแล้ว)
                // ให้แสดง Error และ return state เริ่มต้นไปก่อน เพื่อป้องกันแอปพัง
                console.error(`!!! CRITICAL: No data found in Firestore for user ${userId}. This should not happen.`);
                showToast("เกิดข้อผิดพลาดร้ายแรง: ไม่พบข้อมูลผู้ใช้");
                auth.signOut(); // บังคับออกจากระบบเพื่อความปลอดภัย
                return JSON.parse(JSON.stringify(initialState));
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
        checkBadges(); 
        db.collection('users').doc(currentUser.uid).set(state, { merge: true }).catch(error => console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล: ", error)); 
    }
    
    function closeSidebar() { 
        document.getElementById('sidebar').classList.remove('show'); 
        document.getElementById('overlay').classList.remove('show'); 
    }
    
    function applySettings() {
        if (!state.settings) return;
        document.body.dataset.theme = state.settings.theme;
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
    
    function checkDailyReset() { 
        if (!state.focus) { 
            state.focus = { totalSessions: 0, todaySessions: 0, lastFocusDate: null, combo: 0 }; 
        } 
        const todayStr = dayjs().format('YYYY-MM-DD'); 
        if (state.focus.lastFocusDate !== todayStr) { 
            state.focus.todaySessions = 0; 
            state.focus.lastFocusDate = todayStr; 
            state.focus.combo = 0; 
        } 
    }
    
    function showToast(message) { 
        const toast = document.getElementById('toast-notification'); 
        if (!toast) return; 
        toast.textContent = message; 
        toast.classList.remove('hidden'); 
        clearTimeout(toastTimeout); 
        toastTimeout = setTimeout(() => { 
            toast.classList.add('hidden'); 
        }, 3000); 
    }
    
    function addExp(amount) { 
        if(!currentUser) return; 
        if(typeof state.exp === 'undefined') state.exp = 0;

        const levelBefore = calculateLevel(state.exp).level;
        state.exp += amount; 
        showToast(`ได้รับ ${amount} EXP!`);
        const { level: levelAfter } = calculateLevel(state.exp);

        if (levelAfter > levelBefore) {
            const coinReward = levelAfter * 10;
            updateCoins(coinReward, `เลื่อนระดับเป็น Level ${levelAfter}`);
            setTimeout(() => {
                Swal.fire({
                    title: 'Level Up!',
                    html: `ยินดีด้วย! คุณได้เลื่อนระดับเป็น <strong>Level ${levelAfter}</strong> แล้ว<br>ได้รับรางวัล <strong>${coinReward} Coins</strong>!`,
                    icon: 'success',
                    confirmButtonText: 'ยอดเยี่ยม!',
                    customClass: {
                        title: 'swal-title-levelup',
                    }
                });
            }, 1500);
        }
        updateHeaderUI(); 
        updateSettingsUI();
    }
    
    // ==================================
    // ===== 5. UI & PAGE RENDERING =====
    // ==================================
    window.showPage = (pageId) => {
        if (!pageId) pageId = 'home';
        const protectedPages = ['profile', 'rewards', 'settings', 'community', 'shop'];
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
        
        switch(pageId) {
            case 'home': 
                updateHomePageUI(); 
                break;
            case 'planner': 
                renderPlannerCalendar(currentPlannerDate); 
                break;
            case 'revisit':
                const revisitListView = document.getElementById('revisit-list-view');
                const flashcardView = document.getElementById('flashcard-view');
                if (revisitListView) revisitListView.classList.remove('hidden');
                if (flashcardView) flashcardView.classList.add('hidden');
                renderRevisitList(); 
                break;
            case 'focus': 
                resetTimer(); 
                renderFocusStats('day');
                break;
            case 'mood': 
                renderMoodCalendar(currentMoodDate); 
                break;
            case 'community': 
                // เมื่อเปิดหน้า community ให้ render Chat List
                document.getElementById('chat-conversation-view').classList.add('hidden');
                document.getElementById('chat-welcome-view').classList.remove('hidden');
                renderChatList(); 
                break;
            case 'shop': 
                renderShop(); 
                break;
            case 'rewards': 
                updateRewardsUI(); 
                break;
            case 'settings': 
                updateSettingsUI(); 
                break;
            case 'profile': 
                renderProfilePage(); 
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
        const { level } = calculateLevel(state.exp);
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

        const todayStr = dayjs().format('YYYY-MM-DD');
        const tasksList = document.getElementById('today-tasks-summary');
        if (tasksList) {
            const tasksForToday = (state.planner && state.planner[todayStr]) || [];
            tasksList.innerHTML = tasksForToday.map(t => `<li>${t.time} - ${t.name}</li>`).join('') || '<li>ไม่มีงานสำหรับวันนี้</li>';
        }

        const revisitList = document.getElementById('today-revisit-summary');
        if (revisitList) {
            let dueTopics = [];
            if (state.revisitTopics && typeof state.revisitTopics === 'object' && !Array.isArray(state.revisitTopics)) {
                Object.values(state.revisitTopics).forEach(subjectArray => {
                    if (Array.isArray(subjectArray)) {
                        const dueInSubject = subjectArray.filter(t => t && t.nextReviewDate && dayjs(t.nextReviewDate).isSame(dayjs(), 'day'));
                        dueTopics = dueTopics.concat(dueInSubject);
                    }
                });
            }
            revisitList.innerHTML = dueTopics.map(t => `<li>${t.name}</li>`).join('') || '<li>ไม่มีหัวข้อต้องทบทวน</li>';
        }

        const todayFocusCountEl = document.getElementById('today-focus-count');
        if (todayFocusCountEl) {
            todayFocusCountEl.textContent = state.focus?.todaySessions || 0;
        }
    
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
                { id: 'firstFriend', title: 'เพื่อนคนแรก', desc: 'มีผู้ติดตามคนแรก', icon: '👋' },
                { id: 'socialButterfly', title: 'ผีเสื้อสังคม', desc: 'มีผู้ติดตามครบ 10 คน', icon: '🦋' },
                { id: 'chatterbox', title: 'นักสนทนา', desc: 'ส่งข้อความในแชทครบ 100 ข้อความ', icon: '💬' },
            ],
            "เหรียญตราลับ": [
                { id: 'nightOwl', title: 'นักท่องราตรี', desc: '???', icon: '🦉' },
            ]
        };
        
        badgesContainer.innerHTML = '';
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
    
    async function showUserListModal(listType, userIds) {
        if (!userIds || userIds.length === 0) {
            showToast("ไม่มีรายชื่อให้แสดง");
            return;
        }
    
        const modal = document.getElementById('user-list-modal');
        const titleEl = document.getElementById('user-list-modal-title');
        const bodyEl = document.getElementById('user-list-modal-body');
    
        titleEl.textContent = listType === 'followers' ? 'ผู้ติดตาม' : 'กำลังติดตาม';
        bodyEl.innerHTML = '<p>กำลังโหลด...</p>';
        modal.classList.remove('hidden');

        const userPromises = userIds.map(uid => db.collection('users').doc(uid).get());
        const userDocs = await Promise.all(userPromises);

        bodyEl.innerHTML = userDocs.map(doc => {
            if (!doc.exists) return '';
            const userData = doc.data().profile;
            return `
                <div class="user-list-modal-item">
                    <img src="${userData.photoURL || 'assets/profiles/startprofile.png'}" class="profile-pic">
                    <div class="user-info">
                        <h4>${userData.displayName || 'User'}</h4>
                        <p class="subtle-text">${userData.lifebuddyId}</p>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function renderProfilePage() {
    const page = document.getElementById('profile-page');
    // 1. ตรวจสอบเบื้องต้นว่าควรจะ render หรือไม่
    if (!page || !page.classList.contains('active') || !currentUser) {
        return;
    }
    
    // 2. ทำให้ View Mode แสดงผล และซ่อน Edit Mode (เป็นค่าเริ่มต้นเสมอเมื่อเข้าหน้านี้)
    const viewMode = document.getElementById('profile-view-mode');
    const editMode = document.getElementById('profile-edit-mode');
    if (viewMode) viewMode.classList.remove('hidden');
    if (editMode) editMode.classList.add('hidden');

    // 3. แสดงผล Banner ที่ผู้ใช้ติดตั้งอยู่
    const bannerEl = viewMode.querySelector('.profile-banner');
    if (bannerEl) {
        const bannerId = state.profile.currentBanner;
        const allShopItems = Object.values(state.shopItems || {}).flatMap(category => category);
        const bannerData = allShopItems.find(item => item.id === bannerId);

        if (bannerData && bannerData.image) {
            bannerEl.style.backgroundImage = `url('${bannerData.image}')`;
            bannerEl.style.backgroundSize = 'cover';
            bannerEl.style.backgroundPosition = 'center';
            bannerEl.style.backgroundColor = '';
        } else {
            bannerEl.style.backgroundImage = '';
            bannerEl.style.background = 'linear-gradient(135deg, var(--primary-color), var(--accent-color))';
        }
    }

    // 4. แสดงข้อมูลโปรไฟล์หลักใน View Mode
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

    // 5. แสดงข้อมูลวันเข้าร่วม
    if (currentUser.metadata.creationTime) {
        const joinDate = dayjs(currentUser.metadata.creationTime).format('D MMMM YYYY');
        document.getElementById('profile-view-joindate').innerHTML = `<i data-feather="calendar"></i> เข้าร่วมเมื่อ ${joinDate}`;
    }

    // 6. แสดงสถิติการติดตาม
    const followersCount = (state.followers || []).length;
    const followingCount = (state.following || []).length;
    document.getElementById('profile-stat-followers').textContent = followersCount;
    document.getElementById('profile-stat-following').textContent = followingCount;

    const followersDiv = document.getElementById('profile-stat-followers').parentElement;
    const followingDiv = document.getElementById('profile-stat-following').parentElement;

    followersDiv.style.cursor = "pointer";
    followersDiv.onclick = () => showUserListModal('followers', state.followers);
    
    followingDiv.style.cursor = "pointer";
    followingDiv.onclick = () => showUserListModal('following', state.following);

    // 7. แสดงสถิติการใช้งานแอป
    document.getElementById('profile-stat-streak').textContent = state.streak || 0;
    document.getElementById('profile-stat-total-exp').textContent = state.exp || 0;
    document.getElementById('profile-stat-focus').textContent = state.focus?.totalSessions || 0;
    document.getElementById('profile-stat-moods').textContent = Object.keys(state.moods || {}).length;

    // 8. แสดงความสำเร็จ (Achievements) ที่ปลดล็อกแล้ว
    const achievementsContainer = document.getElementById('profile-achievements-container');
    if (achievementsContainer) {
        const badgeData = [ 
            { id: 'focus10', title: 'นักโฟกัสหน้าใหม่', icon: '🎯'}, 
            { id: 'plan5', title: 'นักวางแผนตัวยง', icon: '📝'}, 
            { id: 'mood7', title: 'จิตใจเบิกบาน', icon: '😊'}, 
            { id: 'review20', title: 'ยอดนักทบทวน', icon: '🎓'} 
        ];
        const unlockedBadges = badgeData.filter(badge => state.badges && state.badges[badge.id]);
        
        if (unlockedBadges.length > 0) {
            achievementsContainer.innerHTML = unlockedBadges.map(badge => 
                `<div class="stat-item">
                    <span class="stat-icon">${badge.icon}</span>
                    <span class="stat-value" style="font-size: 1rem; color: var(--text-color); margin: 4px 0;">${badge.title}</span>
                    <span class="stat-label">ปลดล็อกแล้ว</span>
                 </div>`
            ).join('');
        } else {
            achievementsContainer.innerHTML = '<p class="subtle-text">ยังไม่มีความสำเร็จ... มาเริ่มสะสมกันเลย!</p>';
        }
    }
    
    // 9. เตรียมข้อมูลสำหรับหน้าแก้ไขโปรไฟล์ (Edit Mode) ให้พร้อมเสมอ
    // โดยการดึงข้อมูลล่าสุดจาก state มาใส่ในฟอร์มที่ซ่อนอยู่
    if (editMode) {
        renderProfilePicture(state.profile.photoURL, document.getElementById('profile-edit-photo'));
        document.getElementById('profile-edit-name').textContent = displayName;
        document.getElementById('profile-edit-email').textContent = currentUser.email;
        document.getElementById('display-name').value = state.profile.displayName || '';
        document.getElementById('gender').value = state.profile?.gender || 'unspecified';
        document.getElementById('age').value = state.profile?.age || '';
        document.getElementById('bio').value = state.profile?.bio || '';
        document.getElementById('show-email-toggle').checked = state.settings?.showEmail ?? true;
    }

    // 10. สั่งให้ Feather Icons ทำงานใหม่เพื่อแสดงผลไอคอนที่อาจถูกสร้างขึ้นมา
    feather.replace();
}

    async function showFriendProfile(friendId) {
    if (friendId === currentUser.uid) {
        showPage('profile'); // ถ้าเป็น ID ตัวเอง ให้ไปหน้าโปรไฟล์ปกติ
        return;
    }

    const modal = document.getElementById('friend-profile-modal');
    const contentEl = document.getElementById('friend-profile-content');
    contentEl.innerHTML = '<div class="loader" style="margin: 50px auto;"></div>';
    modal.classList.remove('hidden');

    try {
        const doc = await db.collection('users').doc(friendId).get();
        if (!doc.exists) {
            contentEl.innerHTML = '<p>ไม่พบผู้ใช้นี้</p>';
            return;
        }
        const friendData = doc.data();

        // [ส่วนสำคัญ] เราจะ "ยืม" โครงสร้าง HTML จากหน้าโปรไฟล์หลักมาใช้
        // นี่เป็นวิธีที่รวดเร็ว แต่ในระยะยาวอาจจะสร้างเป็น component แยก
        
        // ตรวจสอบสถานะการติดตาม
        const amIFollowing = (state.following || []).includes(friendId);
        const requestSent = (state.sentFollowRequests || []).includes(friendId);
        let followButtonHtml = '';
        if (amIFollowing) {
            followButtonHtml = `<button class="small-btn btn-secondary" disabled>กำลังติดตาม</button>`;
        } else if (requestSent) {
            followButtonHtml = `<button class="small-btn" disabled>ส่งคำขอแล้ว</button>`;
        } else {
            followButtonHtml = `<button class="small-btn" onclick="handleSendFollowRequest('${friendId}')">ติดตาม</button>`;
        }

        const bannerId = friendData.profile.currentBanner;
        const allShopItems = Object.values(state.shopItems || {}).flatMap(category => category);
        const bannerData = allShopItems.find(item => item.id === bannerId);
        const bannerStyle = (bannerData && bannerData.image) 
            ? `background-image: url('${bannerData.image}'); background-size: cover; background-position: center;`
            : 'background: linear-gradient(135deg, var(--primary-color), var(--accent-color));';

        const { level } = calculateLevel(friendData.exp || 0);

        contentEl.innerHTML = `
            <div id="profile-view-mode">
                <div class="profile-header-card">
                    <div class="profile-banner" style="${bannerStyle}"></div>
                    <img src="${friendData.profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="avatar-display">
                    <div class="profile-info">
                        <h2>${friendData.profile.displayName || 'User'}</h2>
                        <span class="level-badge">Level ${level}</span>
                        <p class="subtle-text"><em>${friendData.profile.lifebuddyId}</em></p>
                        <p class="bio-text">${friendData.profile.bio || '...'}</p>
                        <div class="profile-follow-stats">
                            <div class="follow-stat-item">
                                <span class="follow-stat-value">${(friendData.followers || []).length}</span>
                                <span class="follow-stat-label">ผู้ติดตาม</span>
                            </div>
                            <div class="follow-stat-item">
                                <span class="follow-stat-value">${(friendData.following || []).length}</span>
                                <span class="follow-stat-label">กำลังติดตาม</span>
                            </div>
                        </div>
                        <div style="margin-top: 15px;">${followButtonHtml}</div>
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Error showing friend profile:", error);
        contentEl.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

    //เปิดหน้าต่าง Modal สำหรับเลือก Banner
    function openBannerSelector() {
        renderBannerSelector(); // สร้างรายการแบนเนอร์ก่อน
        document.getElementById('banner-selector-modal').classList.remove('hidden');
    }

    //สร้างและแสดงผลรายการ Banner ที่ผู้ใช้เป็นเจ้าของใน Modal
    function renderBannerSelector() {
        const container = document.getElementById('banner-selector-body');
        if (!container) return;

        const ownedBannerIds = state.unlocks?.banners || [];
        const allBanners = state.shopItems?.banners || [];
        const currentBannerId = state.profile?.currentBanner;

        // 1. สร้างรายการ Banner ที่ผู้ใช้เป็นเจ้าของทั้งหมด
        const ownedBanners = allBanners.filter(banner => ownedBannerIds.includes(banner.id));

        // 2. เพิ่ม Banner เริ่มต้น (Default) เข้าไปในรายการเสมอ
        const defaultBanner = {
            id: 'banner_default',
            name: 'แบนเนอร์เริ่มต้น',
            image: null // ไม่มีรูปภาพ, จะใช้ CSS gradient แทน
        };
        // ใส่ default banner ไว้ข้างหน้าสุด
        const displayList = [defaultBanner, ...ownedBanners];

        // 3. สร้าง HTML สำหรับแต่ละรายการ
        container.innerHTML = displayList.map(banner => {
            const isSelected = banner.id === currentBannerId;
            const backgroundStyle = banner.image ? `style="background-image: url('${banner.image}')"` : '';
            const isGradient = !banner.image ? 'data-gradient="true"' : '';

            return `
                <div class="banner-option-card ${isSelected ? 'selected' : ''}" onclick="handleSelectBanner('${banner.id}')">
                    <div class="banner-option-preview" ${backgroundStyle} ${isGradient}></div>
                    <div class="banner-option-info">
                        ${banner.name}
                    </div>
                    <div class="selected-tick">
                        <i data-feather="check"></i>
                    </div>
                </div>
            `;
        }).join('');

        feather.replace(); // สั่งให้ icon ทำงาน
    }

    /**
    * //จัดการเมื่อผู้ใช้เลือก Banner ใหม่
     * @param {string} bannerId - ID ของ Banner ที่ถูกเลือก
    */
    window.handleSelectBanner = (bannerId) => {
        if (!currentUser) return;

        // 1. อัปเดต state
        state.profile.currentBanner = bannerId;

        // 2. บันทึกข้อมูลลง Firestore
        saveState();

        // 3. ปิด Modal
        document.getElementById('banner-selector-modal').classList.add('hidden');

        // 4. อัปเดตหน้าโปรไฟล์ทันทีเพื่อแสดงผลการเปลี่ยนแปลง
        renderProfilePage();

        // 5. แจ้งเตือนผู้ใช้
        showToast('เปลี่ยนแบนเนอร์สำเร็จแล้ว!');
    };

    // =========================================
    // ===== 6. FEATURE-SPECIFIC FUNCTIONS =====
    // =========================================
    function renderShop() {
        const bannersContainer = document.getElementById('shop-banners-container');
        if (!bannersContainer) return;

        // ใช้ตัวแปรที่ปลอดภัยในการดึงข้อมูล
        const shopItems = state.shopItems || initialState.shopItems;
        const unlocks = state.unlocks || initialState.unlocks;
    
        // ดึงข้อมูล banners จากตัวแปรที่ปลอดภัยแล้ว
        const { banners } = shopItems;

        // Render Banners
        if (Array.isArray(banners)) {
            bannersContainer.innerHTML = banners.map(item => {
                const isOwned = unlocks.banners.includes(item.id);
                return `
                    <div class="shop-item-card">
                        ${isOwned ? '<span class="owned-tag">เป็นเจ้าของแล้ว</span>' : ''}
                        <img src="${item.image}" alt="${item.name}" class="shop-item-preview">
                        <div class="shop-item-name">${item.name}</div>
                        <div class="shop-item-price">
                            <i data-feather="dollar-sign"></i>
                            <span>${item.price}</span>
                        </div>
                        <button 
                            class="small-btn btn-buy ${isOwned || state.coins < item.price ? 'disabled' : ''}"
                            onclick="handlePurchase('${item.id}', 'banners', ${item.price})"
                            ${isOwned || state.coins < item.price ? 'disabled' : ''}>
                            ${isOwned ? 'ปลดล็อกแล้ว' : (state.coins < item.price ? 'เหรียญไม่พอ' : 'ซื้อ')}
                        </button>
                    </div>
                `;
            }).join('');
        }

        if (Array.isArray(banners)) {
            bannersContainer.innerHTML = banners.map(item => {
                const isOwned = unlocks.banners.includes(item.id);
                return `
                    <div class="shop-item-card">
                        ${isOwned ? '<span class="owned-tag">เป็นเจ้าของแล้ว</span>' : ''}
                        <img src="${item.image}" alt="${item.name}" class="shop-item-preview">
                        <div class="shop-item-name">${item.name}</div>
                        <div class="shop-item-price">
                            <i data-feather="dollar-sign"></i>
                            <span>${item.price}</span>
                        </div>
                        <button 
                            class="small-btn btn-buy ${isOwned || state.coins < item.price ? 'disabled' : ''}"
                            onclick="handlePurchase('${item.id}', 'banners', ${item.price})"
                            ${isOwned || state.coins < item.price ? 'disabled' : ''}>
                            ${isOwned ? 'ปลดล็อกแล้ว' : (state.coins < item.price ? 'เหรียญไม่พอ' : 'ซื้อ')}
                        </button>
                    </div>
                `;
            }).join('');
        }
        feather.replace();
    }

    window.handlePurchase = (itemId, itemType, price) => {
        if (!currentUser) return;
        const shopItems = state.shopItems || initialState.shopItems;
        const unlocks = state.unlocks || initialState.unlocks;

        if (unlocks[itemType].includes(itemId)) {
            showToast("คุณมีไอเทมนี้อยู่แล้ว");
            return;
        }
        if (state.coins < price) {
            showToast("เหรียญของคุณไม่เพียงพอ");
            return;
        }
        
        const itemName = shopItems[itemType].find(i => i.id === itemId)?.name || 'ไอเทมนี้';

        Swal.fire({
            title: 'ยืนยันการซื้อ?',
            html: `คุณต้องการใช้ <strong>${price} Coins</strong> เพื่อซื้อ<br>"${itemName}" หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ซื้อเลย!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                updateCoins(-price, `ซื้อ "${itemName}"`);
                state.unlocks[itemType].push(itemId);
                saveState();
                renderShop();
                Swal.fire('ซื้อสำเร็จ!', 'คุณได้ปลดล็อกไอเทมใหม่แล้ว!', 'success');
            }
        });
    };
    
    function checkBadges() { 
        if(!currentUser) return; 
        if(!state.badges) state.badges = {};
        state.badges.streak15 = (state.streak || 0) >= 15;
        state.badges.streak30 = (state.streak || 0) >= 30;
        state.badges.loyalist45 = (state.streak || 0) >= 45;

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

        let totalTopics = 0;
        let totalFlashcards = 0;
        let totalReviews = 0;
    
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
        state.badges.eagerLearner = totalTopics > 0;
        state.badges.knowledgeHoarder = totalTopics >= 10;
        state.badges.cardCreator = totalFlashcards >= 25;
        state.badges.revisionMaster = totalReviews >= 20;

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

        state.badges.firstFriend = (state.followers || []).length > 0;
        state.badges.socialButterfly = (state.followers || []).length >= 10;

        state.badges.focus10 = (state.focus?.totalSessions || 0) >= 10;
        if(typeof state.planner === 'object' && state.planner !== null) {
            let uniquePlannerDays = new Set(Object.keys(state.planner).filter(key => state.planner[key] && state.planner[key].length > 0));
            state.badges.plan5 = uniquePlannerDays.size >= 5;
        }
    }
    
    function calculateLevel(exp) {
        if (typeof exp === 'undefined' || exp === null) exp = 0;
        let currentLevel = 1;
        let accumulatedExp = 0;
        let expForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.15));
        while (exp >= accumulatedExp + expForNextLevel && currentLevel < 999) {
            accumulatedExp += expForNextLevel;
            currentLevel++;
            expForNextLevel = Math.floor(100 * Math.pow(currentLevel, 1.15));
        }
        const expInCurrentLevel = exp - accumulatedExp;
        if (currentLevel === 999) {
            return { level: 999, expInCurrentLevel: expForNextLevel, expForNextLevel, progress: 100 };
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
        container.innerHTML = '';
        let hasTopics = false;
        for (const subject in state.revisitTopics) {
            if (state.revisitTopics[subject].length > 0) {
                hasTopics = true;
                const subjectGroup = document.createElement('div');
                subjectGroup.className = 'subject-group';
                const subjectTitle = document.createElement('h3');
                subjectTitle.className = 'subject-title';
                subjectTitle.textContent = document.querySelector(`#revisit-subject option[value="${subject}"]`).textContent;
                subjectGroup.appendChild(subjectTitle);
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
                const moodStyles = {
                    happy: { background: '#FADADD', color: '#A0526B', border: '1px solid #F8C8D2' },
                    excited: { background: '#FF9F43', color: 'white', fontWeight: 'bold' },
                    neutral: { background: '#EAEAEA', color: '#8A8A8A', border: '1px solid #D1D1D1' },
                    sad: { background: '#B0C4DE', color: '#465362', border: '1px solid #8494A8' },
                    angry: { background: 'linear-gradient(135deg, #FF6B6B 0%, #D32F2F 100%)', color: 'white', border: '1px solid #C62828' }
                };
                const styles = moodStyles[moodEntry.mood];
                if (styles) {
                    dayElem.style.background = styles.background;
                    dayElem.style.color = styles.color || 'var(--text-color)';
                    dayElem.style.fontWeight = styles.fontWeight || 'normal';
                    dayElem.style.border = styles.border || '1px solid transparent';
                    if (styles.animation) {
                        dayElem.style.animation = styles.animation;
                    }
                }
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
        if (state.coinHistory.length > 50) state.coinHistory.pop(); 
        if (amount < 0) state.lastCoinUsage = new Date().toISOString(); 
        updateHeaderUI(); 
        if(document.getElementById('shop-page').classList.contains('active')) {
             renderShop();
        }
    }
    
    function checkForDailyBonus() { 
        const today = dayjs().format('YYYY-MM-DD'); 
        if (state.lastBonusDate === today) return; 
        const checkedInToday = state.lastCheckIn === today; 
        const focusedToday = state.focus.lastFocusDate === today && state.focus.todaySessions > 0; 
        const moodLoggedToday = state.moods && state.moods[today] !== undefined; 
        if (checkedInToday && focusedToday && moodLoggedToday) { 
            updateCoins(50, "โบนัสความขยัน!"); 
            state.lastBonusDate = today; 
            saveState(); 
            Swal.fire('ยอดเยี่ยม!', 'คุณได้รับโบนัสความขยัน +50 Coins!', 'success'); 
        } 
    }

    function checkForIdleCoins() { 
        if (!currentUser || !state.lastCoinUsage) return; 
        const daysSinceLastUse = dayjs().diff(dayjs(state.lastCoinUsage), 'day'); 
        if (daysSinceLastUse >= 7 && state.coins > 100) { 
            setTimeout(() => { 
                showToast("เหรียญในกระเป๋าคิดถึงคุณนะ! ลองไปร้านค้าดูสิ 🛍️"); 
            }, 3000); 
            state.lastCoinUsage = new Date().toISOString(); 
        } 
    }

    function renderWishList() { 
        const wishlistContainer = document.getElementById('wishlist-container'); 
        if (!wishlistContainer) return;
        const wishlist = state.wishList || { name: 'ของชิ้นต่อไป!', target: 1000 }; 
        const currentCoins = state.coins || 0; 
        const targetCoins = wishlist.target || 1000; 
        const percentage = Math.min(100, (currentCoins / targetCoins) * 100); 
        document.getElementById('wishlist-name').textContent = wishlist.name || 'ของชิ้นต่อไป!'; 
        document.getElementById('wishlist-progress-text').textContent = `${currentCoins} / ${targetCoins}`; 
        document.getElementById('wishlist-percentage').textContent = `${Math.floor(percentage)}%`; 
        document.getElementById('wishlist-progress-bar').style.width = `${percentage}%`; 
    }

    window.startReviewSession = (subject, topicId) => {
        currentQuizTopic = state.revisitTopics[subject].find(t => t.id === topicId);
        if (!currentQuizTopic) return;
        showPage('revisit');
        document.getElementById('revisit-list-view').classList.add('hidden');
        document.getElementById('flashcard-view').classList.remove('hidden');
        document.getElementById('flashcard-topic-title').textContent = currentQuizTopic.name;
        document.getElementById('flashcard-topic-notes').textContent = currentQuizTopic.notes || "ไม่มีโน้ตย่อ";
        const flashcardForm = document.getElementById('flashcard-form');
        flashcardForm.dataset.subject = subject;
        flashcardForm.dataset.topicId = String(topicId);
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

    function displayNextFlashcard() {
        if (currentCardIndex >= shuffledFlashcards.length) {
            finishQuiz();
            return;
        }
        const card = shuffledFlashcards[currentCardIndex];
        const flashcardEl = document.querySelector('#flashcard-view .flashcard');
        if (flashcardEl) {
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
            currentQuizTopic.nextReviewDate = dayjs().add(1, 'year').format('YYYY-MM-DD');
            showToast("ยินดีด้วย! คุณทบทวนหัวข้อนี้ครบรอบแล้ว");
        }
        addExp(5);
        saveState();
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
                    state.focus.combo = (state.focus.combo || 0) + 1;
                    state.focus.todaySessions = (state.focus.todaySessions || 0) + 1;
                    state.focus.totalSessions = (state.focus.totalSessions || 0) + 1;
                    state.focus.lastFocusDate = dayjs().format('YYYY-MM-DD');
                    const topicSelectEl = document.getElementById('focus-topic');
                    const topicText = topicSelectEl ? topicSelectEl.options[topicSelectEl.selectedIndex].text : 'เรื่องทั่วไป';
                    const baseCoin = 10;
                    const comboBonus = state.focus.combo >= 5 ? 20 : state.focus.combo >= 3 ? 10 : 0;
                    const totalCoin = baseCoin + comboBonus;
                    updateCoins(totalCoin, `โฟกัส: ${topicText}`);
                    addExp(25);
                    const topicValue = topicSelectEl ? topicSelectEl.value : 'general';
                    const duration = state.settings.focusDuration || 25;
                    if (!state.focusHistory) state.focusHistory = [];
                    state.focusHistory.push({
                        date: new Date().toISOString(),
                        topic: topicValue,
                        duration: duration
                    });
                    if(state.focusHistory.length > 500) {
                        state.focusHistory.shift();
                    }
                    saveState();
                    checkForDailyBonus();
                    renderFocusStats();
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
                            if (!timerInterval) startTimer();
                        }
                    });
                } else {
                    isFocusing = true;
                    timeLeft = (state.settings.focusDuration || 25) * 60;
                    document.getElementById('timer-mode').textContent = 'Focus';
                    updateTimerDisplay(timeLeft);
                    if (topicSelect) topicSelect.disabled = false;
                    if (settingsBtn) settingsBtn.disabled = false;
                    Swal.fire("หมดเวลาพักแล้ว", "กลับมาโฟกัสกันต่อ! 💪", "info");
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
        feather.replace(); 
    }

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
        timerDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; 
    }
    
    function renderProfilePicture(photoURL, imgElement) { 
        if (!imgElement) return; 
        const defaultImg = 'assets/profiles/startprofile.png'; 
        imgElement.src = photoURL || defaultImg; 
        imgElement.onerror = () => { imgElement.src = defaultImg; }; 
    }

    function populateProfileSelector() { 
        const container = document.querySelector('.profile-selector-body'); 
        if (!container) return; 
        container.innerHTML = ''; 
        profilePictures.forEach(pic => { 
            const path = `assets/profiles/${pic}`; 
            const option = document.createElement('div'); 
            option.className = 'profile-option'; 
            option.dataset.url = path; 
            const img = document.createElement('img'); 
            img.src = path; 
            option.appendChild(img); 
            if (path === state.profile.photoURL) { 
                option.classList.add('selected'); 
            } 
            container.appendChild(option); 
        }); 
    }
    
    // eslint-disable-next-line no-unused-vars
    function setupFriendListeners(userId) {
        if (!userId) return;
        if (friendListeners.length > 0) {
            friendListeners.forEach(unsubscribe => unsubscribe());
            friendListeners = [];
        }
        const userListener = db.collection('users').doc(userId).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                state.following = data.following || [];
                state.followers = data.followers || [];
                state.followRequests = data.followRequests || [];
                state.sentFollowRequests = data.sentFollowRequests || [];
                const requestCount = state.followRequests.length;
                const badge = document.getElementById('request-count-badge');
                const dot = document.getElementById('unread-notification-dot');
                if (badge) {
                    badge.textContent = requestCount;
                    badge.classList.toggle('hidden', requestCount === 0);
                }
                if (dot) {
                    dot.classList.toggle('hidden', requestCount === 0);
                }
                const communityPage = document.getElementById('community-page');
                const profilePage = document.getElementById('profile-page');
                if (communityPage && communityPage.classList.contains('active')) {
                    const activeTab = communityPage.querySelector('.tab-btn.active');
                    if (activeTab) {
                        const tab = activeTab.dataset.tab;
                        if (tab === 'requests') renderFollowRequests();
                        else if (tab === 'followers') renderFollowersList();
                        else renderFollowingList();
                    }
                }
                if (profilePage && profilePage.classList.contains('active')) {
                    renderProfilePage();
                }
            }
        }, error => {
            console.error("Error listening to user document:", error);
        });
        friendListeners.push(userListener);
    }

    // eslint-disable-next-line no-unused-vars
    async function renderFollowersList() {
        const listEl = document.getElementById('followers-list');
        if (!listEl) return;
        listEl.innerHTML = '<li>กำลังโหลด...</li>';
        const followerIds = state.followers || [];
        if (followerIds.length === 0) {
            listEl.innerHTML = '<li>ยังไม่มีผู้ติดตาม</li>';
            return;
        }
        const followerPromises = followerIds.map(uid => db.collection('users').doc(uid).get());
        const followerDocs = await Promise.all(followerPromises);
        listEl.innerHTML = followerDocs.map(doc => {
            if (!doc.exists) return '';
            const followerData = doc.data();
            const displayName = followerData.profile.displayName || 'User';
            const amIFollowing = (state.following || []).includes(doc.id);
            let actionButton = '';
            if (amIFollowing) {
                actionButton = `<button class="small-btn btn-secondary" disabled>กำลังติดตาม</button>`;
            } else {
                actionButton = `<button class="small-btn" onclick="handleFollowBack('${doc.id}')">ติดตามกลับ</button>`;
            }
            return `
                <li class="user-list-item">
                    <img src="${followerData.profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="user-list-avatar">
                    <div class="user-info">
                        <h4>${displayName}</h4>
                        <p>${followerData.profile.lifebuddyId || ''}</p>
                    </div>
                    <div class="user-actions">
                        ${actionButton}
                    </div>
                </li>
            `;
        }).join('');
        feather.replace();
    }

    async function renderFollowingList() {
        const listEl = document.getElementById('following-list');
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
                const listItemClass = isMutual ? 'user-list-item' : 'user-list-item disabled';
                const onClickAction = isMutual ? 
                    `onclick="startChat('${doc.id}')"` : 
                    `onclick="showToast('ต้องติดตามซึ่งกันและกันถึงจะแชทได้')"`;
                const mutualIcon = isMutual ? '<i data-feather="repeat" class="mutual-icon" title="ติดตามซึ่งกันและกัน"></i>' : '';
                return `
                    <li class="${listItemClass}" ${onClickAction}>
                        <img src="${friendData.profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="user-list-avatar">
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

    // ใน app.js, แทนที่ฟังก์ชัน renderChatList เดิมด้วยเวอร์ชันนี้

async function renderChatList() {
    // 1. ตรวจสอบเบื้องต้นและเตรียม Element
    if (!currentUser) return;
    const listEl = document.getElementById('chat-list');
    if (!listEl) return;

    listEl.innerHTML = '<li class="loading-placeholder">กำลังโหลดรายการแชท...</li>';

    // 2. === [ส่วนแสดงคำขอติดตาม] ===
    const requestIds = state.followRequests || [];
    let requestHtml = '';

    if (requestIds.length > 0) {
        // ดึงข้อมูลโปรไฟล์ของผู้ที่ส่งคำขอทั้งหมด
        const requestPromises = requestIds.map(uid => db.collection('users').doc(uid).get());
        const requestDocs = await Promise.all(requestPromises);
        
        // สร้าง HTML สำหรับแต่ละคำขอ
        const requestItemsHtml = requestDocs.map(doc => {
            if (!doc.exists) return ''; // ถ้าหา user ไม่เจอ ให้ข้ามไป
            const senderData = doc.data();
            return `
                <div class="follow-request-item">
                    <img src="${senderData.profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="chat-list-avatar">
                    <div class="request-info">
                        <strong>${senderData.profile.displayName || 'User'}</strong>
                        <span>ส่งคำขอติดตามคุณ</span>
                    </div>
                    <div class="request-actions">
                        <button class="small-btn" onclick="handleAcceptFollowRequest('${doc.id}')">ยอมรับ</button>
                        <button class="small-btn btn-secondary" onclick="handleDeclineFollowRequest('${doc.id}')">ลบ</button>
                    </div>
                </div>
            `;
        }).join('');

        // รวมเป็น Section ของคำขอติดตาม
        requestHtml = `
            <li class="chat-list-section-header">
                <h4>คำขอติดตาม (${requestIds.length})</h4>
            </li>
            <li class="follow-request-container">${requestItemsHtml}</li>
        `;
    }

    // 3. === [ส่วนแสดงรายการแชท] ===
    const following = state.following || [];
    const followers = state.followers || [];
    // กรองหาเฉพาะเพื่อนที่ติดตามกันและกัน (Mutual Friends)
    const mutualFriendIds = following.filter(id => followers.includes(id));

    let chatItemsHtml = '';

    // ตรวจสอบว่าถ้าไม่มีทั้งคำขอและเพื่อน ให้แสดงข้อความว่าง
    if (mutualFriendIds.length === 0 && requestIds.length === 0) {
        listEl.innerHTML = '<li class="empty-placeholder">หาเพื่อนและติดตามกันเพื่อเริ่มแชท!</li>';
        return;
    }

    if (mutualFriendIds.length > 0) {
        // ดึงข้อมูลโปรไฟล์และข้อความล่าสุดของเพื่อนทุกคน
        const chatDataPromises = mutualFriendIds.map(async (friendId) => {
            const chatId = [currentUser.uid, friendId].sort().join('_');
            const [friendDoc, chatDoc] = await Promise.all([
                db.collection('users').doc(friendId).get(),
                db.collection('chats').doc(chatId).get()
            ]);
            if (!friendDoc.exists) return null;
            return {
                friendProfile: friendDoc.data().profile,
                friendId: friendId,
                lastMessage: chatDoc.exists ? chatDoc.data().lastMessage : null
            };
        });

        // รอให้ข้อมูลทั้งหมดโหลดเสร็จ
        let chatItems = (await Promise.all(chatDataPromises)).filter(item => item !== null);

        // จัดเรียงรายการแชทตามเวลาของข้อความล่าสุด (ใหม่สุดอยู่บน)
        chatItems.sort((a, b) => {
            if (!a.lastMessage) return 1; // แชทที่ยังไม่เคยคุยจะอยู่ล่างสุด
            if (!b.lastMessage) return -1;
            // เปรียบเทียบเวลาของ Firestore Timestamp
            return b.lastMessage.timestamp.toMillis() - a.lastMessage.timestamp.toMillis();
        });

        // สร้าง HTML สำหรับแต่ละรายการแชท
        chatItemsHtml = chatItems.map(item => {
            const { friendProfile, friendId, lastMessage } = item;
            let lastMessageText = "เริ่มการสนทนา...";
            if (lastMessage) {
                const prefix = lastMessage.senderId === currentUser.uid ? "คุณ: " : "";
                lastMessageText = prefix + lastMessage.text;
            }
            const isActive = currentChatId === [currentUser.uid, friendId].sort().join('_');
            
            // เพิ่ม data-friend-id เพื่อให้ click listener รู้ว่าจะต้องจัดการกับเพื่อนคนไหน
            return `
                <li class="chat-list-item ${isActive ? 'active' : ''}" data-friend-id="${friendId}">
                    <img src="${friendProfile.photoURL || 'assets/profiles/startprofile.png'}" alt="${friendProfile.displayName}" class="chat-list-avatar">
                    <div class="chat-list-info">
                        <span class="chat-list-name">${friendProfile.displayName || 'User'}</span>
                        <p class="chat-list-last-message">${lastMessageText}</p>
                    </div>
                </li>
            `;
        }).join('');
    }

    // 4. รวม HTML ทั้งหมด (คำขอ + รายการแชท) แล้วแสดงผลในหน้าเว็บ
    listEl.innerHTML = requestHtml + chatItemsHtml;
}
    
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
            const nameQuery = db.collection('users')
                .where('profile.displayName', '>=', query)
                .where('profile.displayName', '<=', query + '\uf8ff')
                .limit(10);
            const idQuery = db.collection('users')
                .where('profile.lifebuddyId', '==', query)
                .limit(10);
            const [nameSnapshot, idSnapshot] = await Promise.all([nameQuery.get(), idQuery.get()]);
            const results = new Map();
            nameSnapshot.forEach(doc => {
                if (doc.id !== currentUser.uid) {
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
    
    // eslint-disable-next-line no-unused-vars
    window.handleSendFollowRequest = async (recipientId) => {
        if (!currentUser) return;
        const senderId = currentUser.uid;
        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);
        const batch = db.batch();
        batch.update(senderRef, { sentFollowRequests: firebase.firestore.FieldValue.arrayUnion(recipientId) });
        batch.update(recipientRef, { followRequests: firebase.firestore.FieldValue.arrayUnion(senderId) });
        await batch.commit();
        showToast("ส่งคำขอติดตามแล้ว!");
        if (!state.sentFollowRequests) state.sentFollowRequests = [];
        state.sentFollowRequests.push(recipientId);
        renderSearchResults(lastSearchResults);
    };
    
    // eslint-disable-next-line no-unused-vars
    window.handleAcceptFollowRequest = async (senderId) => {
        if (!currentUser) return;
        const recipientId = currentUser.uid;
        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);
        const batch = db.batch();
        batch.update(senderRef, { sentFollowRequests: firebase.firestore.FieldValue.arrayRemove(recipientId) });
        batch.update(recipientRef, {
            followers: firebase.firestore.FieldValue.arrayUnion(senderId),
            followRequests: firebase.firestore.FieldValue.arrayRemove(senderId)
        });
        await batch.commit();
        showToast("ตอบรับคำขอแล้ว");
    };
    
    // eslint-disable-next-line no-unused-vars
    window.handleDeclineFollowRequest = async (senderId) => {
        if (!currentUser) return;
        const recipientId = currentUser.uid;
        const senderRef = db.collection('users').doc(senderId);
        const recipientRef = db.collection('users').doc(recipientId);
        const batch = db.batch();
        batch.update(senderRef, { sentFollowRequests: firebase.firestore.FieldValue.arrayRemove(recipientId) });
        batch.update(recipientRef, { followRequests: firebase.firestore.FieldValue.arrayRemove(senderId) });
        await batch.commit();
        showToast("ปฏิเสธคำขอแล้ว");
    };
    
    // eslint-disable-next-line no-unused-vars
    window.handleFollowBack = async (targetUserId) => {
        if (!currentUser) return;
        const currentUserId = currentUser.uid;
        const userRef = db.collection('users').doc(currentUserId);
        const targetUserRef = db.collection('users').doc(targetUserId);
        const batch = db.batch();
        batch.update(userRef, { following: firebase.firestore.FieldValue.arrayUnion(targetUserId) });
        batch.update(targetUserRef, { followers: firebase.firestore.FieldValue.arrayUnion(currentUserId) });
        await batch.commit();
        showToast("ติดตามกลับแล้ว!");
    };
    
    async function renderFollowRequests() {
        const listEl = document.getElementById('friend-requests-list');
        if (!listEl) return;
        listEl.innerHTML = '<li>กำลังโหลด...</li>';
        const requestIds = state.followRequests || [];
        if (requestIds.length === 0) {
            listEl.innerHTML = '<li>ไม่มีคำขอติดตาม</li>';
            return;
        }
        try {
            const requestPromises = requestIds.map(uid => db.collection('users').doc(uid).get());
            const requestDocs = await Promise.all(requestPromises);
            listEl.innerHTML = requestDocs.map(doc => {
                if (!doc.exists) return '';
                const senderData = doc.data();
                const displayName = senderData.profile.displayName || 'User';
                return `
                    <li class="user-list-item">
                        <img src="${senderData.profile.photoURL || 'assets/profiles/startprofile.png'}" alt="Profile Photo" class="user-list-avatar">
                        <div class="user-info">
                            <h4>${displayName}</h4>
                            <p>${senderData.profile.lifebuddyId || ''}</p>
                        </div>
                        <div class="user-actions">
                            <button class="small-btn btn-accept-request" data-sender-id="${doc.id}">
                                <i data-feather="check"></i> ยอมรับ
                            </button>
                            <button class="small-btn btn-secondary btn-decline-request" data-sender-id="${doc.id}">
                                <i data-feather="x"></i> ปฏิเสธ
                            </button>
                        </div>
                    </li>
                `;
            }).join('');
            feather.replace();
        } catch (error) {
            console.error("Error rendering follow requests:", error);
            listEl.innerHTML = '<li>เกิดข้อผิดพลาดในการโหลดข้อมูล</li>';
        }
    }

    // eslint-disable-next-line no-unused-vars
    window.startChat = async (friendId) => {
        // ซ่อน/แสดง panel ที่ถูกต้องสำหรับจอเล็ก
        const chatListPanel = document.getElementById('chat-list-panel');
        if (chatListPanel) chatListPanel.classList.add('has-active-chat');

        currentChatId = [currentUser.uid, friendId].sort().join('_');
        if (unsubscribeChatListener) { unsubscribeChatListener(); }

        // ทำให้รายการที่เลือกอยู่ active
        await renderChatList(); 

        const friendDoc = await db.collection('users').doc(friendId).get();
        if(!friendDoc.exists) return;

        const friendData = friendDoc.data();
        const profile = friendData.profile;
        const { level } = calculateLevel(friendData.exp || 0);

        renderProfilePicture(profile.photoURL, document.getElementById('chat-partner-photo'));
        document.getElementById('chat-partner-name').textContent = profile.displayName || 'User';
        document.getElementById('chat-partner-level').textContent = `Level ${level}`;
    
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
    };


    async function sendMessage(text) {
        if (!currentChatId || !text.trim()) return;

        const messageData = {
            text: text.trim(),
            senderId: currentUser.uid,
            imestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
    
        const chatRef = db.collection('chats').doc(currentChatId);

        // 1. เพิ่มข้อความใหม่เข้าไปใน sub-collection 'messages'
        await chatRef.collection('messages').add(messageData);
    
        // เพื่อให้เราดึงข้อมูลไปแสดงในรายการแชทได้เร็ว
        const lastMessageUpdate = {
            text: messageData.text,
            senderId: messageData.senderId,
            timestamp: messageData.timestamp // ใช้ timestamp เดียวกัน
        };

        await chatRef.set({
            participants: currentChatId.split('_'),
            lastMessage: lastMessageUpdate
        }, { merge: true }); // ใช้ merge: true เพื่อไม่ให้ลบข้อมูลอื่น
    }

    // =========================================
    // ===== 7. EVENT LISTENERS & HANDLERS =====
    // =========================================
    function handleCheckIn() { 
        if (document.getElementById('check-in-btn').disabled) return; 
        const todayStr = dayjs().format('YYYY-MM-DD'); 
        if (state.lastCheckIn !== todayStr) { 
            const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD'); 
            state.streak = state.lastCheckIn === yesterdayStr ? (state.streak || 0) + 1 : 1; 
            state.lastCheckIn = todayStr; 
            addExp(40); 
            updateCoins(5, "เช็คอินรายวัน"); 
            saveState(); 
            updateHeaderUI(); 
            checkForDailyBonus(); 
        } 
    }

    function handleProfileFormSubmit(e) { 
        e.preventDefault(); 
        if (!currentUser) return; 
        Swal.fire({ 
            title: 'ยืนยันการบันทึก', 
            text: "คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลใช่หรือไม่?", 
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonColor: 'var(--primary-color)', 
            cancelButtonColor: 'var(--danger-color)', 
            confirmButtonText: 'ใช่, บันทึกเลย!', 
            cancelButtonText: 'ยกเลิก' 
        }).then(async (result) => { 
            if (result.isConfirmed) { 
                state.profile.displayName = document.getElementById('display-name').value.trim(); 
                state.profile.gender = document.getElementById('gender').value; 
                state.profile.age = document.getElementById('age').value; 
                state.profile.bio = document.getElementById('bio').value; 
                state.settings.showEmail = document.getElementById('show-email-toggle').checked; 
                await saveState(); 
                updateHeaderUI(); 
                Swal.fire('บันทึกสำเร็จ!', 'ข้อมูลโปรไฟล์ของคุณถูกอัปเดตแล้ว', 'success').then(() => { 
                    document.getElementById('profile-edit-mode').classList.add('hidden'); 
                    document.getElementById('profile-view-mode').classList.remove('hidden'); 
                    renderProfilePage(); 
                }); 
            } 
        }); 
    }
    
    function handleMoodFormSubmit(e) { 
        e.preventDefault(); 
        const selectedMood = document.getElementById('selected-mood').value; 
        if (!selectedMood) { 
            showToast("กรุณาเลือกอารมณ์ของคุณก่อน"); 
            return; 
        } 
        const notes = document.getElementById('mood-notes').value; 
        const reasons = Array.from(document.querySelectorAll('input[name="mood-reason"]:checked')).map(el => el.value); 
        const dateToSave = selectedMoodDate; 
        if (!state.moods) {
            state.moods = {}; 
        }
        const hadPreviousEntry = !!state.moods[dateToSave]; 
        state.moods[dateToSave] = { mood: selectedMood, notes: notes, reasons: reasons }; 
        if (!hadPreviousEntry) { 
            updateCoins(5, "บันทึกอารมณ์");
            addExp(25);
        } 
        document.getElementById('mood-form').reset(); 
        document.querySelectorAll('.emoji-option.selected').forEach(el => el.classList.remove('selected')); 
        saveState(); 
        renderMoodCalendar(currentMoodDate);
        showToast("บันทึกอารมณ์เรียบร้อยแล้ว!"); 
        if (dateToSave === dayjs().format('YYYY-MM-DD')) {
            checkForDailyBonus();
        }
    }
    
    function handlePlannerFormSubmit(e) { 
        e.preventDefault(); 
        const eventNameInput = document.getElementById('event-name'); 
        const eventCategoryInput = document.getElementById('event-category'); 
        const eventTimeInput = document.getElementById('event-time'); 
        const eventName = eventNameInput.value.trim(); 
        const eventCategory = eventCategoryInput.value; 
        const eventTime = eventTimeInput.value; 
        if (eventName && eventCategory && eventTime) { 
            const newEvent = { name: eventName, category: eventCategory, time: eventTime }; 
            if (!state.planner) state.planner = {}; 
            if (!state.planner[selectedPlannerDate]) { 
                state.planner[selectedPlannerDate] = []; 
            } 
            state.planner[selectedPlannerDate].push(newEvent); 
            saveState(); 
            renderPlannerCalendar(currentPlannerDate); 
            renderPlannerDetails(selectedPlannerDate); 
            eventNameInput.value = ''; 
            eventCategoryInput.value = ''; 
            eventTimeInput.value = ''; 
            showToast("เพิ่มกิจกรรมเรียบร้อยแล้ว!"); 
        } else { 
            showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง"); 
        } 
    }

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
            level: 0,
            reviewIntervals: intervals.sort((a, b) => a - b),
            nextReviewDate: dayjs().add(intervals[0], 'day').format('YYYY-MM-DD'),
            flashcards: []
        };
        if (!state.revisitTopics[subject]) {
            state.revisitTopics[subject] = [];
        }
        state.revisitTopics[subject].push(newTopic);
        saveState();
        renderRevisitList();
        document.getElementById('revisit-form').reset();
        showToast(`เพิ่มหัวข้อ "${topicName}" ในวิชา${subject}แล้ว!`);
        addExp(15);
    }

    function updatePasswordStrength() {
        const password = document.getElementById('signup-password').value;
        const strengthText = document.getElementById('password-strength-text');
        if (!strengthText) return; // ตรวจสอบแค่ strengthText

        if (password.length === 0) {
            strengthText.classList.add('hidden'); // ซ่อนข้อความเมื่อไม่มีการพิมพ์
            strengthText.textContent = '';
            return;
        }
        
        strengthText.classList.remove('hidden'); // แสดงข้อความ

        // Logic การคำนวณ score เหมือนเดิม
        let score = 0;
        if (password.length >= 8) score++;
        if (/\d/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        // Reset class ของข้อความ
        strengthText.className = 'password-feedback-text';

        // กำหนด class และข้อความตาม score
        if (score <= 2) {
            strengthText.classList.add('weak');
            strengthText.textContent = 'ความปลอดภัย: อ่อนแอ';
        } else if (score <= 4) {
            strengthText.classList.add('medium');
            strengthText.textContent = 'ความปลอดภัย: ปานกลาง';
        } else {
            strengthText.classList.add('strong');
            strengthText.textContent = 'ความปลอดภัย: แข็งแกร่ง';
        }
    }
    function checkPasswordMatch() {
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        const matchIndicator = document.getElementById('password-match-indicator');
        if (!matchIndicator) return;

        if (confirmPassword.length > 0 && password === confirmPassword) {
            matchIndicator.classList.remove('hidden');
            feather.replace(); // สั่งให้วาดไอคอน
        } else {
            matchIndicator.classList.add('hidden');
        }
    }
    
    function setupAllEventListeners() {
        if (areListenersSetup) return;

        function addPasswordInputListeners(inputId) {
            const inputElement = document.getElementById(inputId);
            if (!inputElement) return;

            if (inputId === 'signup-password') {
                inputElement.addEventListener('input', () => {
                    updatePasswordStrength();
                    checkPasswordMatch();
                });
            } else if (inputId === 'signup-password-confirm') {
                inputElement.addEventListener('input', checkPasswordMatch);
            }
        }

    // --- ผูก Event ครั้งแรกตอนโหลดหน้าเว็บ ---
        addPasswordInputListeners('signup-password');
        addPasswordInputListeners('signup-password-confirm');
        
    // --- Listener สำหรับ Google Sign-in ---
        const googleBtn = document.getElementById('google-signin-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => {
                const provider = new firebase.auth.GoogleAuthProvider();
                auth.signInWithPopup(provider)
                    .catch(error => {
                        Swal.fire({
                            icon: 'error',
                            title: 'เกิดข้อผิดพลาด',
                            text: getFriendlyAuthError(error),
                        });
                    });
            });
        }
    // ===== 2. EVENT LISTENER หลักสำหรับจัดการการ CLICK ทั้งหมด =====
        document.body.addEventListener('click', (e) => {
            const closest = (selector) => e.target.closest(selector);

        // ===== [จัดการปุ่มดูรหัสผ่านเป็นอันดับแรก] =====
        const toggleBtn = closest('.password-toggle-btn');
        if (toggleBtn) {
            const targetId = toggleBtn.dataset.target;
            const oldInput = document.getElementById(targetId);
            if (!oldInput) return;
            
            // ใช้ wrapper ที่ครอบ input อยู่เป็นตัวอ้างอิง
            const wrapper = oldInput.closest('.input-with-icon-wrapper');
            if (!wrapper) return;

            const newInput = document.createElement('input');
            for (const attr of oldInput.attributes) {
                newInput.setAttribute(attr.name, attr.value);
            }

            if (oldInput.type === 'password') {
                newInput.type = 'text';
            } else {
                newInput.type = 'password';
            }
            newInput.value = oldInput.value;

            // *** [ส่วนสำคัญ] แทนที่ input เก่าภายใน wrapper ***
            wrapper.replaceChild(newInput, oldInput);

            // *** [ส่วนสำคัญ] ผูก Event Listener ให้กับ input ใหม่ ***
            addPasswordInputListeners(targetId);

            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.dataset.feather = (newInput.type === 'password') ? 'eye' : 'eye-off';
                feather.replace();
            }
            
            newInput.focus();
            return;
        }

        // --- จัดการ Chat List Item ---
            const chatListItem = closest('.chat-list-item');
            if (chatListItem) {
                const friendId = chatListItem.dataset.friendId;
                if (!friendId) return;

                // ตรวจสอบว่าคลิกที่รูปหรือชื่อ (เพื่อไปดูโปรไฟล์) หรือคลิกที่พื้นที่อื่น (เพื่อเปิดแชท)
                if (closest('.chat-list-avatar') || closest('.chat-list-name')) {
                    e.stopPropagation(); // หยุดไม่ให้ event bubble ไปเปิดแชท
                    showFriendProfile(friendId);
                } else {
                    // ถ้าคลิกที่พื้นที่ว่างๆ ของรายการ ให้เปิดแชท
                 window.startChat(friendId);
                }
                return; // จบการทำงานในส่วนนี้
            }
        // --- จัดการปุ่มปฏิทิน ---
            const calendarNavBtn = closest('.calendar-nav-btn');
            if (calendarNavBtn) {
                const btnId = calendarNavBtn.id;
                switch(btnId) {
                    case 'planner-prev-month':
                        currentPlannerDate = currentPlannerDate.subtract(1, 'month');
                        renderPlannerCalendar(currentPlannerDate);
                        break;
                    case 'planner-next-month':
                        currentPlannerDate = currentPlannerDate.add(1, 'month');
                        renderPlannerCalendar(currentPlannerDate);
                        break;
                    case 'mood-prev-month':
                        currentMoodDate = currentMoodDate.subtract(1, 'month');
                        renderMoodCalendar(currentMoodDate);
                        break;
                    case 'mood-next-month':
                        currentMoodDate = currentMoodDate.add(1, 'month');
                        renderMoodCalendar(currentMoodDate);
                        break;
                }
                return; 
            }
         // --- จัดการปุ่มคำขอติดตาม ---    
            const acceptButton = closest('.btn-accept-request');
            if (acceptButton) {
                const senderId = acceptButton.dataset.senderId;
                if (senderId) handleAcceptFollowRequest(senderId);
                return;
            }
            const declineButton = closest('.btn-decline-request');
            if (declineButton) {
                const senderId = declineButton.dataset.senderId;
                if (senderId) handleDeclineFollowRequest(senderId);
                return;
            }
            
            // --- จัดการ Navigation Link หลัก ---
            const navLink = closest('.nav-link'); 
            if (navLink) { 
                e.preventDefault(); 
                showPage(navLink.dataset.page); 
                return; 
            }

            // --- จัดการปุ่มปิด Modal ---
            if (closest('.close-btn')) { 
                const modal = closest('.modal-overlay'); 
                if (modal) modal.classList.add('hidden'); 
                return; 
            }
            
            // --- จัดการการเลือก Mood Emoji ---
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

            // --- จัดการการเลือกรูปโปรไฟล์ใน Modal ---
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

            // --- จัดการแท็บสถิติในหน้า Focus ---
            const statsTabBtn = closest('.stats-tab-btn');
            if (statsTabBtn) {
                document.querySelectorAll('.stats-tab-btn').forEach(btn => btn.classList.remove('active'));
                statsTabBtn.classList.add('active');
                const period = statsTabBtn.dataset.period;
                renderFocusStats(period);
                return;
            }

            // --- จัดการการติ๊ก To-Do List ---
            if (e.target.matches('#todo-list input[type="checkbox"]')) {
                const todoId = parseInt(e.target.dataset.id);
                const todo = state.todos.find(t => t.id === todoId);
                if (todo) {
                    todo.completed = e.target.checked;
                    const listItem = e.target.closest('li');
                    if(listItem) listItem.classList.toggle('completed', todo.completed);
                    if (todo.completed && !todo.rewarded) {
                        todo.rewarded = true;
                        addExp(5);
                        updateCoins(1, `ทำเป้าหมายสำเร็จ`);
                        showToast(`ทำ "${todo.text}" สำเร็จ! +1 Coin & +5 EXP`);
                        setTimeout(() => {
                            state.todos = state.todos.filter(t => t.id !== todoId);
                            saveState();
                            updateHomePageUI(); 
                        }, 300000); // ลบออกจากลิสต์หลังจาก 5 นาที
                    }
                    saveState();
                }
                return;
            }

            // --- จัดการการลบ Activity และ Advice ---
            const deleteActivityBtn = closest('.delete-activity-btn');
            if (deleteActivityBtn) {
                const index = parseInt(deleteActivityBtn.dataset.index);
                state.userActivities.splice(index, 1);
                saveState();
                renderActivityList();
                return;
            }

            const deleteAdviceBtn = closest('.delete-advice-btn');
            if (deleteAdviceBtn) {
                const index = parseInt(deleteAdviceBtn.dataset.index);
                state.userAdvice.splice(index, 1);
                saveState();
                renderUserAdviceList();
                return;
            }
            
            // --- Switch-Case สำหรับจัดการปุ่มต่างๆ ตาม ID ---
            const targetId = e.target.id || closest('[id]')?.id;    
            switch(targetId) {  //=====click=====//
                case 'login-btn': 
                    openAuthModal(); 
                    break;
                case 'show-signup-link':
                    e.preventDefault();
                    document.getElementById('login-view').classList.add('hidden');
                    document.getElementById('signup-view').classList.remove('hidden');
                    document.getElementById('auth-error').textContent = '';
                    break;
                case 'show-login-link':
                    e.preventDefault();
                    document.getElementById('signup-view').classList.add('hidden');
                    document.getElementById('login-view').classList.remove('hidden');
                    document.getElementById('auth-error').textContent = '';
                    break;
                case 'forgot-password-link':
                    e.preventDefault();
                    Swal.fire({
                        title: 'รีเซ็ตรหัสผ่าน',
                        input: 'email',
                        inputLabel: 'กรุณากรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน',
                        inputPlaceholder: 'อีเมลที่ลงทะเบียนไว้',
                        showCancelButton: true,
                        confirmButtonText: 'ส่งลิงก์',
                        cancelButtonText: 'ยกเลิก',
                        showLoaderOnConfirm: true,
                        preConfirm: (email) => {
                            if (!email) {
                                Swal.showValidationMessage('กรุณากรอกอีเมล');
                                return;
                            }
                            return auth.sendPasswordResetEmail(email)
                                .catch(error => {
                                    Swal.showValidationMessage(`เกิดข้อผิดพลาด: ${getFriendlyAuthError(error)}`);
                                });
                        },
                        allowOutsideClick: () => !Swal.isLoading()
                    }).then((result) => {
                        if (result.isConfirmed) {
                            Swal.fire({
                                title: 'ส่งสำเร็จ!',
                                text: 'กรุณาตรวจสอบกล่องจดหมายของคุณสำหรับลิงก์รีเซ็ตรหัสผ่าน',
                                icon: 'success'
                            });
                        }
                    });
                    break;              
                case 'logout-btn': 
                    auth.signOut(); 
                    break;
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
                case 'go-to-edit-profile-btn': // ปุ่มดินสอในหน้าโปรไฟล์
                    openBannerSelector(); // เรียกฟังก์ชันเปิดหน้าต่างเลือกแบนเนอร์
                    break;
                case 'change-banner-btn': // ปุ่มรูปภาพบนแบนเนอร์
                    openBannerSelector();
                    break;             
                case 'main-edit-profile-btn': // ปุ่ม "แก้ไขข้อมูลโปรไฟล์"
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
                case 'random-activity-btn':
                    const activities = state.userActivities && state.userActivities.length > 0 ? state.userActivities : defaultActivities;
                    const randomIndex = Math.floor(Math.random() * activities.length);
                    const suggestionEl = document.getElementById('activity-suggestion');
                    if (suggestionEl) suggestionEl.textContent = activities[randomIndex];
                    break;
                case 'random-advice-btn':
                    const advices = state.userAdvice && state.userAdvice.length > 0 ? state.userAdvice : defaultAdvices;
                    const randomAdviceIndex = Math.floor(Math.random() * advices.length);
                    const adviceEl = document.getElementById('daily-advice');
                    if (adviceEl) adviceEl.textContent = advices[randomAdviceIndex];
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
                        });
                    break;
            }
        });

        // ===== 3. EVENT LISTENER หลักสำหรับจัดการการ SUBMIT ทั้งหมด =====
        document.body.addEventListener('submit', (e) => {
            e.preventDefault();
            switch (e.target.id) {
                case 'todo-form': 
                    const input = document.getElementById('todo-input'); 
                    if (input.value.trim()) { 
                        if (!state.todos) state.todos = [];
                        state.todos.push({ id: Date.now(), text: input.value.trim(), completed: false, rewarded: false }); 
                        input.value = ''; 
                        updateHomePageUI(); 
                        saveState(); 
                    } 
                    break;
                case 'revisit-form': 
                handleRevisitFormSubmit(e); break;
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
                    // ... (โค้ดตรวจสอบรหัสผ่านเหมือนเดิม) ...
                    const signupEmail = document.getElementById('signup-email').value;
                    const signupPassword = document.getElementById('signup-password').value;
                    const signupPasswordConfirm = document.getElementById('signup-password-confirm').value;

                    if (signupPassword !== signupPasswordConfirm) {
                        Swal.fire({ icon: 'error', title: 'รหัสผ่านไม่ตรงกัน', text: 'กรุณากรอกรหัสผ่านและยืนยันรหัสผ่านให้ตรงกัน' });
                        return;
                    }
                    const strengthMeter = document.getElementById('password-strength-meter');
                    if (signupPassword.length < 6) {
                        Swal.fire({
                            icon: 'error',
                            title: 'รหัสผ่านสั้นเกินไป',
                            text: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
                        });
                        return;
                    }

                    Swal.fire({
                        title: 'กำลังสร้างบัญชี...',
                        allowOutsideClick: false,
                        didOpen: () => { Swal.showLoading(); }
                    });

                    auth.createUserWithEmailAndPassword(signupEmail, signupPassword)
                        .then(async (userCredential) => {
                            const user = userCredential.user;
                            
                            // ส่งอีเมลยืนยันตัวตน
                            await user.sendEmailVerification();
                            // ------------------------------------

                            // สร้างข้อมูลโปรไฟล์ใน 
                            const initialName = user.email.split('@')[0];
                            const randomTag = Math.floor(1000 + Math.random() * 9000);
                            const newUserProfileData = JSON.parse(JSON.stringify(initialState));
                            newUserProfileData.profile.displayName = initialName;
                            newUserProfileData.profile.lifebuddyId = `${initialName}#${randomTag}`;
                            
                            await db.collection('users').doc(user.uid).set(newUserProfileData);
                            
                            // ออกจากระบบก่อน เพื่อบังคับให้ผู้ใช้ยืนยันตัวตน
                            await auth.signOut();

                            // --- [ส่วนสำคัญ] แสดง Pop-up ให้ไปยืนยันอีเมล ---
                            Swal.fire({
                                icon: 'info',
                                title: 'สมัครสมาชิกเกือบสำเร็จ!',
                                html: `เราได้ส่งลิงก์ยืนยันไปยัง <strong>${user.email}</strong><br/>กรุณาตรวจสอบกล่องจดหมายและคลิกลิงก์เพื่อเปิดใช้งานบัญชีของคุณ`,
                                confirmButtonText: 'เข้าใจแล้ว',
                                allowOutsideClick: false
                            }).then(() => {
                                // กลับไปที่หน้าเข้าสู่ระบบ
                                document.getElementById('signup-view').classList.add('hidden');
                                document.getElementById('login-view').classList.remove('hidden');
                            });
                        })
                        .catch(error => {
                            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: getFriendlyAuthError(error) });
                        });
                    break;

              case 'login-form':
                const loginEmailInput = document.getElementById('login-email');
                const loginPasswordInput = document.getElementById('login-password');
                const loginEmail = loginEmailInput.value;
                const loginPassword = loginPasswordInput.value;

                if (!loginEmail || !loginPassword) {
                    Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกอีเมลและรหัสผ่านของคุณ' });
                    return;
                }

                    Swal.fire({ title: 'กำลังตรวจสอบข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                    // ลองล็อกอินด้วยรหัสผ่านก่อน
                    auth.signInWithEmailAndPassword(loginEmail, loginPassword)
                        .then(userCredential => {
                            // สำเร็จ: ตรวจสอบการยืนยันอีเมล
                            const user = userCredential.user;
                            if (!user.emailVerified) {
                                auth.signOut();
                                Swal.fire({ icon: 'warning', title: 'บัญชียังไม่ถูกเปิดใช้งาน', html: `กรุณาตรวจสอบอีเมล <strong>${user.email}</strong> และคลิกลิงก์เพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ` });
                            }
                        })
                        .catch(error => {
                            // ล้มเหลว: ตรวจสอบสาเหตุ
                            // ถ้า Error คือ "ไม่พบบัญชี" เราจะไปเช็คต่อว่าผูกกับ Google หรือไม่
                            if (error.code === 'auth/user-not-found') {
                                auth.fetchSignInMethodsForEmail(loginEmail)
                                    .then(methods => {
                                        if (methods.includes('google.com')) {
                                            // **** นี่คือข้อความที่คุณต้องการ ****
                                            Swal.fire({
                                                icon: 'error',
                                                title: 'ไม่สามารถเข้าสู่ระบบได้',
                                                html: `ผู้ใช้ได้ลงทะเบียนด้วยอีเมลนี้ผ่าน Google แล้ว<br/>กรุณาเข้าสู่ระบบด้วยปุ่ม <strong>"เข้าสู่ระบบด้วย Google"</strong> แทน`,
                                            });
                                        } else {
                                            // ถ้าไม่ผูกกับ Google ก็คือไม่พบบัญชีจริงๆ
                                            Swal.fire({ icon: 'error', title: 'ไม่พบบัญชีผู้ใช้', text: 'ไม่พบผู้ใช้ที่ลงทะเบียนด้วยอีเมลนี้ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่' });
                                        }
                                    });
                            } else {
                                // ถ้าเป็น Error อื่นๆ (เช่น รหัสผิด) ให้แสดงตามปกติ
                                Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: getFriendlyAuthError(error) });
                            }
                        });
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
            case 'auth/user-not-found': return 'ไม่พบบัญชีผู้ใช้ที่ลงทะเบียนด้วยอีเมลนี้'; // คืนค่าตามจริง
            case 'auth/wrong-password': return 'รหัสผ่านไม่ถูกต้อง'; // คืนค่าตามจริง
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

            default: return 'เกิดข้อผิดพลาดที่ไม่รู้จัก กรุณาลองใหม่อีกครั้ง';
        }
    }

    function openAuthModal() { 
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('signup-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('auth-error').textContent = '';
        feather.replace();
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
    
    function openActivityManager() {
        renderActivityList();
        document.getElementById('activity-manager-modal').classList.remove('hidden');
    }

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

    function openAdviceManager() {
        renderUserAdviceList();
        document.getElementById('advice-manager-modal').classList.remove('hidden');
    }

    function closeAuthModal() { 
        document.getElementById('auth-modal').classList.add('hidden'); 
        document.getElementById('auth-error').textContent = ''; 
    }

});
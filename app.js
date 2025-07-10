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
        subjects: [
            { value: 'physics', name: 'ฟิสิกส์', removable: false },
            { value: 'chemistry', name: 'เคมี', removable: false },
            { value: 'biology', name: 'ชีววิทยา', removable: false },
            { value: 'english', name: 'ภาษาอังกฤษ', removable: false },
            { value: 'social', name: 'สังคมศึกษา', removable: false }
        ],
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
                return deepMerge(JSON.parse(JSON.stringify(initialState)), doc.data());
            } else {
                console.error(`CRITICAL: No data found in Firestore for user ${userId}. Creating new profile.`);
                const initialName = auth.currentUser.email.split('@')[0];
                const randomTag = Math.floor(1000 + Math.random() * 9000);
                const newUserProfileData = JSON.parse(JSON.stringify(initialState));
                newUserProfileData.profile.displayName = initialName;
                newUserProfileData.profile.lifebuddyId = `${initialName}#${randomTag}`;
                await db.collection('users').doc(userId).set(newUserProfileData);
                return newUserProfileData;
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
    // =============================
    function saveState() {
        if (!currentUser) return;
        checkBadges();
        db.collection('users').doc(currentUser.uid).set(state, { merge: true }).catch(error => console.error("Error saving state:", error));
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
                if (isObject(source[key]) && key in target && !Array.isArray(source[key])) {
                    output[key] = deepMerge(target[key], source[key]);
                } else {
                    output[key] = source[key];
                }
            });
        }
        return output;
    }

    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    function checkDailyReset() {
        if (!state.focus) state.focus = { totalSessions: 0, todaySessions: 0, lastFocusDate: null, combo: 0 };
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
        if(typeof state.exp !== 'number') state.exp = 0;
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
                    customClass: { title: 'swal-title-levelup' }
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
            case 'home': updateHomePageUI(); break;
            case 'planner': renderPlannerCalendar(currentPlannerDate); break;
            case 'revisit':
                document.getElementById('revisit-list-view').classList.remove('hidden');
                document.getElementById('quiz-creation-view').classList.add('hidden');
                document.getElementById('quiz-taking-view').classList.add('hidden');
                renderRevisitList();
                break;
            case 'focus': resetTimer(); renderFocusStats('day'); break;
            case 'mood': renderMoodCalendar(currentMoodDate); break;
            case 'community':
                document.getElementById('chat-conversation-view').classList.add('hidden');
                document.getElementById('chat-welcome-view').classList.remove('hidden');
                renderChatList();
                break;
            case 'shop': renderShop(); break;
            case 'rewards': updateRewardsUI(); break;
            case 'settings': updateSettingsUI(); break;
            case 'profile': renderProfilePage(); break;
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
        if (streakCountEl) streakCountEl.textContent = state.streak || 0;
        const { level } = calculateLevel(state.exp);
        const levelHeaderEl = document.getElementById('level-header-display');
        if (levelHeaderEl) levelHeaderEl.innerHTML = `<i data-feather="star"></i> Level ${level}`;
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
            tasksList.innerHTML = tasksForToday.length > 0 ? tasksForToday.map(t => `<li>${t.time} - ${t.name}</li>`).join('') : '<li>ไม่มีงานสำหรับวันนี้</li>';
        }
        const revisitList = document.getElementById('today-revisit-summary');
        if (revisitList) {
            let dueTopics = [];
            if (state.revisitTopics && typeof state.revisitTopics === 'object') {
                Object.values(state.revisitTopics).forEach(subjectArray => {
                    if (Array.isArray(subjectArray)) {
                        const dueInSubject = subjectArray.filter(t => t && t.nextReviewDate && dayjs(t.nextReviewDate).isSame(dayjs(), 'day'));
                        dueTopics = dueTopics.concat(dueInSubject);
                    }
                });
            }
            revisitList.innerHTML = dueTopics.length > 0 ? dueTopics.map(t => `<li>${t.name}</li>`).join('') : '<li>ไม่มีหัวข้อต้องทบทวน</li>';
        }
        const todayFocusCountEl = document.getElementById('today-focus-count');
        if (todayFocusCountEl) todayFocusCountEl.textContent = state.focus?.todaySessions || 0;
        const todoList = document.getElementById('todo-list');
        if (todoList) {
            const todos = state.todos || [];
            todoList.innerHTML = todos.map(todo => `<li class="${todo.completed ? 'completed' : ''}"><input type="checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}><span>${todo.text}</span></li>`).join('');
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
    
    // --- Planner and Mood Calendar Functions ---
    function renderPlannerCalendar(date) {
        const calendarEl = document.getElementById('planner-calendar');
        if (!calendarEl) return;
        currentPlannerDate = date;
        const monthYearEl = document.getElementById('planner-month-year');
        if (monthYearEl) monthYearEl.textContent = date.format('MMMM YYYY');
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
    }

    function renderPlannerDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-planner-date-display');
        const eventsList = document.getElementById('events-list');
        if (!dateDisplay || !eventsList) return;
        dateDisplay.textContent = `สำหรับวันที่ ${dayjs(dateStr).format('D MMMM')}`;
        const events = (state.planner && state.planner[dateStr]) || [];
        if (events.length > 0) {
            events.sort((a,b) => a.time.localeCompare(b.time));
            eventsList.innerHTML = events.map(e => `<li><strong>${e.time}</strong> - ${e.name} (${e.category})</li>`).join('');
        } else {
            eventsList.innerHTML = '<li>ไม่มีกิจกรรม</li>';
        }
    }

    function renderMoodCalendar(date) {
        const calendarEl = document.getElementById('mood-calendar');
        if (!calendarEl) return;
        currentMoodDate = date;
        const monthYearEl = document.getElementById('mood-month-year');
        if (monthYearEl) monthYearEl.textContent = date.format('MMMM YYYY');
        calendarEl.innerHTML = '';
        const monthStart = date.startOf('month'), startDay = monthStart.day(), daysInMonth = date.daysInMonth();
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`);
        for (let i = 0; i < startDay; i++) calendarEl.innerHTML += '<div></div>';
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            if (currentDate.isSame(dayjs(), 'day')) dayElem.classList.add('today');
            if (dateStr === selectedMoodDate) dayElem.classList.add('selected');
            const moodEntry = state.moods && state.moods[dateStr];
            if (moodEntry) {
                const moodStyles = { happy: { background: 'rgba(255, 235, 59, 0.6)' }, excited: { background: 'rgba(255, 152, 0, 0.6)' }, neutral: { background: 'rgba(189, 189, 189, 0.6)' }, sad: { background: 'rgba(66, 165, 245, 0.6)' }, angry: { background: 'rgba(239, 83, 80, 0.6)' } };
                if (moodStyles[moodEntry.mood]) dayElem.style.background = moodStyles[moodEntry.mood].background;
                const moodEmojis = { happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡' };
                dayElem.innerHTML = moodEmojis[moodEntry.mood] || i;
                dayElem.style.fontSize = '1.5rem';
                dayElem.style.lineHeight = '1.8';
            } else {
                dayElem.textContent = i;
            }
            dayElem.addEventListener('click', () => { selectedMoodDate = dateStr; renderMoodCalendar(date); });
            calendarEl.appendChild(dayElem);
        }
        renderMoodDetails(selectedMoodDate);
    }

    function renderMoodDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-mood-date-display');
        const detailsEl = document.getElementById('mood-details');
        if (!dateDisplay || !detailsEl) return;
        dateDisplay.textContent = dayjs(dateStr).format('D MMMM YYYY');
        const entry = (state.moods && state.moods[dateStr]);
        if (entry) {
            const reasonsText = (entry.reasons && entry.reasons.length > 0) ? entry.reasons.join(', ') : '<em>ไม่ระบุ</em>';
            detailsEl.innerHTML = `<p><strong>อารมณ์:</strong> ${entry.mood}</p><p><strong>บันทึก:</strong> ${entry.notes || '<em>ไม่มี</em>'}</p><p><strong>เหตุผล:</strong> ${reasonsText}</p>`;
        } else {
            detailsEl.innerHTML = '<p><i>ยังไม่มีการบันทึกสำหรับวันนี้</i></p>';
        }
    }

    // --- Subject Selector Functions ---
    function openSubjectSelector() {
        renderSubjectOptions();
        document.getElementById('subject-selector-modal').classList.remove('hidden');
    }
    function renderSubjectOptions() {
        const container = document.getElementById('subject-selector-body');
        const subjects = state.subjects || [];
        container.innerHTML = subjects.map(subject => `
            <div class="subject-option" data-value="${subject.value}">
                <span>${subject.name}</span>
                ${subject.removable ? `<button class="remove-custom-subject-btn icon-button" data-value="${subject.value}" title="ลบวิชานี้"><i data-feather="trash-2"></i></button>` : ''}
            </div>
        `).join('');
        feather.replace();
    }
    function selectSubject(value, name) {
        document.getElementById('revisit-subject-display').value = name;
        document.getElementById('revisit-subject-value').value = value;
        document.getElementById('subject-selector-modal').classList.add('hidden');
    }
    function handleAddCustomSubject(e) {
        e.preventDefault();
        const input = document.getElementById('custom-subject-input');
        const newName = input.value.trim();
        if (!newName) return;
        const newValue = `custom_${newName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        if (!state.subjects) state.subjects = [];
        if (state.subjects.some(s => s.name.toLowerCase() === newName.toLowerCase())) {
            showToast("มีวิชานี้อยู่แล้ว");
            return;
        }
        state.subjects.push({ value: newValue, name: newName, removable: true });
        saveState();
        renderSubjectOptions();
        input.value = '';
    }

    // --- Revisit & Quiz System ---
    let currentQuizState = { subject: null, topicId: null, quizzes: [], currentQuizIndex: 0, correctAnswers: 0 };
    window.renderRevisitList = () => {
        const container = document.getElementById('revisit-topics-by-subject');
        if (!container) return;
        container.innerHTML = '';
        let hasTopics = false;
        const allSubjects = state.subjects || [];
        for (const subjectData of allSubjects) {
            const subjectKey = subjectData.value;
            const subjectName = subjectData.name;
            if (state.revisitTopics && state.revisitTopics[subjectKey] && state.revisitTopics[subjectKey].length > 0) {
                hasTopics = true;
                const subjectGroup = document.createElement('div');
                subjectGroup.className = 'subject-group';
                const subjectTitle = document.createElement('h3');
                subjectTitle.className = 'subject-title';
                subjectTitle.textContent = subjectName;
                subjectGroup.appendChild(subjectTitle);
                const topicList = document.createElement('ul');
                topicList.className = 'topic-list';
                topicList.innerHTML = state.revisitTopics[subjectKey].map(topic => `
                    <li class="topic-item">
                        <div class="topic-info">
                            <span>${topic.name}</span>
                            <div class="next-review">ทบทวนครั้งถัดไป: ${dayjs(topic.nextReviewDate).format('D MMM YYYY')}</div>
                        </div>
                        <button class="small-btn" onclick="openQuizManager('${subjectKey}', ${topic.id})">จัดการควิซ</button>
                    </li>
                `).join('');
                subjectGroup.appendChild(topicList);
                container.appendChild(subjectGroup);
            }
        }
        if (!hasTopics) container.innerHTML = '<p class="subtle-text" style="text-align:center;">ยังไม่มีหัวข้อสำหรับทบทวน ลองเพิ่มดูสิ!</p>';
        feather.replace();
        const homePage = document.getElementById('home-page');
        if (homePage && homePage.classList.contains('active')) updateHomePageUI();
    };
    window.openQuizManager = (subject, topicId) => {
        currentQuizState.subject = subject;
        currentQuizState.topicId = parseInt(topicId);
        document.getElementById('revisit-list-view').classList.add('hidden');
        document.getElementById('quiz-creation-view').classList.remove('hidden');
        document.getElementById('quiz-taking-view').classList.add('hidden');
        const topic = state.revisitTopics[subject].find(t => t.id === currentQuizState.topicId);
        if (!topic) return;
        document.getElementById('creation-topic-title').textContent = topic.name;
        renderCreatedQuizzesList();
        resetQuizCreationForm();
    };
    function renderCreatedQuizzesList() {
        const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
        const listEl = document.getElementById('created-quizzes-list');
        const countEl = document.getElementById('quiz-count');
        const startBtn = document.getElementById('start-quiz-btn');
        if (!topic.quizzes || topic.quizzes.length === 0) {
            listEl.innerHTML = '<li><p class="subtle-text">ยังไม่มีควิซในหัวข้อนี้ ลองสร้างดูสิ!</p></li>';
            countEl.textContent = 0;
            startBtn.classList.add('hidden');
            return;
        }
        countEl.textContent = topic.quizzes.length;
        startBtn.classList.remove('hidden');
        listEl.innerHTML = topic.quizzes.map(quiz => `
            <li data-quiz-id="${quiz.id}">
                <span class="quiz-text">${quiz.question.substring(0, 50)}...</span>
                <div class="actions">
                    <button class="icon-button" onclick="editQuiz('${quiz.id}')" title="แก้ไข"><i data-feather="edit-2"></i></button>
                    <button class="icon-button" onclick="deleteQuiz('${quiz.id}')" title="ลบ"><i data-feather="trash-2"></i></button>
                </div>
            </li>
        `).join('');
        feather.replace();
    }
    function handleQuizCreationForm(e) {
        e.preventDefault();
        const question = document.getElementById('quiz-question-input').value.trim();
        const type = document.querySelector('input[name="quiz-type"]:checked').value;
        const explanation = document.getElementById('quiz-explanation-input').value.trim();
        const editingId = document.getElementById('editing-quiz-id').value;
        if (!question) { showToast("กรุณาใส่คำถาม"); return; }
        let newQuizData = { id: editingId ? parseInt(editingId) : Date.now(), question, type, explanation, options: [], correctAnswer: null };
        if (type === 'multiple-choice') {
            const choiceInputs = document.querySelectorAll('#choices-wrapper input[type="text"]');
            const correctRadio = document.querySelector('#choices-wrapper input[type="radio"]:checked');
            newQuizData.options = Array.from(choiceInputs).map(input => input.value.trim());
            if (newQuizData.options.some(opt => opt === '')) { showToast("กรุณากรอกข้อความในตัวเลือกให้ครบทุกช่อง"); return; }
            if (!correctRadio) { showToast("กรุณาเลือกคำตอบที่ถูกต้อง"); return; }
            newQuizData.correctAnswer = parseInt(correctRadio.value);
        } else {
            const answerInputs = document.querySelectorAll('#typed-answers-wrapper input[type="text"]');
            newQuizData.correctAnswer = Array.from(answerInputs).map(input => input.value.trim().toLowerCase());
            if (newQuizData.correctAnswer.some(ans => ans === '')) { showToast("กรุณากรอกคำตอบให้ครบทุกช่อง"); return; }
        }
        const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
        if(!topic.quizzes) topic.quizzes = [];
        if (editingId) {
            const index = topic.quizzes.findIndex(q => q.id === parseInt(editingId));
            if(index > -1) topic.quizzes[index] = newQuizData;
        } else {
            topic.quizzes.push(newQuizData);
        }
        saveState();
        renderCreatedQuizzesList();
        resetQuizCreationForm();
    }
    window.startQuiz = () => {
        const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
        if (!topic || !topic.quizzes || topic.quizzes.length === 0) return;
        document.getElementById('quiz-creation-view').classList.add('hidden');
        document.getElementById('quiz-taking-view').classList.remove('hidden');
        currentQuizState.quizzes = [...topic.quizzes].sort(() => 0.5 - Math.random());
        currentQuizState.currentQuizIndex = 0;
        currentQuizState.correctAnswers = 0;
        renderCurrentQuizQuestion();
    };
    function renderCurrentQuizQuestion() {
        document.getElementById('quiz-feedback-footer').classList.add('hidden');
        const progress = (currentQuizState.currentQuizIndex / currentQuizState.quizzes.length) * 100;
        document.getElementById('quiz-progress-bar').style.width = `${progress}%`;
        const quiz = currentQuizState.quizzes[currentQuizState.currentQuizIndex];
        document.getElementById('quiz-question-display').textContent = quiz.question;
        const answersContainer = document.getElementById('quiz-answers-container');
        const submitTypedBtn = document.getElementById('submit-typed-answer-btn');
        answersContainer.innerHTML = '';
        submitTypedBtn.classList.add('hidden');
        if (quiz.type === 'multiple-choice') {
            answersContainer.innerHTML = quiz.options.map((option, index) => `<button class="quiz-choice-btn" data-index="${index}">${option}</button>`).join('');
        } else {
            answersContainer.innerHTML = `<input type="text" id="typed-answer-input" placeholder="พิมพ์คำตอบของคุณที่นี่...">`;
            submitTypedBtn.classList.remove('hidden');
        }
    }
    function handleAnswer(answer) {
        const quiz = currentQuizState.quizzes[currentQuizState.currentQuizIndex];
        let isCorrect = false;
        if (quiz.type === 'multiple-choice') {
            const selectedIndex = parseInt(answer);
            isCorrect = (selectedIndex === quiz.correctAnswer);
            document.querySelectorAll('.quiz-choice-btn').forEach(btn => {
                btn.disabled = true;
                const btnIndex = parseInt(btn.dataset.index);
                if (btnIndex === quiz.correctAnswer) btn.classList.add('correct');
                else if (btnIndex === selectedIndex) btn.classList.add('incorrect');
            });
        } else {
            isCorrect = quiz.correctAnswer.includes(answer.trim().toLowerCase());
            const inputEl = document.getElementById('typed-answer-input');
            inputEl.disabled = true;
            inputEl.style.borderColor = isCorrect ? 'var(--success-color)' : 'var(--danger-color)';
        }
        if (isCorrect) { currentQuizState.correctAnswers++; updateCoins(1, "ตอบควิซถูก"); addExp(10); }
        showQuizFeedback(isCorrect, quiz.explanation);
    }
    function showQuizFeedback(isCorrect, explanation) {
        const footer = document.getElementById('quiz-feedback-footer');
        const titleEl = document.getElementById('feedback-title');
        const explanationEl = document.getElementById('feedback-explanation-preview');
        const explainBtn = document.getElementById('explain-btn');
        footer.className = 'quiz-feedback-footer';
        footer.classList.add(isCorrect ? 'correct' : 'incorrect');
        titleEl.innerHTML = isCorrect ? `ถูกต้อง! <span style="font-size:1rem; font-weight:400;">+1 <i class="feather" data-feather="dollar-sign"></i> +10 EXP</span>` : 'ยังไม่ถูกนะ';
        feather.replace();
        if (explanation) {
            explanationEl.textContent = `คำอธิบาย: ${explanation.substring(0, 80)}...`;
            explainBtn.classList.remove('hidden');
            explainBtn.onclick = () => Swal.fire({ title: 'คำอธิบาย', text: explanation, confirmButtonText: 'เข้าใจแล้ว' });
        } else {
            explanationEl.textContent = '';
            explainBtn.classList.add('hidden');
        }
        footer.classList.remove('hidden');
    }
    window.continueQuiz = () => {
        currentQuizState.currentQuizIndex++;
        if (currentQuizState.currentQuizIndex < currentQuizState.quizzes.length) {
            renderCurrentQuizQuestion();
        } else {
            document.getElementById('quiz-progress-bar').style.width = '100%';
            document.getElementById('quiz-taking-view').classList.add('hidden');
            const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
            Swal.fire({
                title: 'ทำควิซเสร็จแล้ว!',
                html: `คุณตอบถูก <strong>${currentQuizState.correctAnswers}</strong> จาก ${currentQuizState.quizzes.length} ข้อ<br>เก่งมาก!`,
                icon: 'success',
                confirmButtonText: 'ยอดเยี่ยม!'
            }).then(() => {
                document.getElementById('revisit-list-view').classList.remove('hidden');
                renderRevisitList();
            });
            const nextLevel = (topic.level || 0) + 1;
            if (nextLevel < topic.reviewIntervals.length) {
                topic.level = nextLevel;
                const daysToAdd = topic.reviewIntervals[nextLevel];
                topic.nextReviewDate = dayjs().add(daysToAdd, 'day').format('YYYY-MM-DD');
            } else {
                topic.nextReviewDate = dayjs().add(1, 'year').format('YYYY-MM-DD');
            }
            saveState();
        }
    };
    function resetQuizCreationForm() {
        document.getElementById('quiz-creation-form').reset();
        document.getElementById('editing-quiz-id').value = '';
        document.getElementById('creation-form-title').innerHTML = '<i data-feather="plus-circle"></i> เพิ่มควิซใหม่';
        document.getElementById('save-quiz-btn').innerHTML = '<i data-feather="save"></i> บันทึกควิซข้อนี้';
        document.getElementById('cancel-edit-quiz-btn').classList.add('hidden');
        document.getElementById('mc-options-container').classList.remove('hidden');
        document.getElementById('typed-answer-container').classList.add('hidden');
        document.querySelectorAll('#mc-options-container input').forEach(input => input.disabled = false);
        document.querySelectorAll('#typed-answer-container input').forEach(input => input.disabled = true);
        const choicesWrapper = document.getElementById('choices-wrapper');
        choicesWrapper.innerHTML = '';
        for (let i=0; i<2; i++) addChoiceInput();
        document.getElementById('typed-answers-wrapper').innerHTML = '';
        addTypedAnswerInput();
        feather.replace();
    }
    function addChoiceInput(text = '', isCorrect = false) {
        const wrapper = document.getElementById('choices-wrapper');
        const index = wrapper.children.length;
        const choiceHTML = `<div class="choice-item"><input type="radio" name="correct-choice" value="${index}" ${isCorrect ? 'checked' : ''}><input type="text" placeholder="ตัวเลือกที่ ${index + 1}" value="${text}"><button type="button" class="remove-btn icon-button"><i data-feather="trash-2"></i></button></div>`;
        wrapper.insertAdjacentHTML('beforeend', choiceHTML);
    }
    function addTypedAnswerInput(text = '') {
        const wrapper = document.getElementById('typed-answers-wrapper');
        const answerHTML = `<div class="typed-answer-item"><input type="text" placeholder="พิมพ์คำตอบที่ยอมรับได้" value="${text}"><button type="button" class="remove-btn icon-button"><i data-feather="trash-2"></i></button></div>`;
        wrapper.insertAdjacentHTML('beforeend', answerHTML);
    }
    window.editQuiz = (quizId) => {
        const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
        const quiz = topic.quizzes.find(q => q.id === parseInt(quizId));
        if (!quiz) return;
        document.getElementById('editing-quiz-id').value = quiz.id;
        document.getElementById('quiz-question-input').value = quiz.question;
        document.getElementById('quiz-explanation-input').value = quiz.explanation;
        const typeRadio = document.querySelector(`input[name="quiz-type"][value="${quiz.type}"]`);
        typeRadio.checked = true;
        typeRadio.dispatchEvent(new Event('change'));
        if (quiz.type === 'multiple-choice') {
            const choicesWrapper = document.getElementById('choices-wrapper');
            choicesWrapper.innerHTML = '';
            quiz.options.forEach((opt, index) => addChoiceInput(opt, index === quiz.correctAnswer));
        } else {
            const typedWrapper = document.getElementById('typed-answers-wrapper');
            typedWrapper.innerHTML = '';
            quiz.correctAnswer.forEach(ans => addTypedAnswerInput(ans));
        }
        document.getElementById('creation-form-title').innerHTML = '<i data-feather="edit-2"></i> กำลังแก้ไขควิซ';
        document.getElementById('save-quiz-btn').innerHTML = '<i data-feather="check-circle"></i> อัปเดตควิซ';
        document.getElementById('cancel-edit-quiz-btn').classList.remove('hidden');
        document.getElementById('quiz-creation-form').scrollIntoView({ behavior: 'smooth' });
        feather.replace();
    };
    window.deleteQuiz = (quizId) => {
        Swal.fire({
            title: 'แน่ใจหรือไม่?', text: "คุณต้องการลบควิซข้อนี้ใช่ไหม? การกระทำนี้ไม่สามารถย้อนกลับได้", icon: 'warning',
            showCancelButton: true, confirmButtonColor: 'var(--danger-color)', cancelButtonColor: '#6e7881',
            confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                const topic = state.revisitTopics[currentQuizState.subject].find(t => t.id === currentQuizState.topicId);
                topic.quizzes = topic.quizzes.filter(q => q.id !== parseInt(quizId));
                saveState();
                renderCreatedQuizzesList();
                Swal.fire('ลบแล้ว!', 'ควิซถูกลบออกไปแล้ว', 'success');
            }
        });
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
        // ถ้าไม่มี container (เช่น ไม่ได้อยู่หน้า revisit) ก็ไม่ต้องทำอะไรเลย
        if (!container) return; 

        container.innerHTML = '';
        let hasTopics = false;

        const allSubjects = state.subjects || [];

        for (const subjectData of allSubjects) {
            const subjectKey = subjectData.value;
            const subjectName = subjectData.name;

            if (state.revisitTopics && state.revisitTopics[subjectKey] && state.revisitTopics[subjectKey].length > 0) {
                hasTopics = true;
                
                const subjectGroup = document.createElement('div');
                subjectGroup.className = 'subject-group';
                
                const subjectTitle = document.createElement('h3');
                subjectTitle.className = 'subject-title';
                subjectTitle.textContent = subjectName;
                subjectGroup.appendChild(subjectTitle);

                const topicList = document.createElement('ul');
                topicList.className = 'topic-list';
                topicList.innerHTML = state.revisitTopics[subjectKey].map(topic => `
                    <li class="topic-item">
                        <div class="topic-info">
                            <span>${topic.name}</span>
                            <div class="next-review">ทบทวนครั้งถัดไป: ${dayjs(topic.nextReviewDate).format('D MMM YYYY')}</div>
                        </div>
                        <button class="small-btn" onclick="openQuizManager('${subjectKey}', ${topic.id})">จัดการควิซ</button>
                    </li>
                `).join('');
                
                subjectGroup.appendChild(topicList);
                container.appendChild(subjectGroup);
            }
        }

        if (!hasTopics) {
            container.innerHTML = '<p class="subtle-text" style="text-align:center;">ยังไม่มีหัวข้อสำหรับทบทวน ลองเพิ่มดูสิ!</p>';
        }
        
        feather.replace();

        // ตรวจสอบก่อนว่าเราอยู่ที่หน้า Home หรือไม่ ถึงจะเรียก updateHomePageUI
        const homePage = document.getElementById('home-page');
        if (homePage && homePage.classList.contains('active')) {
            updateHomePageUI();
        }
    };

    function renderMoodCalendar(date) {
        const calendarEl = document.getElementById('mood-calendar');
        if (!calendarEl) return; // ป้องกัน Error ถ้าไม่ได้อยู่หน้า Mood

        currentMoodDate = date;

        const monthYearEl = document.getElementById('mood-month-year');
        if (monthYearEl) {
            monthYearEl.textContent = date.format('MMMM YYYY');
        }

        calendarEl.innerHTML = '';

        const monthStart = date.startOf('month');
        const startDay = monthStart.day();
        const daysInMonth = date.daysInMonth();
        
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => {
            calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`;
        });
        
        for (let i = 0; i < startDay; i++) {
            calendarEl.innerHTML += '<div></div>';
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            dayElem.textContent = i;
            
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            
            if (currentDate.isSame(dayjs(), 'day')) {
                dayElem.classList.add('today');
            }
            if (dateStr === selectedMoodDate) {
                dayElem.classList.add('selected');
            }
            
            // เพิ่มสีตามอารมณ์ที่บันทึกไว้
            const moodEntry = state.moods && state.moods[dateStr];
            if (moodEntry) {
                const moodStyles = {
                    happy: { background: 'rgba(255, 235, 59, 0.6)' },   // เหลืองอ่อน
                    excited: { background: 'rgba(255, 152, 0, 0.6)' }, // ส้ม
                    neutral: { background: 'rgba(189, 189, 189, 0.6)' }, // เทา
                    sad: { background: 'rgba(66, 165, 245, 0.6)' },     // ฟ้า
                    angry: { background: 'rgba(239, 83, 80, 0.6)' }     // แดง
                };
                const styles = moodStyles[moodEntry.mood];
                if (styles) {
                    dayElem.style.background = styles.background;
                }
                 // แสดง emoji แทนตัวเลข
                const moodEmojis = { happy: '😊', excited: '🤩', neutral: '😐', sad: '😢', angry: '😡' };
                dayElem.innerHTML = moodEmojis[moodEntry.mood] || i; // ถ้ามี emoji ให้แสดง emoji
                dayElem.style.fontSize = '1.5rem'; // ปรับขนาด emoji
                dayElem.style.lineHeight = '1.8';
            }

            dayElem.addEventListener('click', () => {
                selectedMoodDate = dateStr;
                renderMoodCalendar(date); // วาดปฏิทินใหม่เพื่ออัปเดต 'selected' class
            });
            
            calendarEl.appendChild(dayElem);
        }
        
        // อัปเดตรายละเอียดด้านข้าง
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

    function renderPlannerCalendar(date) {
        const calendarEl = document.getElementById('planner-calendar');
        if (!calendarEl) return; // ป้องกัน Error ถ้าไม่ได้อยู่หน้า Planner

        currentPlannerDate = date;
        
        const monthYearEl = document.getElementById('planner-month-year');
        if (monthYearEl) {
            monthYearEl.textContent = date.format('MMMM YYYY');
        }

        calendarEl.innerHTML = '';
        
        const monthStart = date.startOf('month');
        const startDay = monthStart.day();
        const daysInMonth = date.daysInMonth();
        
        // เพิ่มหัวตาราง (วันในสัปดาห์)
        ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(d => {
            calendarEl.innerHTML += `<div class="calendar-day-name">${d}</div>`;
        });
        
        // เพิ่มช่องว่างสำหรับวันที่ก่อนเริ่มเดือน
        for (let i = 0; i < startDay; i++) {
            calendarEl.innerHTML += '<div></div>';
        }
        
        // สร้างปฏิทินสำหรับแต่ละวัน
        for (let i = 1; i <= daysInMonth; i++) {
            const dayElem = document.createElement('div');
            dayElem.className = 'calendar-day';
            dayElem.textContent = i;
            
            const currentDate = date.date(i);
            const dateStr = currentDate.format('YYYY-MM-DD');
            
            if (currentDate.isSame(dayjs(), 'day')) {
                dayElem.classList.add('today');
            }
            if (dateStr === selectedPlannerDate) {
                dayElem.classList.add('selected');
            }
            
            // เพิ่มจุดถ้ามี event ในวันนั้น
            if (state.planner && state.planner[dateStr]?.length > 0) {
                dayElem.innerHTML += '<div class="event-dot"></div>';
            }
            
            dayElem.addEventListener('click', () => {
                selectedPlannerDate = dateStr;
                renderPlannerCalendar(date); // วาดปฏิทินใหม่เพื่ออัปเดต 'selected' class
            });
            
            calendarEl.appendChild(dayElem);
        }
        
        // อัปเดตรายละเอียดด้านข้าง
        renderPlannerDetails(selectedPlannerDate);
    };

    function renderPlannerDetails(dateStr) {
        const dateDisplay = document.getElementById('selected-planner-date-display');
        const eventsList = document.getElementById('events-list');

        if (!dateDisplay || !eventsList) return; // ป้องกัน Error

        dateDisplay.textContent = `สำหรับวันที่ ${dayjs(dateStr).format('D MMMM')}`;
        
        const events = (state.planner && state.planner[dateStr]) || [];
        
        if (events.length > 0) {
            // จัดเรียง event ตามเวลาก่อนแสดงผล
            events.sort((a,b) => a.time.localeCompare(b.time));
            eventsList.innerHTML = events.map(e => `<li><strong>${e.time}</strong> - ${e.name} (${e.category})</li>`).join('');
        } else {
            eventsList.innerHTML = '<li>ไม่มีกิจกรรม</li>';
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
        const subject = document.getElementById('revisit-subject-value').value; 
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
            quizzes: []
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

        document.body.addEventListener('click', (e) => {
            const closest = (selector) => e.target.closest(selector);

            // Revisit & Quiz UI
            if (closest('#revisit-subject-display')) { openSubjectSelector(); return; }
            const subjectOption = closest('.subject-option');
            if (subjectOption) {
                if (e.target.closest('.remove-custom-subject-btn')) {
                    const valueToRemove = e.target.closest('.remove-custom-subject-btn').dataset.value;
                    state.subjects = state.subjects.filter(s => s.value !== valueToRemove);
                    saveState();
                    renderSubjectOptions();
                } else {
                    selectSubject(subjectOption.dataset.value, subjectOption.querySelector('span').textContent);
                }
                return;
            }
            const quizChoiceBtn = closest('.quiz-choice-btn');
            if (quizChoiceBtn && !quizChoiceBtn.disabled) {
                handleAnswer(quizChoiceBtn.dataset.index);
                return;
            }
            
            // จัดการปุ่มลบตัวเลือก/คำตอบ
            const removeBtn = closest('.remove-btn');
            if (removeBtn) {
                removeBtn.parentElement.remove();
                return;
            }

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
            // Other delegated clicks...
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

            const targetId = e.target.id || closest('[id]')?.id;
            switch(targetId) {
                case 'login-btn': openAuthModal(); break;
                case 'show-signup-link': e.preventDefault(); document.getElementById('login-view').classList.add('hidden'); document.getElementById('signup-view').classList.remove('hidden'); document.getElementById('auth-error').textContent = ''; break;
                case 'show-login-link': e.preventDefault(); document.getElementById('signup-view').classList.add('hidden'); document.getElementById('login-view').classList.remove('hidden'); document.getElementById('auth-error').textContent = ''; break;
                case 'logout-btn': auth.signOut(); break;
                case 'open-menu': document.getElementById('sidebar').classList.add('show'); document.getElementById('overlay').classList.add('show'); break;
                case 'close-menu': case 'overlay': closeSidebar(); break;
                case 'check-in-btn': handleCheckIn(); break;
                case 'start-timer-btn': if (timerInterval) { stopTimer(); timerInterval = null; } else { startTimer(); } break;
                case 'reset-timer-btn': resetTimer(); break;
                case 'settings-timer-btn': document.getElementById('timer-settings').classList.toggle('hidden'); break;
                case 'change-banner-btn': openBannerSelector(); break;
                case 'main-edit-profile-btn': document.getElementById('profile-view-mode').classList.add('hidden'); document.getElementById('profile-edit-mode').classList.remove('hidden'); break;
                case 'cancel-edit-profile-btn': document.getElementById('profile-edit-mode').classList.add('hidden'); document.getElementById('profile-view-mode').classList.remove('hidden'); renderProfilePage(); break;
                case 'edit-profile-picture-btn': populateProfileSelector(); document.getElementById('profile-selector-modal').classList.remove('hidden'); break;
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
                case 'manage-activities-btn': openActivityManager(); break;
                case 'manage-advice-btn': openAdviceManager(); break;
                case 'theme-light-btn': if (state.settings.theme !== 'light') { state.settings.theme = 'light'; applySettings(); saveState(); } break;
                case 'theme-dark-btn': if (state.settings.theme !== 'dark') { state.settings.theme = 'dark'; applySettings(); saveState(); } break;
                case 'search-friends-btn': document.getElementById('search-friends-modal').classList.remove('hidden'); break;
                case 'community-btn': showPage('community'); break;
                case 'edit-wishlist-btn': handleEditWishList(); break;
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
                // Quiz Creation Buttons
                case 'back-to-revisit-list-from-creation': document.getElementById('quiz-creation-view').classList.add('hidden'); document.getElementById('revisit-list-view').classList.remove('hidden'); renderRevisitList(); break;
                case 'add-choice-btn': addChoiceInput(); feather.replace(); break;
                case 'add-typed-answer-btn': addTypedAnswerInput(); feather.replace(); break;
                case 'start-quiz-btn': startQuiz(); break;
                case 'cancel-edit-quiz-btn': resetQuizCreationForm(); break;
                // Quiz Taking Buttons
                case 'continue-quiz-btn': continueQuiz(); break;
                case 'exit-quiz-btn': Swal.fire({ title: 'แน่ใจหรือไม่?', text: "คุณต้องการออกจากการทำควิซ? ความคืบหน้าจะไม่ถูกบันทึก", icon: 'warning', showCancelButton: true, confirmButtonText: 'ใช่, ออกเลย', cancelButtonText: 'ทำต่อ' }).then(r => { if(r.isConfirmed) { document.getElementById('quiz-taking-view').classList.add('hidden'); document.getElementById('revisit-list-view').classList.remove('hidden'); renderRevisitList(); }}); break;
                case 'submit-typed-answer-btn': handleAnswer(document.getElementById('typed-answer-input').value); break;
            }
        });

        document.body.addEventListener('change', (e) => {
            if (e.target.name === 'quiz-type') {
                const mcContainer = document.getElementById('mc-options-container');
                const typedContainer = document.getElementById('typed-answer-container');
                const mcInputs = mcContainer.querySelectorAll('input');
                const typedInputs = typedContainer.querySelectorAll('input');
                if (e.target.value === 'multiple-choice') {
                    mcContainer.classList.remove('hidden');
                    typedContainer.classList.add('hidden');
                    mcInputs.forEach(input => input.disabled = false);
                    typedInputs.forEach(input => input.disabled = true);
                } else {
                    mcContainer.classList.add('hidden');
                    typedContainer.classList.remove('hidden');
                    mcInputs.forEach(input => input.disabled = true);
                    typedInputs.forEach(input => input.disabled = false);
                }
            }
        });

        document.body.addEventListener('submit', (e) => {
            e.preventDefault();
            switch (e.target.id) {
                case 'todo-form': handleTodoFormSubmit(e); break;
                case 'revisit-form': handleRevisitFormSubmit(e); break;
                case 'planner-form': handlePlannerFormSubmit(e); break;
                case 'mood-form': handleMoodFormSubmit(e); break;
                case 'profile-form': handleProfileFormSubmit(e); break;
                case 'add-activity-form': handleAddActivityForm(e); break;
                case 'add-advice-form': handleAddAdviceForm(e); break;
                case 'signup-form': handleSignupFormSubmit(e); break;
                case 'login-form': handleLoginFormSubmit(e); break;
                case 'search-friends-form': handleFriendSearch(e); break;
                case 'quiz-creation-form': handleQuizCreationForm(e); break;
                case 'add-custom-subject-form': handleAddCustomSubject(e); break;
                case 'chat-form': {
                    const input = document.getElementById('chat-input');
                    if (input.value.trim()) {
                        sendMessage(input.value.trim());
                        input.value = '';
                    }
                    break;
                }
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
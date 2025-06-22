document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // ====================== 1. FIREBASE SETUP ==========================
    const firebaseConfig = { apiKey: "AIzaSyBUs0Gqhv0P1Up-vDz1HE9iFfaZr0bAEms", authDomain: "life-buddy-xok07.firebaseapp.com", projectId: "life-buddy-xok07", storageBucket: "life-buddy-xok07.firebasestorage.app", messagingSenderId: "243239137119", appId: "1:243239137119:web:2baf84c64caddf211ad0ea" };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // ===================================================================
    // ====================== 2. GLOBAL STATE & CONSTANTS ================
    let currentUser = null;
    let state = {};
    const profilePictures = [ 'girl_01.png', 'girl_02.png', 'girl_03.png', 'girl_04.png', 'girl_05.png', 'boy_01.png', 'boy_02.png', 'boy_03.png', 'boy_04.png', 'boy_05.png', 'cat_01.png', 'cat_02.png', 'cat_03.png', 'dog_01.png', 'dog_02.png', 'dog_03.png' ];
    const initialState = {
        coins: 1000, coinHistory: [], wishList: { name: 'ของชิ้นต่อไป!', current: 0, target: 1000 }, lastBonusDate: null, lastCoinUsage: null, exp: 0, streak: 0, lastCheckIn: null, todos: [], planner: {}, revisitTopics: [], moods: {},
        focus: { totalSessions: 0, todaySessions: 0, lastFocusDate: null, combo: 0 },
        badges: { focus10: false, plan5: false, mood7: false, review20: false },
        settings: { theme: 'light', focusDuration: 25, breakDuration: 5, showEmail: true },
        userActivities: ["เขียนสิ่งที่ขอบคุณวันนี้ 3 อย่าง", "ยืดเส้น 3 นาที", "โทรหาเพื่อนคนหนึ่ง", "จดไอเดียเรื่องที่สนใจ", "จัดโต๊ะทำงาน"],
        userAdvice: [],
        unlocks: { accessories: ['ไม่มี', 'หูฟัง'], background: ['ไม่มี', 'ฟ้า'] },
        profile: { 
            displayName: '', gender: 'unspecified', age: '', bio: '', lifebuddyId: '', 
            photoURL: 'assets/profiles/startprofile.png',
        },
        friends: [], friendRequestsSent: [], friendRequestsReceived: [], chatStreaks: {}
    };
    
    let timerInterval, timeLeft, isFocusing = true;
    let currentPlannerDate = dayjs(), selectedPlannerDate = dayjs().format('YYYY-MM-DD');
    let currentMoodDate = dayjs(), selectedMoodDate = dayjs().format('YYYY-MM-DD');
    let areListenersSetup = false;
    const allPages = document.querySelectorAll('.page');
    const allNavLinks = document.querySelectorAll('.nav-link');

    // ===================================================================
    // ====================== 3. APP INITIALIZATION ======================
    
    auth.onAuthStateChanged(async (user) => {
        document.getElementById('loading-overlay').classList.remove('hidden');
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
        const hash = window.location.hash.substring(1);
        showPage(hash || 'home');
        document.getElementById('loading-overlay').style.opacity = '0';
        setTimeout(() => document.getElementById('loading-overlay').classList.add('hidden'), 500);
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
        // เรียกใช้ฟังก์ชัน Render ที่จำเป็นสำหรับหน้านั้นๆ
        switch(pageId) {
            case 'home': updateHomePageUI(); break;
            case 'planner': renderPlannerCalendar(currentPlannerDate); break;
            case 'mood': renderMoodCalendar(currentMoodDate); break;
            case 'profile': renderProfilePage(); break;
            case 'rewards': updateRewardsUI(); break;
            case 'settings': updateSettingsUI(); break;
            case 'focus': resetTimer(); break;
        }
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
        const todayStr = dayjs().format('YYYY-MM-DD');
        if (!state.focus) state.focus = { todaySessions: 0, lastFocusDate: null, combo: 0 };
        if (state.focus.lastFocusDate !== todayStr) {
            state.focus.todaySessions = 0;
            state.focus.lastFocusDate = todayStr;
            state.focus.combo = 0;
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
        const guestHeader = document.getElementById('guest-header');
        const userHeader = document.getElementById('user-header');
        
        // ตรวจสอบให้แน่ใจว่าหา Element ทั้งสองเจอ
        if (!guestHeader || !userHeader) {
            console.error("Header elements not found!");
            return;
        }

        if (currentUser) {
            // เมื่อมีผู้ใช้ล็อกอิน
            guestHeader.classList.add('hidden');
            userHeader.classList.remove('hidden');
            // เรียกใช้ updateHeaderUI เพื่อจัดการการแสดงผลทั้งหมดใน userHeader
            updateHeaderUI();
        } else {
            // เมื่อไม่มีผู้ใช้ (โหมดทดลองเล่น)
            guestHeader.classList.remove('hidden');
            userHeader.classList.add('hidden');
        }
        
        closeAuthModal();

        // รีเซ็ตหน้า Community ถ้าผู้ใช้ออกจากระบบ
        if (!currentUser) {
            const friendsList = document.getElementById('friends-list');
            if (friendsList) friendsList.innerHTML = '';
            
            const friendRequestsList = document.getElementById('friend-requests-list');
            if (friendRequestsList) friendRequestsList.innerHTML = '';
            
            const chatWelcome = document.getElementById('chat-welcome-view');
            if (chatWelcome) chatWelcome.classList.remove('hidden');

            const chatConvo = document.getElementById('chat-conversation-view');
            if(chatConvo) chatConvo.classList.add('hidden');
        }
    }

    function updateHeaderUI() {
        if (!currentUser) return;

        // --- ส่วนนี้สำคัญมากสำหรับการแสดงผล Header ---
        try {
            // แสดงรูปโปรไฟล์
            renderProfilePicture(state.profile.photoURL, document.getElementById('user-photo'));

            // แสดง Coin, Streak, EXP
            document.getElementById('coin-display').innerHTML = `<i data-feather="dollar-sign"></i> ${state.coins || 0}`;
            document.getElementById('streak-display').innerHTML = `🔥 ${state.streak || 0}`;
            document.getElementById('exp-display').innerHTML = `<i data-feather="star"></i> ${state.exp || 0} EXP`;

            // จัดการปุ่มเช็คอิน
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
        } catch(error) {
            console.error("Failed to update header UI:", error);
        }
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
        document.getElementById('today-focus-count').textContent = state.focus?.todaySessions || 0;
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
    
    function applySettings() {
        document.body.dataset.theme = state.settings.theme;
        const lightBtn = document.getElementById('theme-light-btn');
        const darkBtn = document.getElementById('theme-dark-btn');
        if (lightBtn && darkBtn) {
            lightBtn.classList.toggle('active', state.settings.theme === 'light');
            darkBtn.classList.toggle('active', state.settings.theme === 'dark');
        }
    }

    function updateSettingsUI() {
        const page = document.getElementById('settings-page');
        if (!page || !page.classList.contains('active')) return;
        applySettings();
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
        renderWishList();
    }

    function checkForDailyBonus() {
        const today = dayjs().format('YYYY-MM-DD');
        if (state.lastBonusDate === today) return;
        const checkedInToday = state.lastCheckIn === today;
        const focusedToday = state.focus.lastFocusDate === today && state.focus.todaySessions > 0;
        const moodLoggedToday = state.moods[today] !== undefined;
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
        if (!currentUser || !document.getElementById('wishlist-container')) return;
    
        const wishlist = state.wishList || { name: 'ของชิ้นต่อไป!', current: 0, target: 1000 };
        const currentCoins = state.coins || 0;
        const targetCoins = wishlist.target || 1000;

        // คำนวณเปอร์เซ็นต์ให้ถูกต้อง
        const percentage = Math.min(100, (currentCoins / targetCoins) * 100);

        // อัปเดต UI
        document.getElementById('wishlist-name').textContent = wishlist.name || 'ของชิ้นต่อไป!';
        document.getElementById('wishlist-progress-text').textContent = `${currentCoins} / ${targetCoins}`;
        document.getElementById('wishlist-percentage').textContent = `${Math.floor(percentage)}%`;
    
        // --- แก้ไขการกำหนดความกว้างของ Progress Bar ---
        const progressBar = document.getElementById('wishlist-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }

    function startTimer() {
        const startBtn = document.getElementById('start-timer-btn');
        startBtn.innerHTML = '<i data-feather="pause"></i> หยุดชั่วคราว';
        feather.replace();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                if (isFocusing) {
                    state.focus.combo = (state.focus.combo || 0) + 1;
                    state.focus.todaySessions = (state.focus.todaySessions || 0) + 1;
                    state.focus.lastFocusDate = dayjs().format('YYYY-MM-DD');
                    let comboBonus = 0;
                    if (state.focus.combo >= 5) comboBonus = 20;
                    else if (state.focus.combo >= 3) comboBonus = 10;
                    const baseCoin = 10;
                    const totalCoin = baseCoin + comboBonus;
                    updateCoins(totalCoin, `โฟกัสรอบที่ ${state.focus.combo}`);
                    addExp(25);
                    saveState();
                    checkForDailyBonus();
                    isFocusing = false;
                    timeLeft = (state.settings.breakDuration || 5) * 60;
                    document.getElementById('timer-mode').textContent = 'Break';
                    updateTimerDisplay(timeLeft);
                    Swal.fire("เยี่ยมมาก!", "พักสักหน่อยนะ 🧘", "success");
                    startTimer();
                } else {
                    isFocusing = true;
                    timeLeft = (state.settings.focusDuration || 25) * 60;
                    document.getElementById('timer-mode').textContent = 'Focus';
                    updateTimerDisplay(timeLeft);
                    Swal.fire("หมดเวลาพักแล้ว", "กลับมาโฟกัสกันต่อ! 💪", "info");
                    resetTimer();
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
        timeLeft = (state.settings.focusDuration || 25) * 60;
        updateTimerDisplay(timeLeft);
        document.getElementById('timer-mode').textContent = 'Focus';
        const startBtn = document.getElementById('start-timer-btn');
        startBtn.innerHTML = '<i data-feather="play"></i> เริ่ม';
        feather.replace();
    }

    function updateTimerDisplay(time) {
        const minutes = Math.floor(time / 60); const seconds = time % 60;
        document.getElementById('timer-display').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

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
    };

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
    };

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

    function openActivityManager() { renderActivityList(); document.getElementById('activity-manager-modal').classList.remove('hidden'); }
    function closeActivityManager() { document.getElementById('activity-manager-modal').classList.add('hidden'); }
    function renderActivityList() {
        const container = document.getElementById('activity-list-container');
        container.innerHTML = (state.userActivities || defaultActivities).map((activity, index) => `<div class="activity-item"><span>${activity}</span><button class="delete-activity-btn" data-index="${index}" title="ลบกิจกรรม"><i data-feather="trash-2"></i></button></div>`).join('');
        feather.replace();
    }
    
    function openAdviceManager() { renderUserAdviceList(); document.getElementById('advice-manager-modal').classList.remove('hidden'); }
    function closeAdviceManager() { document.getElementById('advice-manager-modal').classList.add('hidden'); }
    function renderUserAdviceList() {
        const container = document.getElementById('advice-list-container');
        if (!container) return;
        container.innerHTML = (state.userAdvice || []).map((advice, index) => `<div class="activity-item"><span>${advice}</span><button class="delete-advice-btn icon-button" data-index="${index}" title="ลบคำแนะนำ"><i data-feather="trash-2"></i></button></div>`).join('') || '<p style="padding: 15px; text-align: center; color: var(--subtle-text-color);"><i>ยังไม่มีคำแนะนำส่วนตัว</i></p>';
        feather.replace();
    }

    function renderProfilePicture(photoURL, imgElement) { 
        if (!imgElement) return; 
        const defaultImg = 'assets/profiles/startprofile.png'; 
        imgElement.src = photoURL || defaultImg; imgElement.onerror = () => { imgElement.src = defaultImg; }; }
    
    function populateProfileSelector() { const container = document.querySelector('.profile-selector-body'); if (!container) return; container.innerHTML = ''; profilePictures.forEach(pic => { const path = `assets/profiles/${pic}`; const option = document.createElement('div'); option.className = 'profile-option'; option.dataset.url = path; const img = document.createElement('img'); img.src = path; option.appendChild(img); if (path === state.profile.photoURL) { option.classList.add('selected'); } container.appendChild(option); }); }
    
    function renderProfilePage() {
        if (!currentUser) return;
        document.getElementById('profile-view-mode').classList.remove('hidden');
        document.getElementById('profile-edit-mode').classList.add('hidden');
        const displayName = state.profile.displayName || currentUser.displayName || 'User';
        renderProfilePicture(state.profile.photoURL, document.getElementById('profile-view-photo'));
        document.getElementById('profile-view-name').textContent = displayName;
        document.getElementById('profile-view-lifebuddy-id').textContent = state.profile.lifebuddyId || '';
        document.getElementById('profile-view-bio').textContent = state.profile.bio || 'ยังไม่มีคำอธิบายตัวตน...';
        if (currentUser.metadata.creationTime) {
            const joinDate = dayjs(currentUser.metadata.creationTime).format('MMMM YYYY');
            document.getElementById('profile-view-joindate').innerHTML = `<i data-feather="calendar"></i> เข้าร่วมเมื่อ ${joinDate}`;
        }
        document.getElementById('profile-stat-streak').textContent = state.streak || 0;
        document.getElementById('profile-stat-total-exp').textContent = state.exp || 0;
        document.getElementById('profile-stat-focus').textContent = state.focus?.totalSessions || 0;
        document.getElementById('profile-stat-moods').textContent = Object.keys(state.moods || {}).length;
        const achievementsContainer = document.getElementById('profile-achievements-container');
        const badgeData = [ { id: 'focus10', title: 'นักโฟกัสหน้าใหม่'}, { id: 'plan5', title: 'นักวางแผนตัวยง'}, { id: 'mood7', title: 'จิตใจเบิกบาน'}, { id: 'review20', title: 'ยอดนักทบทวน'} ];
        const unlockedBadges = badgeData.filter(badge => state.badges[badge.id]);
        if (unlockedBadges.length > 0) {
            achievementsContainer.innerHTML = unlockedBadges.map(badge => `<div class="stat-item">${badge.title}</div>`).join('');
        } else {
            achievementsContainer.innerHTML = '<p class="subtle-text">ยังไม่มีความสำเร็จ... มาเริ่มสะสมกันเลย!</p>';
        }
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
        const friendsListener = db.collection('users').doc(userId).onSnapshot(doc => { if (doc.exists) { state.friends = doc.data().friends || []; if (document.getElementById('community-page').classList.contains('active')) { renderFriendsList(); } } });
        const requestsListener = db.collection('users').doc(userId).onSnapshot(doc => { if (doc.exists) { state.friendRequestsReceived = doc.data().friendRequestsReceived || []; if (document.getElementById('community-page').classList.contains('active')) { renderFriendRequests(); } const requestCount = state.friendRequestsReceived.length; const badge = document.getElementById('request-count-badge'); const dot = document.getElementById('unread-notification-dot'); badge.textContent = requestCount; badge.classList.toggle('hidden', requestCount === 0); dot.classList.toggle('hidden', requestCount === 0); } });
        friendListeners.push(friendsListener, requestsListener);
    }

    async function renderFriendsList() {
        const listEl = document.getElementById('friends-list');
        listEl.innerHTML = '<li class="user-list-item empty-state">Loading...</li>';
        if (!state.friends || state.friends.length === 0) {
            listEl.innerHTML = '<li class="user-list-item empty-state">ยังไม่มีเพื่อน... ลองค้นหาดูสิ!</li>';
            return;
        }
        const friendPromises = state.friends.map(uid => db.collection('users').doc(uid).get());
        const friendDocs = await Promise.all(friendPromises);
        listEl.innerHTML = friendDocs.map(doc => {
            if (!doc.exists) return '';
            const friendData = doc.data();
            const displayName = friendData.profile.displayName || 'User';
            const img = document.createElement('img');
            renderProfilePicture(friendData.profile.photoURL, img);
            return `
                <li class="user-list-item" onclick="startChat('${doc.id}')">
                    <div class="user-list-avatar">${img.outerHTML}</div>
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
        if (!state.friendRequestsReceived || state.friendRequestsReceived.length === 0) {
            listEl.innerHTML = '<li class="user-list-item empty-state">ไม่มีคำขอเป็นเพื่อน</li>';
            return;
        }
        const requestPromises = state.friendRequestsReceived.map(uid => db.collection('users').doc(uid).get());
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

    // ===================================================================
    // ====================== 7. EVENT HANDLER FUNCTIONS =================
    // ===================================================================

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
        if (!selectedMood) { showToast("กรุณาเลือกอารมณ์ของคุณก่อน"); return; }
        const notes = document.getElementById('mood-notes').value;
        const reasons = Array.from(document.querySelectorAll('input[name="mood-reason"]:checked')).map(el => el.value);
        const todayStr = dayjs().format('YYYY-MM-DD');
        if (!state.moods) state.moods = {};
        const hadPreviousEntry = !!state.moods[todayStr];
        state.moods[todayStr] = { mood: selectedMood, notes: notes, reasons: reasons };
        if (!hadPreviousEntry) { updateCoins(5, "บันทึกอารมณ์"); }
        document.getElementById('mood-form').reset();
        document.querySelectorAll('.emoji-option.selected').forEach(el => el.classList.remove('selected'));
        saveState();
        renderMoodCalendar(currentMoodDate);
        showToast("บันทึกอารมณ์เรียบร้อยแล้ว!");
        checkForDailyBonus();
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
            if (!state.planner[selectedPlannerDate]) { state.planner[selectedPlannerDate] = []; }
            state.planner[selectedPlannerDate].push(newEvent);
            saveState();
            renderPlannerCalendar(currentPlannerDate);
            renderPlannerDetails(selectedPlannerDate);
            eventNameInput.value = ''; eventCategoryInput.value = ''; eventTimeInput.value = '';
            showToast("เพิ่มกิจกรรมเรียบร้อยแล้ว!");
        } else {
            showToast("กรุณากรอกข้อมูลให้ครบทุกช่อง");
        }
    }

    // ===================================================================
    // ====================== 8. EVENT LISTENER SETUP ====================
    // ===================================================================
    
    function setupAllEventListeners() {
        if (areListenersSetup) return;

        document.body.addEventListener('click', (e) => {
            const closest = (selector) => e.target.closest(selector);
            
            // --- Navigation & Sidebar ---
            if (closest('#open-menu')) { document.getElementById('sidebar').classList.add('show'); document.getElementById('overlay').classList.add('show'); return; }
            if (closest('#close-menu')) { closeSidebar(); return; }
            if (closest('#overlay')) { closeSidebar(); return; }
            const navLink = closest('.nav-link');
            if (navLink) { e.preventDefault(); showPage(navLink.dataset.page); return; }

            // --- Auth ---
            if (closest('#login-btn')) { openAuthModal(); return; }
            if (closest('#logout-btn')) { auth.signOut(); return; }
            if (closest('.close-btn')) { const modal = closest('.modal-overlay'); if (modal) modal.classList.add('hidden'); return; }
            if (closest('#show-signup-link')) { e.preventDefault(); document.getElementById('login-view').classList.add('hidden'); document.getElementById('signup-view').classList.remove('hidden'); return; }
            if (closest('#show-login-link')) { e.preventDefault(); document.getElementById('signup-view').classList.add('hidden'); document.getElementById('login-view').classList.remove('hidden'); return; }
            if (closest('#google-signin-btn')) { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error)); return; }

            // --- Profile ---
            if (closest('#profile-link')) { e.preventDefault(); showPage('profile'); return; }
            if (closest('#go-to-edit-profile-btn')) { document.getElementById('profile-view-mode').classList.add('hidden'); document.getElementById('profile-edit-mode').classList.remove('hidden'); return; }
            if (closest('#cancel-edit-profile-btn')) { document.getElementById('profile-edit-mode').classList.add('hidden'); document.getElementById('profile-view-mode').classList.remove('hidden'); renderProfilePage(); return; }
            if (closest('#edit-profile-picture-btn')) { populateProfileSelector(); document.getElementById('profile-selector-modal').classList.remove('hidden'); return; }
            const profileOption = closest('.profile-option');
            if (profileOption) { (async () => { const newPhotoURL = profileOption.dataset.url; state.profile.photoURL = newPhotoURL; await saveState(); renderProfilePicture(newPhotoURL, document.getElementById('user-photo')); renderProfilePicture(newPhotoURL, document.getElementById('profile-view-photo')); renderProfilePicture(newPhotoURL, document.getElementById('profile-edit-photo')); document.getElementById('profile-selector-modal').classList.add('hidden'); showToast('เปลี่ยนรูปโปรไฟล์เรียบร้อย!'); })(); return; }

            // --- Core Features ---
            if (closest('#check-in-btn')) { handleCheckIn(); return; }
            if (closest('#random-activity-btn')) { document.getElementById('activity-suggestion').textContent = (state.userActivities || defaultActivities)[Math.floor(Math.random() * (state.userActivities || defaultActivities).length)]; return; }
            if (closest('#random-advice-btn')) { const combinedAdvice = [...defaultAdvices, ...(state.userAdvice || [])]; document.getElementById('daily-advice').textContent = combinedAdvice[Math.floor(Math.random() * combinedAdvice.length)]; return; }
            const emojiOption = closest('.emoji-option');
            if (emojiOption) { document.querySelectorAll('.emoji-option').forEach(opt => opt.classList.remove('selected')); emojiOption.classList.add('selected'); document.getElementById('selected-mood').value = emojiOption.dataset.mood; return; }

            // --- Timer ---
            if (closest('#start-timer-btn')) { if (timerInterval) { stopTimer(); timerInterval = null; } else { startTimer(); } return; }
            if (closest('#reset-timer-btn')) { resetTimer(); return; }
            if (closest('#settings-timer-btn')) { document.getElementById('timer-settings').classList.toggle('hidden'); return; }
            if (closest('#save-timer-settings-btn')) { state.settings.focusDuration = parseInt(document.getElementById('focus-duration').value); state.settings.breakDuration = parseInt(document.getElementById('break-duration').value); saveState(); resetTimer(); document.getElementById('timer-settings').classList.add('hidden'); showToast("บันทึกการตั้งค่าเวลาแล้ว"); return; }
            
            // --- Calendar Navigation ---
            if (closest('#planner-prev-month')) { currentPlannerDate = currentPlannerDate.subtract(1, 'month'); renderPlannerCalendar(currentPlannerDate); return; }
            if (closest('#planner-next-month')) { currentPlannerDate = currentPlannerDate.add(1, 'month'); renderPlannerCalendar(currentPlannerDate); return; }
            if (closest('#mood-prev-month')) { currentMoodDate = currentMoodDate.subtract(1, 'month'); renderMoodCalendar(currentMoodDate); return; }
            if (closest('#mood-next-month')) { currentMoodDate = currentMoodDate.add(1, 'month'); renderMoodCalendar(currentMoodDate); return; }

        });

        document.body.addEventListener('submit', (e) => {
            e.preventDefault();
            switch (e.target.id) {
                case 'todo-form': const input = document.getElementById('todo-input'); if (input.value.trim()) { state.todos.push({ id: Date.now(), text: input.value.trim(), completed: false }); input.value = ''; updateHomePageUI(); saveState(); } break;
                case 'planner-form': handlePlannerFormSubmit(e); break;
                case 'mood-form': handleMoodFormSubmit(e); break;
                case 'profile-form': handleProfileFormSubmit(e); break;
                case 'add-activity-form': const inputAct = document.getElementById('new-activity-input'); if (inputAct.value.trim()) { if (!state.userActivities) state.userActivities = [...defaultActivities]; state.userActivities.push(inputAct.value.trim()); saveState(); renderActivityList(); inputAct.value = ''; showToast('เพิ่มกิจกรรมใหม่แล้ว!'); } break;
                case 'add-advice-form': const inputAdv = document.getElementById('new-advice-input'); if (inputAdv.value.trim()) { if (!state.userAdvice) state.userAdvice = []; state.userAdvice.push(inputAdv.value.trim()); saveState(); renderUserAdviceList(); inputAdv.value = ''; showToast('เพิ่มคำแนะนำใหม่แล้ว!'); } break;
                case 'signup-form': const emailS = document.getElementById('signup-email').value; const passwordS = document.getElementById('signup-password').value; auth.createUserWithEmailAndPassword(emailS, passwordS).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error)); break;
                case 'login-form': const emailL = document.getElementById('login-email').value; const passwordL = document.getElementById('login-password').value; auth.signInWithEmailAndPassword(emailL, passwordL).catch(error => document.getElementById('auth-error').textContent = getFriendlyAuthError(error)); break;
            }
        });

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

    function closeAuthModal() { 
        document.getElementById('auth-modal').classList.add('hidden'); 
        document.getElementById('auth-error').textContent = ''; 
    }

});
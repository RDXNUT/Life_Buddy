document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // ====================== 1. FIREBASE SETUP ==========================
    // ===================================================================
    
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

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

    // ===================================================================
    // ====================== 3. AUTHENTICATION & DATA ===================
    // ===================================================================

    auth.onAuthStateChanged(async user => {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.style.opacity = '1';

        if (user) {
            currentUser = user;
            await loadStateFromFirestore(user.uid);
        } else {
            currentUser = null;
            state = JSON.parse(JSON.stringify(initialState));
        }
        initializeApp(); 
    });

    // ** แก้ไขตรรกะที่ผิดพลาดตรงนี้ **
    async function loadStateFromFirestore(userId) {
        try {
            const docRef = db.collection('users').doc(userId);
            const doc = await doc.get();
            if (doc.exists) {
                const loadedData = doc.data();
                // นำข้อมูลที่โหลดมา ผสานกับ initialState เพื่อให้แน่ใจว่ามี key ครบ
                // แต่จะให้ความสำคัญกับข้อมูลที่โหลดมา (loadedData) เป็นหลัก
                state = deepMerge(initialState, loadedData);

                // ตรวจสอบเพิ่มเติมสำหรับ userActivities
                if (!state.userActivities || state.userActivities.length === 0) {
                    state.userActivities = [...defaultActivities];
                }
            } else {
                state = JSON.parse(JSON.stringify(initialState));
                await saveState(); // สร้างเอกสารใหม่สำหรับ User ใหม่
            }
        } catch (error) {
            console.error("Error loading state from Firestore:", error);
            state = JSON.parse(JSON.stringify(initialState));
        }
    }

    // Helper function for deep merging state objects
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

    function saveState() {
        if (!currentUser) {
            showToast("เข้าสู่ระบบเพื่อบันทึกข้อมูลของคุณ");
            return;
        }
        checkBadges();
        db.collection('users').doc(currentUser.uid).set(state, { merge: true })
            .catch(error => console.error("Error saving state: ", error));
    }
    
    // ===================================================================
    // ====================== 4. CORE APP LOGIC ==========================
    // ===================================================================

    function initializeApp() {
        if (!areListenersSetup) {
            setupAllEventListeners();
            areListenersSetup = true;
        }
        
        updateUIForLoginStatus();
        applySettings();
        checkDailyReset();
        renderAllPages();
        
        const activePageId = document.querySelector('.page.active')?.id.replace('-page', '') || 'home';
        showPage(activePageId);

        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
            }, 500);
        }
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

    // ... (ฟังก์ชันที่เหลือทั้งหมดเหมือนกับเวอร์ชันสมบูรณ์ล่าสุดทุกประการ) ...

});
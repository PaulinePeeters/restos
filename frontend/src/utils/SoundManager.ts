// gestion du son
let audioContextUnlocked = false;
const audioObj = new Audio('/sounds/ding.mp3');

export const unlockAudio = () => {
    if (audioContextUnlocked) return;
    audioObj.play().then(() => {
        audioObj.pause();
        audioObj.currentTime = 0;
        audioContextUnlocked = true;
    }).catch(e => console.warn("Unlock audio failed:", e));
};

export const playSound = (type: string = 'notification') => {
    try {
        const a = audioObj.cloneNode() as HTMLAudioElement;
        a.play().catch(e => console.warn("Lecture audio bloquée:", e));

        if (type === 'alert') {
            setTimeout(() => {
                const b = audioObj.cloneNode() as HTMLAudioElement;
                b.play().catch(e => console.warn("Lecture audio bloquée:", e));
            }, 300); // 300ms pour un effet "ding-ding"
        }
    } catch (err) {
        console.error("Erreur lecture son:", err);
    }
};

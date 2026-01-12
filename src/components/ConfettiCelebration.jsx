import { useEffect, useState } from 'react';

const CONFETTI_COLORS = [
    '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
    '#5f27cd', '#00d2d3', '#1dd1a1', '#ff9f43', '#ee5253'
];

const CONFETTI_COUNT = 50;
const ANIMATION_DURATION_MS = 3000;

function createConfettiPiece(index) {
    const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.8;
    const duration = 2 + Math.random() * 1.5;
    const size = 8 + Math.random() * 8;
    const rotation = Math.random() * 360;

    return {
        id: index,
        color,
        left: `${left}%`,
        delay: `${delay}s`,
        duration: `${duration}s`,
        size: `${size}px`,
        rotation: `${rotation}deg`,
        shape: Math.random() > 0.5 ? 'square' : 'rectangle'
    };
}

export default function ConfettiCelebration({ milestone, onComplete }) {
    const [pieces] = useState(() =>
        Array.from({ length: CONFETTI_COUNT }, (_, i) => createConfettiPiece(i))
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete?.();
        }, ANIMATION_DURATION_MS);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1000,
                overflow: 'hidden'
            }}
            aria-hidden="true"
        >
            {/* Milestone badge - use flexbox wrapper for centering so animation doesn't affect position */}
            <div
                style={{
                    position: 'absolute',
                    top: '30%',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    zIndex: 1001
                }}
            >
                <div
                    style={{
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        color: '#000',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        padding: '1rem 2rem',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(251, 191, 36, 0.5)',
                        animation: 'badge-pop 0.6s ease-out, fadeOut 0.5s ease-in 2.5s forwards',
                        textAlign: 'center'
                    }}
                >
                    🎉 {milestone} Day Streak!
                </div>
            </div>

            {/* Confetti pieces */}
            {pieces.map(piece => (
                <div
                    key={piece.id}
                    style={{
                        position: 'absolute',
                        top: '-20px',
                        left: piece.left,
                        width: piece.shape === 'square' ? piece.size : `calc(${piece.size} * 0.6)`,
                        height: piece.size,
                        background: piece.color,
                        borderRadius: piece.shape === 'square' ? '2px' : '1px',
                        transform: `rotate(${piece.rotation})`,
                        animation: `confetti-fall ${piece.duration} ease-out ${piece.delay} forwards`
                    }}
                />
            ))}
        </div>
    );
}

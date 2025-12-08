import { describe, it, expect } from 'vitest';
import { cmToM, mToCm, snap, clampInsideBau, aabbIntersect } from './fullLoadUtils';

describe('fullLoadUtils', () => {
    it('converts cm to m', () => {
        expect(cmToM(100)).toBe(1);
        expect(cmToM(50)).toBe(0.5);
        expect(cmToM(0)).toBe(0);
    });

    it('converts m to cm', () => {
        expect(mToCm(1)).toBe(100);
        expect(mToCm(0.5)).toBe(50);
        expect(mToCm(0)).toBe(0);
    });

    it('snaps values', () => {
        expect(snap(1.02, 0.05)).toBe(1.00);
        expect(snap(1.03, 0.05)).toBe(1.05);
    });

    it('clamps inside bau', () => {
        const bauBox = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
        const size = { x: 2, y: 2, z: 2 };

        // Center
        expect(clampInsideBau({ x: 5, y: 5, z: 5 }, size, bauBox)).toEqual({ x: 5, y: 5, z: 5 });

        // Out of bounds (too low)
        expect(clampInsideBau({ x: -1, y: 5, z: 5 }, size, bauBox)).toEqual({ x: 1, y: 5, z: 5 }); // minX + halfX = 0 + 1 = 1

        // Out of bounds (too high)
        expect(clampInsideBau({ x: 12, y: 5, z: 5 }, size, bauBox)).toEqual({ x: 9, y: 5, z: 5 }); // maxX - halfX = 10 - 1 = 9
    });

    it('checks aabb intersection', () => {
        const box1 = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
        const box2 = { min: { x: 1, y: 1, z: 1 }, max: { x: 3, y: 3, z: 3 } }; // Overlaps
        const box3 = { min: { x: 3, y: 3, z: 3 }, max: { x: 5, y: 5, z: 5 } }; // No overlap

        expect(aabbIntersect(box1, box2)).toBe(true);
        expect(aabbIntersect(box1, box3)).toBe(false);
    });
});

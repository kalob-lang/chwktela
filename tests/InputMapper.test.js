
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { InputMapper } from '../src/input/InputMapper';

describe('InputMapper', () => {
    let mapper;

    beforeEach(() => {
        mapper = new InputMapper();
        // Reset default
        mapper.DEADZONE = 0.5;
    });

    it('initializes with default deadzone', () => {
        expect(mapper.DEADZONE).toBe(0.5);
    });

    describe('processStick', () => {
        it('filters input within deadzone', () => {
            // 0.4 magnitude < 0.5 threshold
            const result = mapper.processStick(0.4, 0);
            expect(result.active).toBe(false);
            expect(result.magnitude).toBe(0);
            expect(result.angle).toBe(0);
        });

        it('filters diagonal input within deadzone', () => {
            // x=0.3, y=0.3 => mag ~0.42 < 0.5
            const result = mapper.processStick(0.3, 0.3);
            expect(result.active).toBe(false);
        });

        it('accepts input outside deadzone', () => {
            // 0.6 magnitude > 0.5
            const result = mapper.processStick(0.6, 0);
            expect(result.active).toBe(true);
            expect(result.magnitude).toBe(0.6);
            expect(result.x).toBe(0.6);
        });

        it('calculates correct angles', () => {
            // In browser Gamepad API:
            // Axis 1 (Left Stick Y): Negative = Up, Positive = Down.
            // Axis 0 (Left Stick X): Negative = Left, Positive = Right.

            // Up (x=0, y=-1)
            const up = mapper.processStick(0, -1);
            expect(up.active).toBe(true);
            // atan2(-1, 0) = -PI/2 -> deg = -90 + 90 = 0 -> NORTH
            expect(up.sector).toBe('NORTH');

            // Right (x=1, y=0)
            const right = mapper.processStick(1, 0);
            // atan2(0, 1) = 0 -> deg = 0 + 90 = 90
            // 90° is the boundary between NORTH_EAST (30-90) and SOUTH_EAST (90-150)
            // At exactly 90°: NORTH_EAST check is >= 30 && < 90 -> false (90 is not < 90)
            // SOUTH_EAST check is >= 90 && < 150 -> true
            expect(right.sector).toBe('SOUTH_EAST');

            // Down (x=0, y=1)
            const down = mapper.processStick(0, 1);
            // atan2(1, 0) = PI/2 -> deg = 90 + 90 = 180 -> SOUTH
            expect(down.sector).toBe('SOUTH');

            // Left (x=-1, y=0)
            const left = mapper.processStick(-1, 0);
            // atan2(0, -1) = PI -> deg = 180 + 90 = 270
            // 270° is the boundary between SOUTH_WEST (210-270) and NORTH_WEST (270-330)
            // SOUTH_WEST: >= 210 && < 270 -> false (270 is not < 270)
            // NORTH_WEST: >= 270 && < 330 -> true
            expect(left.sector).toBe('NORTH_WEST');

            // NE diagonal (x=0.7, y=-0.7)
            const ne = mapper.processStick(0.7, -0.7);
            // atan2(-0.7, 0.7) = -PI/4 -> deg = -45 + 90 = 45 -> NORTH_EAST (30-90)
            expect(ne.sector).toBe('NORTH_EAST');

            // SW diagonal (x=-0.7, y=0.7)
            const sw = mapper.processStick(-0.7, 0.7);
            // atan2(0.7, -0.7) = 3PI/4 -> deg = 135 + 90 = 225 -> SOUTH_WEST (210-270)
            expect(sw.sector).toBe('SOUTH_WEST');
        });
    });

    describe('Dynamic Deadzone Updates', () => {
        it('respects updated deadzone threshold', () => {
            // Default 0.5
            let result = mapper.processStick(0.4, 0);
            expect(result.active).toBe(false); // Filtered

            // Lower deadzone to 0.1
            mapper.DEADZONE = 0.1;

            result = mapper.processStick(0.4, 0);
            expect(result.active).toBe(true); // Now active
        });

        it('filters larger input with higher deadzone', () => {
            // Input 0.8
            let result = mapper.processStick(0.8, 0);
            expect(result.active).toBe(true);

            // Raise deadzone to 0.9
            mapper.DEADZONE = 0.9;

            result = mapper.processStick(0.8, 0);
            expect(result.active).toBe(false);
        });
    });
});

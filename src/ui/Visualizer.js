export class Visualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.leftJoy = this.container.querySelector('#left-joy');
        this.rightJoy = this.container.querySelector('#right-joy');

        // Cache stick points
        this.leftStickPoint = this.leftJoy.querySelector('.stick-point');
        this.rightStickPoint = this.rightJoy.querySelector('.stick-point');

        // Create and Cache segments
        this.leftSegments = this.createRadialSegments(this.leftJoy, 'left');
        this.rightSegments = this.createRadialSegments(this.rightJoy, 'right');
    }

    createRadialSegments(joyElement, side) {
        // 6 sectors at 60° intervals
        const sectors = ['NORTH', 'NORTH_EAST', 'SOUTH_EAST', 'SOUTH', 'SOUTH_WEST', 'NORTH_WEST'];

        // Create a container for the segments (background)
        const segmentContainer = document.createElement('div');
        segmentContainer.className = 'segment-container';

        const segments = [];

        sectors.forEach((sector, index) => {
            const seg = document.createElement('div');
            seg.className = `segment segment-${index}`;
            seg.dataset.sector = sector;

            const label = document.createElement('span');
            label.className = 'segment-label';

            const segmentObj = { el: seg, label: label, sector: sector };

            seg.appendChild(label);
            segmentContainer.appendChild(seg);
            segments.push(segmentObj);
        });

        joyElement.appendChild(segmentContainer);
        return segments;
    }

    update(input, mode, mappings, punctuationLayerIndex = 0) {
        if (!input) return;

        this.updateJoystick(this.leftStickPoint, this.leftSegments, input.sticks.left, mode, mappings, 'left', punctuationLayerIndex);
        this.updateJoystick(this.rightStickPoint, this.rightSegments, input.sticks.right, mode, mappings, 'right', punctuationLayerIndex);
    }

    updateJoystick(stickPoint, segments, stickData, mode, mappings, side, punctuationLayerIndex = 0) {
        // Move the stick point (visual feedback of physical stick)
        const maxDist = 30; // px
        const x = stickData.x * maxDist;
        const y = stickData.y * maxDist;
        stickPoint.style.transform = `translate(${x}px, ${y}px)`;

        // Update Segments
        // Un-highlight all
        for (const seg of segments) {
            seg.el.classList.remove('active');
            seg.label.textContent = '';
        }

        // Highlight active
        if (stickData.active && stickData.sector) {
            const active = segments.find(s => s.sector === stickData.sector);
            if (active) active.el.classList.add('active');
        }

        // Update Labels based on mapping
        let currentMap = null;
        if (mode === 'BASE') {
            currentMap = mappings.BASE?.[side.toUpperCase()];
        } else if (mode === 'LEFT_TRIGGER') {
            currentMap = mappings.LEFT_TRIGGER?.[side.toUpperCase()];
        } else if (mode === 'RIGHT_TRIGGER') {
            if (side === 'right') {
                currentMap = mappings.RIGHT_TRIGGER?.RIGHT;
            } else {
                // Left stick stays on BASE in RIGHT_TRIGGER mode
                currentMap = mappings.BASE?.LEFT;
            }
        } else if (mode === 'PUNCTUATION') {
            const punc = mappings.PUNCTUATION;
            if (Array.isArray(punc)) {
                const idx = punc.length > 0 ? ((punctuationLayerIndex % punc.length) + punc.length) % punc.length : 0;
                currentMap = punc[idx]?.[side.toUpperCase()];
            } else {
                currentMap = punc?.[side.toUpperCase()];
            }
        }

        if (currentMap) {
            for (const seg of segments) {
                const char = currentMap[seg.sector];
                if (char) {
                    seg.label.textContent = char;
                }
            }
        }
    }
}

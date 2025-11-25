export class Interface {
    constructor(particleSystem) {
        this.particleSystem = particleSystem;
        this.container = document.getElementById('ui-container');
        this.init();
    }

    init() {
        this.createPatternSelector();
        this.createColorPicker();
        this.createRotationControl();
        this.createFullscreenToggle();
    }

    createPatternSelector() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-group';

        const title = document.createElement('div');
        title.className = 'ui-label';
        title.textContent = 'Patterns';
        wrapper.appendChild(title);

        const patterns = ['sphere', 'cube', 'heart', 'galaxy'];
        const buttons = document.createElement('div');
        buttons.className = 'button-group';

        patterns.forEach(p => {
            const btn = document.createElement('button');
            btn.textContent = p.charAt(0).toUpperCase() + p.slice(1);
            btn.onclick = () => {
                this.particleSystem.setPattern(p);
                // Update active state
                Array.from(buttons.children).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            if (p === 'sphere') btn.classList.add('active');
            buttons.appendChild(btn);
        });

        // Image Upload
        const uploadBtn = document.createElement('label');
        uploadBtn.className = 'upload-btn';
        uploadBtn.textContent = 'Upload Image';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.particleSystem.setPattern('image', url);
                Array.from(buttons.children).forEach(b => b.classList.remove('active'));
                uploadBtn.classList.add('active');
            }
        };

        uploadBtn.appendChild(fileInput);
        buttons.appendChild(uploadBtn);

        wrapper.appendChild(buttons);
        this.container.appendChild(wrapper);
    }

    createColorPicker() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-group';

        const title = document.createElement('div');
        title.className = 'ui-label';
        title.textContent = 'Color';
        wrapper.appendChild(title);

        const input = document.createElement('input');
        input.type = 'color';
        input.value = '#00ffff';
        input.oninput = (e) => {
            this.particleSystem.setColor(e.target.value);
        };

        wrapper.appendChild(input);
        this.container.appendChild(wrapper);
    }

    createRotationControl() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-group';

        const label = document.createElement('label');
        label.className = 'checkbox-label';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.onchange = (e) => {
            this.particleSystem.toggleAutoRotate(e.target.checked);
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' Auto Rotate'));

        wrapper.appendChild(label);
        this.container.appendChild(wrapper);
    }

    createFullscreenToggle() {
        const btn = document.createElement('button');
        btn.className = 'fullscreen-btn';
        btn.textContent = '⛶';
        btn.onclick = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        };
        this.container.appendChild(btn);
    }
}

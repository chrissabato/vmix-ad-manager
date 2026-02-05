// vMix Ad Manager - Main Application Logic

const App = {
    // State
    videos: [],
    pendingFiles: [],
    selectedDurationSeconds: 0,
    dashboardMode: false,
    autoRefreshInterval: null,
    autoRefreshEnabled: false,
    previewPlaylist: [], // manually built playlist for preview
    previewIdCounter: 0, // counter for unique preview IDs
    draggedItem: null, // currently dragged element
    draggedIndex: null, // index of dragged item
    settings: {
        vmixIp: '',
        vmixPort: '8088',
        vmixInput: '',
        folderPath: '',
        useProxy: true
    },

    // DOM Elements
    elements: {},

    // Initialize the application
    init() {
        this.cacheElements();
        this.loadSettings();
        this.loadVideos();
        this.loadDashboardMode();
        this.bindEvents();
        this.updateVideoCount();
        this.updateConnectionStatus();
        this.updateLibraryCount();
        this.renderVideoList();
        this.renderAvailableAds();
        this.log('Application initialized.');

        // Enable auto-refresh by default
        this.toggleAutoRefresh();
    },

    // Cache DOM elements for performance
    cacheElements() {
        this.elements = {
            // Settings
            vmixIp: document.getElementById('vmixIp'),
            vmixPort: document.getElementById('vmixPort'),
            vmixInput: document.getElementById('vmixInput'),
            folderPath: document.getElementById('folderPath'),
            saveSettings: document.getElementById('saveSettings'),
            settingsSaved: document.getElementById('settingsSaved'),
            toggleSettings: document.getElementById('toggleSettings'),
            settingsContent: document.getElementById('settingsContent'),
            useProxy: document.getElementById('useProxy'),

            // Video adding
            fileBrowser: document.getElementById('fileBrowser'),
            fileBrowserPriority: document.getElementById('fileBrowserPriority'),
            addSelectedFiles: document.getElementById('addSelectedFiles'),
            filePreview: document.getElementById('filePreview'),
            videoFilename: document.getElementById('videoFilename'),
            videoPriority: document.getElementById('videoPriority'),
            addVideo: document.getElementById('addVideo'),
            bulkVideos: document.getElementById('bulkVideos'),
            bulkAddVideos: document.getElementById('bulkAddVideos'),

            // Video list
            videoList: document.getElementById('videoList'),
            videoCount: document.getElementById('videoCount'),
            clearAllVideos: document.getElementById('clearAllVideos'),

            // Dashboard
            toggleDashboardMode: document.getElementById('toggleDashboardMode'),
            configSections: document.getElementById('configSections'),
            dashboardSection: document.getElementById('dashboardSection'),
            connectionIndicator: document.getElementById('connectionIndicator'),
            connectionStatus: document.getElementById('connectionStatus'),
            libraryCount: document.getElementById('libraryCount'),
            durationBtns: document.querySelectorAll('.duration-btn'),
            selectedDuration: document.getElementById('selectedDuration'),
            selectedDurationText: document.getElementById('selectedDurationText'),
            selectedAdCount: document.getElementById('selectedAdCount'),
            sendToVmix: document.getElementById('sendToVmix'),
            appendToVmix: document.getElementById('appendToVmix'),
            playlistPreview: document.getElementById('playlistPreview'),
            previewList: document.getElementById('previewList'),
            clearPreview: document.getElementById('clearPreview'),
            previewSummary: document.getElementById('previewSummary'),
            previewCount: document.getElementById('previewCount'),
            previewDuration: document.getElementById('previewDuration'),
            availableAdsList: document.getElementById('availableAdsList'),
            refreshVmixPlaylist: document.getElementById('refreshVmixPlaylist'),
            autoRefreshToggle: document.getElementById('autoRefreshToggle'),
            clearVmixPlaylist: document.getElementById('clearVmixPlaylist'),
            vmixPlaylistContent: document.getElementById('vmixPlaylistContent'),
            playbackIndicator: document.getElementById('playbackIndicator'),
            playbackText: document.getElementById('playbackText'),
            programIndicator: document.getElementById('programIndicator'),
            programText: document.getElementById('programText'),

            // Status log
            statusLog: document.getElementById('statusLog'),
            clearLog: document.getElementById('clearLog')
        };
    },

    // Bind event listeners
    bindEvents() {
        // Settings
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
        this.elements.toggleSettings.addEventListener('click', () => this.toggleSettings());

        // Video adding
        this.elements.fileBrowser.addEventListener('change', (e) => this.previewSelectedFiles(e));
        this.elements.addSelectedFiles.addEventListener('click', () => this.addSelectedFiles());
        this.elements.addVideo.addEventListener('click', () => this.addVideo());
        this.elements.videoFilename.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addVideo();
        });
        this.elements.bulkAddVideos.addEventListener('click', () => this.bulkAddVideos());

        // Video list
        this.elements.clearAllVideos.addEventListener('click', () => this.clearAllVideos());

        // Dashboard
        this.elements.toggleDashboardMode.addEventListener('click', () => this.toggleDashboardMode());
        this.elements.durationBtns.forEach(btn => {
            btn.addEventListener('click', () => this.selectDuration(parseInt(btn.dataset.duration)));
        });
        this.elements.sendToVmix.addEventListener('click', () => this.sendPreviewToVmix(true));
        this.elements.appendToVmix.addEventListener('click', () => this.sendPreviewToVmix(false));
        this.elements.clearPreview.addEventListener('click', () => this.clearPreviewPlaylist());
        this.elements.refreshVmixPlaylist.addEventListener('click', () => this.refreshVmixPlaylist());
        this.elements.autoRefreshToggle.addEventListener('click', () => this.toggleAutoRefresh());
        this.elements.clearVmixPlaylist.addEventListener('click', () => this.clearVmixPlaylist());

        // Status log
        this.elements.clearLog.addEventListener('click', () => this.clearLog());
    },

    // Settings management
    loadSettings() {
        const saved = localStorage.getItem('vmixAdManager_settings');
        if (saved) {
            this.settings = JSON.parse(saved);
            this.elements.vmixIp.value = this.settings.vmixIp;
            this.elements.vmixPort.value = this.settings.vmixPort;
            this.elements.vmixInput.value = this.settings.vmixInput;
            this.elements.folderPath.value = this.settings.folderPath;
            this.elements.useProxy.checked = this.settings.useProxy !== false;
        }
    },

    saveSettings() {
        this.settings = {
            vmixIp: this.elements.vmixIp.value.trim(),
            vmixPort: this.elements.vmixPort.value.trim() || '8088',
            vmixInput: this.elements.vmixInput.value.trim(),
            folderPath: this.normalizePath(this.elements.folderPath.value.trim()),
            useProxy: this.elements.useProxy.checked
        };
        localStorage.setItem('vmixAdManager_settings', JSON.stringify(this.settings));

        this.elements.settingsSaved.classList.remove('hidden');
        setTimeout(() => {
            this.elements.settingsSaved.classList.add('hidden');
        }, 2000);

        this.updateConnectionStatus();
        this.log('Settings saved.');
    },

    toggleSettings() {
        const content = this.elements.settingsContent;
        const btn = this.elements.toggleSettings;
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            btn.textContent = '[collapse]';
        } else {
            content.classList.add('hidden');
            btn.textContent = '[expand]';
        }
    },

    // Dashboard mode
    loadDashboardMode() {
        const saved = localStorage.getItem('vmixAdManager_dashboardMode');
        if (saved === 'true') {
            this.dashboardMode = true;
            this.applyDashboardMode();
        }
    },

    toggleDashboardMode() {
        this.dashboardMode = !this.dashboardMode;
        localStorage.setItem('vmixAdManager_dashboardMode', this.dashboardMode);
        this.applyDashboardMode();
    },

    applyDashboardMode() {
        if (this.dashboardMode) {
            this.elements.configSections.classList.add('hidden');
            this.elements.toggleDashboardMode.textContent = 'Show Config';
            this.elements.toggleDashboardMode.classList.remove('bg-purple-600', 'hover:bg-purple-700');
            this.elements.toggleDashboardMode.classList.add('bg-gray-600', 'hover:bg-gray-700');
        } else {
            this.elements.configSections.classList.remove('hidden');
            this.elements.toggleDashboardMode.textContent = 'Dashboard Mode';
            this.elements.toggleDashboardMode.classList.remove('bg-gray-600', 'hover:bg-gray-700');
            this.elements.toggleDashboardMode.classList.add('bg-purple-600', 'hover:bg-purple-700');
        }
    },

    updateConnectionStatus() {
        const configured = this.settings.vmixIp && this.settings.vmixInput && this.settings.folderPath;
        if (configured) {
            this.elements.connectionIndicator.classList.remove('bg-gray-500', 'bg-red-500');
            this.elements.connectionIndicator.classList.add('bg-green-500');
            this.elements.connectionStatus.textContent = `${this.settings.vmixIp}:${this.settings.vmixPort} → ${this.settings.vmixInput}`;
        } else {
            this.elements.connectionIndicator.classList.remove('bg-green-500', 'bg-red-500');
            this.elements.connectionIndicator.classList.add('bg-gray-500');
            this.elements.connectionStatus.textContent = 'Not configured';
        }
    },

    updateLibraryCount() {
        this.elements.libraryCount.textContent = this.videos.length;
    },

    selectDuration(seconds) {
        this.selectedDurationSeconds = seconds;

        // Update button states
        this.elements.durationBtns.forEach(btn => {
            if (parseInt(btn.dataset.duration) === seconds) {
                btn.classList.remove('bg-gray-700');
                btn.classList.add('bg-blue-600');
            } else {
                btn.classList.remove('bg-blue-600');
                btn.classList.add('bg-gray-700');
            }
        });

        // Show selected duration
        this.showSelectedDuration(seconds);

        // Generate preview
        this.generatePreview();
    },

    showSelectedDuration(seconds) {
        const adCount = Math.floor(seconds / 30);
        let displayText;

        if (seconds < 60) {
            displayText = `${seconds} seconds`;
        } else if (seconds < 120) {
            displayText = '1 minute';
        } else {
            displayText = `${Math.floor(seconds / 60)} minutes`;
        }

        this.elements.selectedDurationText.textContent = displayText;
        this.elements.selectedAdCount.textContent = `(${adCount} ad${adCount !== 1 ? 's' : ''})`;
        this.elements.selectedDuration.classList.remove('hidden');
    },

    generatePreview() {
        if (this.videos.length === 0) {
            this.previewPlaylist = [];
            this.renderPreviewPlaylist();
            return;
        }

        if (this.selectedDurationSeconds === 0) {
            return;
        }

        const count = Math.floor(this.selectedDurationSeconds / 30);
        const selected = this.generateWeightedSelection(count);
        // Assign unique previewIds to each item
        this.previewPlaylist = selected.map(video => {
            this.previewIdCounter++;
            return {...video, previewId: this.previewIdCounter};
        });
        this.renderPreviewPlaylist();
    },

    renderAvailableAds() {
        if (this.videos.length === 0) {
            this.elements.availableAdsList.innerHTML = '<p class="text-gray-500 italic text-center text-sm">No ads in library</p>';
            return;
        }

        // Sort by priority (high to low), then alphabetically
        const sorted = [...this.videos].sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.filename.localeCompare(b.filename);
        });

        this.elements.availableAdsList.innerHTML = sorted.map(video => `
            <div class="flex items-center justify-between text-sm py-1 px-2 bg-gray-800 rounded mb-1 hover:bg-gray-700">
                <span class="text-gray-300 truncate flex-1 mr-2">${this.escapeHtml(video.filename.replace('.mp4', ''))}</span>
                <button onclick="App.addToPreview(${video.id})"
                    class="text-green-400 hover:text-green-300 font-bold px-2">+</button>
            </div>
        `).join('');
    },

    addToPreview(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (video) {
            this.previewIdCounter++;
            this.previewPlaylist.push({...video, previewId: this.previewIdCounter});
            this.renderPreviewPlaylist();
        }
    },

    removeFromPreview(previewId) {
        this.previewPlaylist = this.previewPlaylist.filter(v => v.previewId !== previewId);
        this.renderPreviewPlaylist();
    },

    clearPreviewPlaylist() {
        this.previewPlaylist = [];
        this.selectedDurationSeconds = 0;
        this.elements.durationBtns.forEach(btn => {
            btn.classList.remove('bg-blue-600');
            btn.classList.add('bg-gray-700');
        });
        this.elements.selectedDuration.classList.add('hidden');
        this.renderPreviewPlaylist();
    },

    renderPreviewPlaylist() {
        if (this.previewPlaylist.length === 0) {
            this.elements.previewList.innerHTML = '<p class="text-gray-500 italic text-center text-sm">Select duration or add ads manually</p>';
            this.elements.previewSummary.classList.add('hidden');
            return;
        }

        this.elements.previewList.innerHTML = this.previewPlaylist.map((video, index) => `
            <div class="preview-item flex items-center justify-between text-sm py-1 px-2 bg-gray-800 rounded mb-1 cursor-move"
                 draggable="true"
                 data-preview-id="${video.previewId}"
                 data-index="${index}">
                <span class="text-gray-300 flex items-center">
                    <span class="text-gray-600 mr-2">☰</span>
                    <span class="text-gray-500">${index + 1}.</span> ${this.escapeHtml(video.filename.replace('.mp4', ''))}
                </span>
                <button onclick="App.removeFromPreview(${video.previewId}); event.stopPropagation();"
                    class="text-red-400 hover:text-red-300 text-xs">✕</button>
            </div>
        `).join('');

        // Add drag and drop event listeners
        this.initPreviewDragDrop();

        // Update summary
        const count = this.previewPlaylist.length;
        const duration = count * 30;
        this.elements.previewCount.textContent = `${count} ad${count !== 1 ? 's' : ''}`;
        this.elements.previewDuration.textContent = `${duration} sec`;
        this.elements.previewSummary.classList.remove('hidden');
    },

    initPreviewDragDrop() {
        const items = this.elements.previewList.querySelectorAll('.preview-item');

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
            item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            item.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    },

    handleDragStart(e) {
        this.draggedItem = e.target;
        this.draggedIndex = parseInt(e.target.dataset.index);
        e.target.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    },

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    handleDragEnter(e) {
        e.preventDefault();
        const item = e.target.closest('.preview-item');
        if (item && item !== this.draggedItem) {
            item.classList.add('bg-blue-900');
        }
    },

    handleDragLeave(e) {
        const item = e.target.closest('.preview-item');
        if (item) {
            item.classList.remove('bg-blue-900');
        }
    },

    handleDrop(e) {
        e.preventDefault();
        const dropTarget = e.target.closest('.preview-item');
        if (!dropTarget || dropTarget === this.draggedItem) return;

        const dropIndex = parseInt(dropTarget.dataset.index);

        // Reorder the array
        const [movedItem] = this.previewPlaylist.splice(this.draggedIndex, 1);
        this.previewPlaylist.splice(dropIndex, 0, movedItem);

        // Re-render
        this.renderPreviewPlaylist();
    },

    handleDragEnd(e) {
        e.target.style.opacity = '1';
        const items = this.elements.previewList.querySelectorAll('.preview-item');
        items.forEach(item => item.classList.remove('bg-blue-900'));
        this.draggedItem = null;
        this.draggedIndex = null;
    },

    async sendPreviewToVmix(replaceExisting = true) {
        if (this.previewPlaylist.length === 0) {
            this.log('Error: No ads in preview playlist.', 'error');
            return;
        }

        // Validate settings
        if (!this.settings.vmixIp) {
            this.log('Error: vMix IP address not configured.', 'error');
            return;
        }
        if (!this.settings.vmixInput) {
            this.log('Error: vMix input name not configured.', 'error');
            return;
        }
        if (!this.settings.folderPath) {
            this.log('Error: Video folder path not configured.', 'error');
            return;
        }

        const action = replaceExisting ? 'Replacing playlist with' : 'Appending';
        this.log(`${action} ${this.previewPlaylist.length} ads to vMix...`);

        // Clear existing playlist first if replacing
        if (replaceExisting) {
            await this.clearVmixPlaylistSilent();
        }
        await this.sendToVmix(this.previewPlaylist);
    },

    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;

        if (this.autoRefreshEnabled) {
            this.elements.autoRefreshToggle.textContent = 'Auto ●';
            this.elements.autoRefreshToggle.classList.remove('text-gray-400');
            this.elements.autoRefreshToggle.classList.add('text-green-400');

            // Start polling every 2 seconds
            this.refreshVmixPlaylist(true); // silent refresh
            this.autoRefreshInterval = setInterval(() => {
                this.refreshVmixPlaylist(true); // silent refresh
            }, 2000);

            this.log('Auto-refresh enabled (2s interval)');
        } else {
            this.elements.autoRefreshToggle.textContent = 'Auto';
            this.elements.autoRefreshToggle.classList.remove('text-green-400');
            this.elements.autoRefreshToggle.classList.add('text-gray-400');

            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
                this.autoRefreshInterval = null;
            }

            this.log('Auto-refresh disabled');
        }
    },

    async refreshVmixPlaylist(silent = false) {
        if (!this.settings.vmixIp || !this.settings.vmixInput) {
            this.elements.vmixPlaylistContent.innerHTML = '<p class="text-red-400 text-sm text-center">Configure vMix settings first</p>';
            return;
        }

        if (!silent) {
            this.elements.vmixPlaylistContent.innerHTML = '<p class="text-gray-400 text-sm text-center">Loading...</p>';
            this.log('Fetching vMix state...');
        }

        try {
            // Fetch the full vMix XML state
            const params = new URLSearchParams({
                ip: this.settings.vmixIp,
                port: this.settings.vmixPort
            });

            const url = `api.php?${params.toString()}&getState=1`;
            if (!silent) this.log(`API URL: ${url}`);

            const response = await fetch(url);
            if (!silent) this.log(`Fetch status: ${response.status}`);

            const text = await response.text();
            if (!silent) this.log(`Response length: ${text.length} chars`);

            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                this.log(`JSON parse error. Raw response: ${text.substring(0, 200)}`, 'error');
                throw new Error('Invalid JSON response from server');
            }

            if (!silent) this.log(`vMix HTTP Code: ${data.httpCode || 'unknown'}`);

            if (data.success && data.response) {
                if (!silent) this.log(`vMix response length: ${data.response.length} chars`);

                if (data.response.includes('<vmix>')) {
                    this.parseAndDisplayVmixPlaylist(data.response, silent);
                } else {
                    if (!silent) this.log(`Unexpected response: ${data.response.substring(0, 300)}`, 'warning');
                    throw new Error('Invalid vMix response - is Web Controller enabled?');
                }
            } else {
                throw new Error(data.error || 'Failed to get vMix state');
            }
        } catch (error) {
            if (!silent) {
                this.elements.vmixPlaylistContent.innerHTML = `<p class="text-red-400 text-sm text-center">${this.escapeHtml(error.message)}</p>`;
                this.log(`Error: ${error.message}`, 'error');
            }
        }
    },

    parseAndDisplayVmixPlaylist(xmlString, silent = false) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

            // Find the input that matches our playlist name
            const inputs = xmlDoc.querySelectorAll('input');
            let playlistInput = null;

            // Log available inputs for debugging
            const availableInputs = [];
            inputs.forEach((input, index) => {
                const title = input.getAttribute('title') || '';
                const key = input.getAttribute('key') || '';
                const number = input.getAttribute('number') || '';
                const type = input.getAttribute('type') || '';
                availableInputs.push(`${number}: ${title} (${type})`);

                // Match by title, key, or number
                const searchTerm = this.settings.vmixInput.toLowerCase();
                if (title.toLowerCase() === searchTerm ||
                    key === this.settings.vmixInput ||
                    number === this.settings.vmixInput ||
                    title.toLowerCase().includes(searchTerm)) {
                    playlistInput = input;
                }
            });

            if (!playlistInput) {
                if (!silent) {
                    this.log(`Available inputs: ${availableInputs.join(', ')}`, 'warning');
                    this.elements.vmixPlaylistContent.innerHTML = `<p class="text-yellow-400 text-sm text-center">Input "${this.escapeHtml(this.settings.vmixInput)}" not found. Check Status Log for available inputs.</p>`;
                }
                return;
            }

            if (!silent) this.log(`Found input: ${playlistInput.getAttribute('title')} (#${playlistInput.getAttribute('number')})`);

            // Get playback state
            const state = playlistInput.getAttribute('state') || 'Unknown';
            this.updatePlaybackIndicator(state);

            // Check if input is in Program (active)
            const inputNumber = playlistInput.getAttribute('number');
            const activeInput = xmlDoc.querySelector('active');
            const isInProgram = activeInput && activeInput.textContent === inputNumber;
            this.updateProgramIndicator(isInProgram);

            // Get list items from the playlist input
            const listElement = playlistInput.querySelector('list');
            const items = playlistInput.querySelectorAll('list item');

            // Get the selected index from the input element (1-based in vMix)
            const selectedIndexAttr = playlistInput.getAttribute('selectedIndex');
            const selectedIndex = selectedIndexAttr ? parseInt(selectedIndexAttr) : -1;

            if (!silent) this.log(`Selected index: ${selectedIndex}, State: ${state}, In Program: ${isInProgram}`);

            if (items.length === 0) {
                this.elements.vmixPlaylistContent.innerHTML = '<p class="text-gray-500 italic text-center text-sm">Playlist is empty</p>';
                return;
            }

            let html = '';
            const totalItems = items.length;
            items.forEach((item, index) => {
                const fullPath = item.textContent || '';
                const filename = fullPath.split('\\').pop().split('/').pop();
                const displayName = filename.replace(/\.mp4$/i, '');

                // Check for selected="true" attribute on item, or match by selectedIndex (1-based)
                const itemSelected = item.getAttribute('selected') === 'true';
                const indexMatch = selectedIndex > 0 && (index + 1) === selectedIndex;
                const isSelected = itemSelected || indexMatch;

                // Only show "End Here" if there are items after this one
                const showEndHere = index < totalItems - 1;

                html += `
                    <div class="text-sm py-1 px-2 rounded mb-1 ${isSelected ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-300'} flex justify-between items-center">
                        <span>
                            ${isSelected ? '<span class="mr-1">→</span>' : `<span class="text-gray-500 mr-1">${index + 1}.</span>`}
                            ${this.escapeHtml(displayName)}
                        </span>
                        ${showEndHere ? `<button onclick="App.endPlaylistHere(${index + 1}, ${totalItems})" class="text-yellow-400 hover:text-yellow-300 text-xs ml-2" title="End playlist here">↓</button>` : ''}
                    </div>
                `;
            });

            this.elements.vmixPlaylistContent.innerHTML = html;
            if (!silent) this.log(`Loaded ${items.length} items from vMix playlist.`);
        } catch (error) {
            this.elements.vmixPlaylistContent.innerHTML = '<p class="text-yellow-400 text-sm text-center">Could not parse playlist</p>';
            if (!silent) this.log(`Parse error: ${error.message}`, 'error');
        }
    },

    updatePlaybackIndicator(state) {
        const indicator = this.elements.playbackIndicator;
        const text = this.elements.playbackText;

        // Remove all state classes
        indicator.classList.remove('bg-gray-600', 'bg-green-500', 'bg-yellow-500', 'bg-red-500');
        text.classList.remove('text-gray-500', 'text-green-400', 'text-yellow-400', 'text-red-400');

        switch (state.toLowerCase()) {
            case 'running':
                indicator.classList.add('bg-green-500');
                text.classList.add('text-green-400');
                text.textContent = 'Playing';
                break;
            case 'paused':
                indicator.classList.add('bg-yellow-500');
                text.classList.add('text-yellow-400');
                text.textContent = 'Paused';
                break;
            default:
                indicator.classList.add('bg-gray-600');
                text.classList.add('text-gray-500');
                text.textContent = state;
        }
    },

    updateProgramIndicator(isInProgram) {
        const indicator = this.elements.programIndicator;
        const text = this.elements.programText;

        indicator.classList.remove('bg-gray-600', 'bg-red-600');
        text.classList.remove('text-gray-500', 'text-red-400');

        if (isInProgram) {
            indicator.classList.add('bg-red-600');
            text.classList.add('text-red-400');
            text.textContent = 'LIVE';
        } else {
            indicator.classList.add('bg-gray-600');
            text.classList.add('text-gray-500');
            text.textContent = 'Off Air';
        }
    },

    async endPlaylistHere(keepIndex, totalItems) {
        // Remove all items after keepIndex (1-based)
        // We need to remove from the end backwards to avoid index shifting
        const itemsToRemove = totalItems - keepIndex;

        if (itemsToRemove <= 0) return;

        this.log(`Removing ${itemsToRemove} items after position ${keepIndex}...`);

        try {
            // Remove items from the end, one at a time
            for (let i = totalItems; i > keepIndex; i--) {
                const params = new URLSearchParams({
                    ip: this.settings.vmixIp,
                    port: this.settings.vmixPort,
                    function: 'ListRemove',
                    input: this.settings.vmixInput,
                    value: i.toString()
                });

                await fetch(`api.php?${params.toString()}`);
                await this.sleep(50);
            }

            this.log(`Removed ${itemsToRemove} items. Playlist now ends at position ${keepIndex}.`, 'success');
            this.refreshVmixPlaylist(true);
        } catch (error) {
            this.log(`Error removing items: ${error.message}`, 'error');
        }
    },

    async clearVmixPlaylist() {
        if (!this.settings.vmixIp || !this.settings.vmixInput) {
            this.log('Error: Configure vMix settings first.', 'error');
            return;
        }

        if (!confirm('Clear all items from the vMix playlist?')) {
            return;
        }

        this.log('Clearing vMix playlist...');

        try {
            const params = new URLSearchParams({
                ip: this.settings.vmixIp,
                port: this.settings.vmixPort,
                function: 'SelectAll',
                input: this.settings.vmixInput
            });

            await fetch(`api.php?${params.toString()}`);

            const deleteParams = new URLSearchParams({
                ip: this.settings.vmixIp,
                port: this.settings.vmixPort,
                function: 'ListRemoveAll',
                input: this.settings.vmixInput
            });

            const response = await fetch(`api.php?${deleteParams.toString()}`);
            const data = await response.json();

            if (data.success) {
                this.elements.vmixPlaylistContent.innerHTML = '<p class="text-gray-500 italic text-center text-sm">Playlist is empty</p>';
                this.log('vMix playlist cleared.', 'success');
            } else {
                throw new Error(data.error || 'Failed to clear playlist');
            }
        } catch (error) {
            this.log(`Error clearing playlist: ${error.message}`, 'error');
        }
    },

    // Normalize folder path (ensure trailing backslash)
    normalizePath(path) {
        if (!path) return '';
        path = path.trim();
        if (path && !path.endsWith('\\') && !path.endsWith('/')) {
            path += '\\';
        }
        return path;
    },

    // Video management
    previewSelectedFiles(event) {
        const files = event.target.files;
        if (!files || files.length === 0) {
            this.pendingFiles = [];
            this.elements.addSelectedFiles.disabled = true;
            this.elements.filePreview.classList.add('hidden');
            return;
        }

        this.pendingFiles = Array.from(files);

        // Show preview of selected files
        const fileNames = this.pendingFiles.map(f => f.name).join(', ');
        this.elements.filePreview.classList.remove('hidden');
        this.elements.filePreview.innerHTML = `<strong>${this.pendingFiles.length} file(s) selected:</strong> ${this.escapeHtml(fileNames)}`;

        // Enable the add button
        this.elements.addSelectedFiles.disabled = false;
    },

    addSelectedFiles() {
        if (this.pendingFiles.length === 0) return;

        const priority = parseInt(this.elements.fileBrowserPriority.value);
        let added = 0;
        let skipped = 0;

        for (const file of this.pendingFiles) {
            const filename = file.name;

            // Check for duplicates
            if (this.videos.some(v => v.filename.toLowerCase() === filename.toLowerCase())) {
                skipped++;
                continue;
            }

            this.videos.push({
                id: Date.now() + Math.random(),
                filename: filename,
                priority: priority
            });
            added++;
        }

        this.saveVideos();

        // Update preview to show result
        this.elements.filePreview.innerHTML = `<span class="text-green-400">${added} file(s) added</span>` +
            (skipped > 0 ? `, <span class="text-yellow-400">${skipped} skipped (duplicates)</span>` : '');

        // Clear state
        this.pendingFiles = [];
        this.elements.fileBrowser.value = '';
        this.elements.addSelectedFiles.disabled = true;

        this.log(`File browser: ${added} added, ${skipped} skipped (Priority: ${this.getPriorityLabel(priority)})`);
    },

    loadVideos() {
        const saved = localStorage.getItem('vmixAdManager_videos');
        if (saved) {
            this.videos = JSON.parse(saved);
        }
    },

    saveVideos() {
        localStorage.setItem('vmixAdManager_videos', JSON.stringify(this.videos));
        this.updateVideoCount();
        this.updateLibraryCount();
        this.renderVideoList();
        this.renderAvailableAds();
    },

    addVideo() {
        let filename = this.elements.videoFilename.value.trim();
        if (!filename) {
            this.log('Error: Please enter a filename.', 'error');
            return;
        }

        // Ensure .mp4 extension
        if (!filename.toLowerCase().endsWith('.mp4')) {
            filename += '.mp4';
        }

        // Check for duplicates
        if (this.videos.some(v => v.filename.toLowerCase() === filename.toLowerCase())) {
            this.log(`Error: "${filename}" already exists in the library.`, 'error');
            return;
        }

        const priority = parseInt(this.elements.videoPriority.value);
        this.videos.push({
            id: Date.now(),
            filename: filename,
            priority: priority
        });

        this.saveVideos();
        this.elements.videoFilename.value = '';
        this.log(`Added video: ${filename} (Priority: ${this.getPriorityLabel(priority)})`);
    },

    bulkAddVideos() {
        const text = this.elements.bulkVideos.value.trim();
        if (!text) {
            this.log('Error: Please enter filenames.', 'error');
            return;
        }

        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        let added = 0;
        let skipped = 0;

        lines.forEach(filename => {
            if (!filename.toLowerCase().endsWith('.mp4')) {
                filename += '.mp4';
            }

            if (this.videos.some(v => v.filename.toLowerCase() === filename.toLowerCase())) {
                skipped++;
                return;
            }

            this.videos.push({
                id: Date.now() + Math.random(),
                filename: filename,
                priority: 2 // Medium priority for bulk add
            });
            added++;
        });

        this.saveVideos();
        this.elements.bulkVideos.value = '';
        this.log(`Bulk add complete: ${added} added, ${skipped} skipped (duplicates)`);
    },

    removeVideo(id) {
        const video = this.videos.find(v => v.id === id);
        if (video) {
            this.videos = this.videos.filter(v => v.id !== id);
            this.saveVideos();
            this.log(`Removed video: ${video.filename}`);
        }
    },

    updateVideoPriority(id, priority) {
        const video = this.videos.find(v => v.id === id);
        if (video) {
            video.priority = parseInt(priority);
            this.saveVideos();
            this.log(`Updated priority for ${video.filename}: ${this.getPriorityLabel(video.priority)}`);
        }
    },

    clearAllVideos() {
        if (confirm('Are you sure you want to remove all videos from the library?')) {
            this.videos = [];
            this.saveVideos();
            this.log('Cleared all videos from library.');
        }
    },

    updateVideoCount() {
        const count = this.videos.length;
        this.elements.videoCount.textContent = `${count} video${count !== 1 ? 's' : ''}`;
    },

    getPriorityLabel(priority) {
        const labels = { 1: 'Low', 2: 'Medium', 3: 'High' };
        return labels[priority] || 'Medium';
    },

    getPriorityColor(priority) {
        const colors = {
            1: 'text-gray-400',
            2: 'text-yellow-400',
            3: 'text-green-400'
        };
        return colors[priority] || 'text-yellow-400';
    },

    renderVideoList() {
        if (this.videos.length === 0) {
            this.elements.videoList.innerHTML = '<p class="text-gray-500 italic">No videos added yet.</p>';
            return;
        }

        // Sort by priority (high to low), then alphabetically
        const sorted = [...this.videos].sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return a.filename.localeCompare(b.filename);
        });

        this.elements.videoList.innerHTML = sorted.map(video => `
            <div class="flex items-center justify-between bg-gray-700 rounded px-4 py-2 hover:bg-gray-600 transition-colors">
                <div class="flex items-center gap-4 flex-1 min-w-0">
                    <span class="truncate">${this.escapeHtml(video.filename)}</span>
                </div>
                <div class="flex items-center gap-3 ml-4">
                    <select onchange="App.updateVideoPriority(${video.id}, this.value)"
                        class="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm ${this.getPriorityColor(video.priority)} focus:outline-none">
                        <option value="1" ${video.priority === 1 ? 'selected' : ''}>Low</option>
                        <option value="2" ${video.priority === 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${video.priority === 3 ? 'selected' : ''}>High</option>
                    </select>
                    <button onclick="App.removeVideo(${video.id})"
                        class="text-red-400 hover:text-red-300 text-sm">Remove</button>
                </div>
            </div>
        `).join('');
    },

    // Playlist generation
    getAdBaseName(filename) {
        // Remove extension and version suffix (-1, -2, etc.) to get base name
        // Examples: "Ad-1.mp4" -> "Ad", "Commercial-2.mp4" -> "Commercial", "Promo.mp4" -> "Promo"
        const withoutExt = filename.replace(/\.mp4$/i, '');
        // Remove trailing -1, -2, _1, _2, etc.
        return withoutExt.replace(/[-_]\d+$/, '').toLowerCase();
    },

    isSameAdGroup(video1, video2) {
        if (!video1 || !video2) return false;
        // Same exact file
        if (video1.filename.toLowerCase() === video2.filename.toLowerCase()) return true;
        // Same ad group (e.g., Ad-1 and Ad-2)
        return this.getAdBaseName(video1.filename) === this.getAdBaseName(video2.filename);
    },

    generateWeightedSelection(count) {
        if (this.videos.length === 0) {
            return [];
        }

        // Build weighted pool with video references
        const pool = [];
        this.videos.forEach(video => {
            // Priority 1 = 1x, Priority 2 = 2x, Priority 3 = 3x
            for (let i = 0; i < video.priority; i++) {
                pool.push(video);
            }
        });

        // Get unique ad groups to check if we can avoid back-to-back
        const uniqueGroups = new Set(this.videos.map(v => this.getAdBaseName(v.filename)));
        const canAvoidBackToBack = uniqueGroups.size > 1;

        // Select random videos from weighted pool, avoiding back-to-back same ads
        const selected = [];
        const maxAttempts = 100;

        for (let i = 0; i < count; i++) {
            let candidate = null;
            let lastSelected = selected.length > 0 ? selected[selected.length - 1] : null;

            if (!canAvoidBackToBack || !lastSelected) {
                // Just pick randomly if we can't avoid back-to-back or it's the first selection
                const randomIndex = Math.floor(Math.random() * pool.length);
                candidate = pool[randomIndex];
            } else {
                // Filter pool to exclude same ad group as last selected
                const filteredPool = pool.filter(v => !this.isSameAdGroup(v, lastSelected));

                if (filteredPool.length > 0) {
                    const randomIndex = Math.floor(Math.random() * filteredPool.length);
                    candidate = filteredPool[randomIndex];
                } else {
                    // Fallback: no valid options, just pick randomly
                    const randomIndex = Math.floor(Math.random() * pool.length);
                    candidate = pool[randomIndex];
                }
            }

            selected.push(candidate);
        }

        return selected;
    },

    async clearVmixPlaylistSilent() {
        try {
            const params = new URLSearchParams({
                ip: this.settings.vmixIp,
                port: this.settings.vmixPort,
                function: 'ListRemoveAll',
                input: this.settings.vmixInput
            });

            await fetch(`api.php?${params.toString()}`);
            this.log('Cleared existing playlist.');
        } catch (error) {
            this.log(`Warning: Could not clear playlist: ${error.message}`, 'warning');
        }
    },

    async sendToVmix(videos) {
        this.log(`Sending ${videos.length} videos to vMix playlist "${this.settings.vmixInput}"...`);

        let successCount = 0;
        let errorCount = 0;

        for (const video of videos) {
            const fullPath = this.settings.folderPath + video.filename;

            try {
                let response;

                if (this.settings.useProxy) {
                    // Use PHP proxy to avoid CORS issues
                    // Use ListAdd for List inputs in vMix
                    const params = new URLSearchParams({
                        ip: this.settings.vmixIp,
                        port: this.settings.vmixPort,
                        function: 'ListAdd',
                        input: this.settings.vmixInput,
                        value: fullPath
                    });

                    response = await fetch(`api.php?${params.toString()}`);
                    const data = await response.json();

                    if (data.success) {
                        // Check vMix response for errors
                        const vmixResponse = data.response || '';
                        this.log(`vMix response: ${vmixResponse.substring(0, 100)}`);

                        if (vmixResponse.includes('Error') || vmixResponse.includes('error')) {
                            this.log(`vMix error: ${vmixResponse}`, 'error');
                            errorCount++;
                        } else {
                            successCount++;
                            this.log(`Added: ${video.filename}`);
                        }
                    } else {
                        throw new Error(data.error || 'Unknown error');
                    }
                } else {
                    // Direct API call (may have CORS issues)
                    const baseUrl = `http://${this.settings.vmixIp}:${this.settings.vmixPort}/api/`;
                    const params = new URLSearchParams({
                        Function: 'PlayListAdd',
                        Input: this.settings.vmixInput,
                        Value: fullPath
                    });

                    response = await fetch(`${baseUrl}?${params.toString()}`, {
                        method: 'GET',
                        mode: 'no-cors'
                    });

                    // With no-cors mode, we can't read the response, but the request is sent
                    successCount++;
                    this.log(`Added: ${video.filename}`);
                }
            } catch (error) {
                errorCount++;
                this.log(`Failed to add: ${video.filename}`, 'error');
                this.log(`Error: ${error.message}`, 'error');
                // Stop on first error to avoid spamming
                if (errorCount >= 3) {
                    this.log('Too many errors, stopping...', 'error');
                    break;
                }
            }

            // Small delay between requests to avoid overwhelming vMix
            await this.sleep(100);
        }

        if (errorCount === 0) {
            this.log(`Successfully sent ${successCount} videos to vMix playlist.`, 'success');
        } else {
            this.log(`Completed with ${successCount} successes and ${errorCount} errors.`, 'warning');
        }
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Logging
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: 'text-gray-300',
            success: 'text-green-400',
            warning: 'text-yellow-400',
            error: 'text-red-400'
        };
        const color = colors[type] || colors.info;

        const entry = document.createElement('p');
        entry.className = color;
        entry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> ${this.escapeHtml(message)}`;

        this.elements.statusLog.appendChild(entry);
        this.elements.statusLog.scrollTop = this.elements.statusLog.scrollHeight;
    },

    clearLog() {
        this.elements.statusLog.innerHTML = '<p class="text-gray-500">Log cleared.</p>';
    },

    // Utility
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

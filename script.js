document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Storage handler to ensure data persistence
    const StorageHandler = {
        set: function(key, value) {
            try {
                const serialized = JSON.stringify(value);
                localStorage.setItem(key, serialized);
                console.log(`Data saved to key "${key}"`);
                return true;
            } catch (error) {
                console.error('Error saving data:', error);
                return false;
            }
        },
        
        get: function(key) {
            try {
                const serialized = localStorage.getItem(key);
                if (serialized === null || serialized === undefined) {
                    return null;
                }
                return JSON.parse(serialized);
            } catch (error) {
                console.error('Error retrieving data:', error);
                return null;
            }
        },
        
        remove: function(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Error removing data:', error);
                return false;
            }
        }
    };
    
    // DOM Elements
    const tabsContainer = document.getElementById('tabs');
    const newTabButton = document.getElementById('new-tab');
    const editorContainer = document.getElementById('editor-container');
    const saveAllButton = document.getElementById('save-all');
    const wordCountElement = document.getElementById('word-count');
    const lastSavedElement = document.getElementById('last-saved');
    const themeToggleButton = document.getElementById('theme-toggle');
    const imageModal = document.getElementById('image-modal');
    
    // Formatting buttons
    const boldButton = document.getElementById('bold');
    const italicButton = document.getElementById('italic');
    const underlineButton = document.getElementById('underline');
    const strikethroughButton = document.getElementById('strikethrough');
    const alignLeftButton = document.getElementById('align-left');
    const alignCenterButton = document.getElementById('align-center');
    const alignRightButton = document.getElementById('align-right');
    const orderedListButton = document.getElementById('ordered-list');
    const unorderedListButton = document.getElementById('unordered-list');
    const indentButton = document.getElementById('indent');
    const outdentButton = document.getElementById('outdent');
    const insertLinkButton = document.getElementById('insert-link');
    const insertImageButton = document.getElementById('insert-image');
    const fontFamilySelect = document.getElementById('font-family');
    const fontSizeSelect = document.getElementById('font-size');
    const textColorPicker = document.getElementById('text-color');
    const highlightColorPicker = document.getElementById('highlight-color');
    
    // State
    let notes = [];
    let activeNoteId = null;
    let autoSaveInterval = null;
    const autoSaveDelay = 5000; 
    let isAutoSaveEnabled = true;
    
    // Generate a unique ID
    function generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
    
    // Load notes from storage
    function loadNotes() {
        try {
            const savedNotes = StorageHandler.get('noteflowNotes');
            console.log("Loading saved notes:", savedNotes);
            
            if (savedNotes && Array.isArray(savedNotes) && savedNotes.length > 0) {
                notes = savedNotes;
                
                // Create tabs for ALL notes, regardless of closed status
                notes.forEach(note => {
                    createTab(note.id, note.title);
                    createEditor(note.id, note.content);
                    
                    // Remember that this tab was previously closed by adding a data attribute
                    if (note.closed) {
                        const tab = document.querySelector(`.tab[data-note-id="${note.id}"]`);
                        if (tab) {
                            tab.dataset.wasClosed = "true";
                        }
                        
                        // Remove the closed status as we're showing it now
                        note.closed = false;
                        delete note.closedAt;
                    }
                });
                
                // Activate the first note
                activateNote(notes[0].id);
                showNotification('All notes restored successfully');
                
                // Save notes with updated status
                saveNotes(true);
            } else {
                console.log("No saved notes found, creating new note");
                createNewNote();
            }
        } catch (error) {
            console.error("Error loading notes:", error);
            createNewNote();
            showNotification('Error loading saved notes', 'error');
        }
    }
    
    // Save notes to storage
    function saveNotes(silent = false) {
        try {
            // Make sure we have current content before saving
            if (activeNoteId) {
                const editor = document.getElementById(`editor-${activeNoteId}`);
                if (editor) {
                    updateNoteContent(activeNoteId, editor.innerHTML);
                }
            }
            
            // Save all notes
            const success = StorageHandler.set('noteflowNotes', notes);
            
            if (success) {
                updateLastSaved();
                if (!silent) {
                    showNotification('All notes saved successfully');
                }
                return true;
            } else {
                if (!silent) {
                    showNotification('Failed to save notes', 'error');
                }
                return false;
            }
        } catch (error) {
            console.error("Error saving notes:", error);
            if (!silent) {
                showNotification('Error saving notes', 'error');
            }
            return false;
        }
    }
    
    // Auto save current note only
    function autoSaveCurrentNote() {
        if (!isAutoSaveEnabled || !activeNoteId) return false;
        
        try {
            const editor = document.getElementById(`editor-${activeNoteId}`);
            if (editor) {
                updateNoteContent(activeNoteId, editor.innerHTML);
                const success = StorageHandler.set('noteflowNotes', notes);
                
                if (success) {
                    updateLastSaved('Auto-saved');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error("Error auto-saving:", error);
            return false;
        }
    }
    
    // Update last saved timestamp
    function updateLastSaved(prefix = 'Last saved') {
        const now = new Date();
        lastSavedElement.textContent = `${prefix}: ${now.toLocaleTimeString()}`;
        
        // Add temporary visual indication for auto-save
        if (prefix === 'Auto-saved') {
            lastSavedElement.classList.add('highlight-save');
            setTimeout(() => {
                lastSavedElement.classList.remove('highlight-save');
            }, 1000);
        }
    }
    
    // Create a new note
    function createNewNote() {
        const id = generateId();
        const newNote = {
            id,
            title: `Note ${notes.length + 1}`,
            content: '',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            color: getRandomNoteColor()
        };
        
        console.log("Creating new note:", id);
        notes.push(newNote);
        createTab(id, newNote.title);
        createEditor(id, newNote.content);
        activateNote(id);
        saveNotes(true);
    }
    
    // Create a tab for a note
    function createTab(id, title) {
        const noteIndex = notes.findIndex(note => note.id === id);
        const noteColor = noteIndex !== -1 ? notes[noteIndex].color : getRandomNoteColor();
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.noteId = id;
        tab.innerHTML = `
            <i class="fa-regular fa-note-sticky" style="color: ${noteColor}"></i>
            <span class="tab-title">${title}</span>
            <button class="tab-close"><i class="fa-solid fa-xmark"></i></button>
        `;
        
        tab.addEventListener('click', (e) => {
            if (e.target.className !== 'tab-close' && !e.target.closest('.tab-close')) {
                activateNote(id);
            }
        });
        
        const closeButton = tab.querySelector('.tab-close');
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNote(id);
            });
        }
        
        // Add before the new tab button
        tabsContainer.insertBefore(tab, newTabButton);
    }
    
    // Create an editor for a note
    function createEditor(id, content) {
        const editor = document.createElement('div');
        editor.className = 'editor';
        editor.id = `editor-${id}`;
        editor.contentEditable = true;
        editor.innerHTML = content || '';
        editor.dataset.noteId = id;
        editor.placeholder = 'Start typing...';
        
        // Handle content changes
        editor.addEventListener('input', () => {
            const success = updateNoteContent(id, editor.innerHTML);
            if (success) {
                updateWordCount(editor.innerText);
                // Reset auto-save timer on content change
                resetAutoSaveTimer();
            }
        });
        
        // Force immediate save on blur (when editor loses focus)
        editor.addEventListener('blur', () => {
            const success = updateNoteContent(id, editor.innerHTML);
            if (success && isAutoSaveEnabled) {
                autoSaveCurrentNote();
            }
        });
        
        // Handle keyboard shortcuts
        editor.addEventListener('keydown', (e) => {
            // Save on Ctrl+S
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveNotes();
            }
            
            // New note on Ctrl+N
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                createNewNote();
            }
            
            // Bold on Ctrl+B
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                execFormatCommand('bold');
            }
            
            // Italic on Ctrl+I
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                execFormatCommand('italic');
            }
            
            // Underline on Ctrl+U
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                execFormatCommand('underline');
            }
        });
        
        editorContainer.appendChild(editor);
        return editor;
    }
    
    // Activate a note
    function activateNote(id) {
        // Deactivate current active elements
        document.querySelectorAll('.tab.active').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.editor').forEach(editor => {
            editor.style.display = 'none';
        });
        
        // Activate the selected note
        const tab = document.querySelector(`.tab[data-note-id="${id}"]`);
        const editor = document.getElementById(`editor-${id}`);
        
        if (tab && editor) {
            tab.classList.add('active');
            editor.style.display = 'block';
            editor.focus();
            activeNoteId = id;
            
            // Update word count
            updateWordCount(editor.innerText);
            
            // Reset auto-save timer when switching notes
            resetAutoSaveTimer();
        }
    }
    
    // Update note content
    function updateNoteContent(id, content) {
        try {
            const noteIndex = notes.findIndex(note => note.id === id);
            if (noteIndex !== -1) {
                notes[noteIndex].content = content;
                notes[noteIndex].updated = new Date().toISOString();
                return true;
            } else {
                console.error(`Note with ID ${id} not found`);
                return false;
            }
        } catch (error) {
            console.error("Error updating note content:", error);
            return false;
        }
    }
    
    // Delete a note
    function deleteNote(id) {
        // Check if there's only one visible note left
        const visibleNotes = notes.filter(note => !note.closed);
        if (visibleNotes.length <= 1) {
            showNotification("You can't close the last visible note. Create a new one first.", "warning");
            return;
        }
        
        try {
            // Instead of removing from array, mark as closed
            const noteIndex = notes.findIndex(note => note.id === id);
            if (noteIndex !== -1) {
                // Mark the note as closed rather than deleting it
                notes[noteIndex].closed = true;
                notes[noteIndex].closedAt = new Date().toISOString();
            }
            
            // Remove tab and editor from display
            const tab = document.querySelector(`.tab[data-note-id="${id}"]`);
            const editor = document.getElementById(`editor-${id}`);
            
            if (tab) tab.remove();
            if (editor) editor.style.display = 'none';
            
            // If closing active note, activate another one
            if (activeNoteId === id) {
                // Find the first visible note
                const nextVisibleNote = notes.find(note => !note.closed);
                if (nextVisibleNote) {
                    activateNote(nextVisibleNote.id);
                }
            }
            
            saveNotes(true);
        } catch (error) {
            console.error("Error closing note:", error);
            showNotification('Error closing note', 'error');
        }
    }
    
    // Update word count
    function updateWordCount(text) {
        const words = text.trim().split(/\s+/).filter(word => word !== '').length;
        wordCountElement.textContent = `Words: ${words}`;
    }
    
    // Reset auto-save timer function
    function resetAutoSaveTimer() {
        if (!isAutoSaveEnabled) return;
        
        // Clear existing timer
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        
        // Set new timer
        autoSaveInterval = setInterval(() => {
            if (autoSaveCurrentNote()) {
                // Visual feedback on successful auto-save (if needed)
                const statusCircle = document.querySelector('.auto-save-indicator');
                if (statusCircle) {
                    statusCircle.classList.add('saving');
                    setTimeout(() => {
                        statusCircle.classList.remove('saving');
                    }, 500);
                }
            }
        }, autoSaveDelay);
    }
    
    // Text formatting functions
    function execFormatCommand(command, value = null) {
        document.execCommand(command, false, value);
        const editor = document.getElementById(`editor-${activeNoteId}`);
        if (editor) {
            editor.focus();
            updateNoteContent(activeNoteId, editor.innerHTML);
        }
    }
    
    // Toggle button active state
    function toggleButtonState(button) {
        button.classList.toggle('active');
    }
    
    // Generate random pastel color for note tabs
    function getRandomNoteColor() {
        const colors = [
            '#4cc9f0', // Blue
            '#4361ee', // Indigo
            '#7209b7', // Purple
            '#f72585', // Pink
            '#4ade80', // Green
            '#fb923c', // Orange
            '#f87171', // Red
            '#38bdf8', // Light Blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Handle format command with toggled state
    function handleFormatToggle(button, command) {
        button.addEventListener('click', () => {
            execFormatCommand(command);
            toggleButtonState(button);
        });
    }
    
    // Setup format buttons with toggled state
    function setupFormatButtons() {
        // Clear existing event listeners first
        boldButton.removeEventListener('click', () => execFormatCommand('bold'));
        italicButton.removeEventListener('click', () => execFormatCommand('italic'));
        underlineButton.removeEventListener('click', () => execFormatCommand('underline'));
        strikethroughButton.removeEventListener('click', () => execFormatCommand('strikeThrough'));
        
        // Add correct event listeners for text style buttons
        boldButton.addEventListener('click', () => {
            execFormatCommand('bold');
            updateButtonStates();
        });
        
        italicButton.addEventListener('click', () => {
            execFormatCommand('italic');
            updateButtonStates();
        });
        
        underlineButton.addEventListener('click', () => {
            execFormatCommand('underline');
            updateButtonStates();
        });
        
        strikethroughButton.addEventListener('click', () => {
            execFormatCommand('strikeThrough');
            updateButtonStates();
        });
        
        // Alignment buttons
        alignLeftButton.addEventListener('click', () => {
            execFormatCommand('justifyLeft');
            updateButtonStates();
        });
        
        alignCenterButton.addEventListener('click', () => {
            execFormatCommand('justifyCenter');
            updateButtonStates();
        });
        
        alignRightButton.addEventListener('click', () => {
            execFormatCommand('justifyRight');
            updateButtonStates();
        });
        
        // Add tooltip support for buttons
        document.querySelectorAll('.icon-button, .color-control label').forEach(button => {
            const title = button.getAttribute('title');
            if (title) {
                button.setAttribute('data-tooltip', title);
                button.removeAttribute('title');
            }
        });
    }
    
    // Check for formatting state and update button UI
    function updateButtonStates() {
        if (!activeNoteId) return;
        
        const activeEditor = document.getElementById(`editor-${activeNoteId}`);
        if (!activeEditor) return;
        
        // Focus the editor to ensure commands work properly
        activeEditor.focus();
        
        // Check states
        boldButton.classList.toggle('active', document.queryCommandState('bold'));
        italicButton.classList.toggle('active', document.queryCommandState('italic'));
        underlineButton.classList.toggle('active', document.queryCommandState('underline'));
        strikethroughButton.classList.toggle('active', document.queryCommandState('strikeThrough'));
        alignLeftButton.classList.toggle('active', document.queryCommandState('justifyLeft'));
        alignCenterButton.classList.toggle('active', document.queryCommandState('justifyCenter'));
        alignRightButton.classList.toggle('active', document.queryCommandState('justifyRight'));
    }
    
    // Theme toggle functionality
    function setupThemeToggle() {
        // Check for saved theme preference
        const savedTheme = StorageHandler.get('noteflowTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggleButton.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
        
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            
            if (document.body.classList.contains('dark-theme')) {
                StorageHandler.set('noteflowTheme', 'dark');
                themeToggleButton.innerHTML = '<i class="fa-solid fa-sun"></i>';
            } else {
                StorageHandler.set('noteflowTheme', 'light');
                themeToggleButton.innerHTML = '<i class="fa-solid fa-moon"></i>';
            }
        });
    }
    
    // Enhance note title editing
    function enhanceTitleEditing() {
        document.addEventListener('dblclick', (e) => {
            if (e.target.classList.contains('tab-title')) {
                const tab = e.target.closest('.tab');
                const id = tab.dataset.noteId;
                const noteIndex = notes.findIndex(note => note.id === id);
                
                // Create inline editor
                const currentTitle = e.target.textContent;
                const titleInput = document.createElement('input');
                titleInput.type = 'text';
                titleInput.value = currentTitle;
                titleInput.className = 'inline-title-editor';
                titleInput.style.width = `${Math.max(100, currentTitle.length * 8)}px`;
                
                // Replace title with input
                e.target.innerHTML = '';
                e.target.appendChild(titleInput);
                titleInput.focus();
                titleInput.select();
                
                // Handle save on enter or blur
                const saveTitle = () => {
                    const newTitle = titleInput.value.trim() || currentTitle;
                    if (noteIndex !== -1) {
                        notes[noteIndex].title = newTitle;
                        saveNotes(true);
                    }
                    e.target.textContent = newTitle;
                };
                
                titleInput.addEventListener('blur', saveTitle);
                titleInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveTitle();
                        titleInput.blur();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.target.textContent = currentTitle;
                        titleInput.blur();
                    }
                });
            }
        });
    }
    
    // Initialize auto-save indicator
    function setupAutoSaveIndicator() {
        const statusBar = document.querySelector('.status-bar');
        const autoSaveIndicator = document.createElement('div');
        autoSaveIndicator.className = 'status-item auto-save-status';
        autoSaveIndicator.innerHTML = `
            <div class="auto-save-indicator"></div>
            <span>Auto-save: <span class="auto-save-state">ON</span></span>
        `;
        statusBar.appendChild(autoSaveIndicator);
        
        // Add toggle functionality
        autoSaveIndicator.addEventListener('click', () => {
            const stateElement = autoSaveIndicator.querySelector('.auto-save-state');
            if (stateElement.textContent === 'ON') {
                clearInterval(autoSaveInterval);
                autoSaveInterval = null;
                isAutoSaveEnabled = false;
                stateElement.textContent = 'OFF';
                stateElement.style.color = 'var(--danger-color)';
                showNotification('Auto-save disabled', 'warning');
            } else {
                isAutoSaveEnabled = true;
                resetAutoSaveTimer();
                stateElement.textContent = 'ON';
                stateElement.style.color = 'var(--success-color)';
                showNotification('Auto-save enabled');
            }
        });
    }
    
    // Adding keyboard shortcuts for all formatting options
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'b': // Bold
                        e.preventDefault();
                        execFormatCommand('bold');
                        break;
                    case 'i': // Italic
                        e.preventDefault();
                        execFormatCommand('italic');
                        break;
                    case 'u': // Underline
                        e.preventDefault();
                        execFormatCommand('underline');
                        break;
                    case 'l': // Align Left
                        e.preventDefault();
                        execFormatCommand('justifyLeft');
                        break;
                    case 'e': // Align Center
                        e.preventDefault();
                        execFormatCommand('justifyCenter');
                        break;
                    case 'r': // Align Right
                        e.preventDefault();
                        execFormatCommand('justifyRight');
                        break;
                    case '.': // Indent
                        e.preventDefault();
                        execFormatCommand('indent');
                        break;
                    case ',': // Outdent
                        e.preventDefault();
                        execFormatCommand('outdent');
                        break;
                    case 'k': // Insert Link
                        e.preventDefault();
                        insertLinkButton.click();
                        break;
                    case 's': // Save
                        e.preventDefault();
                        saveNotes();
                        break;
                    case 'n': // New Note
                        e.preventDefault();
                        createNewNote();
                        break;
                }
            }
        });
    }
    
    // Setup image insertion
    function setupImageInsertion() {
        // Insert image button
        insertImageButton.addEventListener('click', () => {
            // Show the modal
            imageModal.classList.add('show');
            document.getElementById('image-url').focus();
        });
        
        // Close modal when clicking close button or outside
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal || e.target.classList.contains('modal-close')) {
                imageModal.classList.remove('show');
            }
        });
        
        // Insert image when clicking insert button
        document.getElementById('insert-image-btn').addEventListener('click', () => {
            const imageUrl = document.getElementById('image-url').value.trim();
            const altText = document.getElementById('image-alt').value.trim();
            
            if (imageUrl) {
                execFormatCommand('insertHTML', `<img src="${imageUrl}" alt="${altText || 'Image'}" style="max-width: 100%;">`);
                imageModal.classList.remove('show');
                document.getElementById('image-url').value = '';
                document.getElementById('image-alt').value = '';
            } else {
                showNotification('Please enter an image URL', 'warning');
            }
        });
    }
    
    // Show notification function
    function showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => {
            notif.remove();
        });
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Animate out after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Event Listeners
    newTabButton.addEventListener('click', createNewNote);
    
    saveAllButton.addEventListener('click', () => {
        const success = saveNotes();
        if (success) {
            showNotification('All notes saved successfully');
        } else {
            showNotification('Failed to save notes', 'error');
        }
    });
    
    // Format buttons    
    orderedListButton.addEventListener('click', () => execFormatCommand('insertOrderedList'));
    unorderedListButton.addEventListener('click', () => execFormatCommand('insertUnorderedList'));
    
    indentButton.addEventListener('click', () => execFormatCommand('indent'));
    outdentButton.addEventListener('click', () => execFormatCommand('outdent'));
    
    insertLinkButton.addEventListener('click', () => {
        const url = prompt('Enter the URL:');
        if (url) {
            execFormatCommand('createLink', url);
        }
    });
    
    fontFamilySelect.addEventListener('change', () => {
        execFormatCommand('fontName', fontFamilySelect.value);
    });
    
    fontSizeSelect.addEventListener('change', () => {
        execFormatCommand('fontSize', fontSizeSelect.value);
    });
    
    textColorPicker.addEventListener('input', () => {
        execFormatCommand('foreColor', textColorPicker.value);
    });
    
    highlightColorPicker.addEventListener('input', () => {
        execFormatCommand('hiliteColor', highlightColorPicker.value);
    });
    
    // Toolbar button active state update
    document.addEventListener('selectionchange', updateButtonStates);
    
    // Before unload warning
    window.addEventListener('beforeunload', (e) => {
        // Save all notes before page is unloaded
        saveNotes(true);
    });
    
    // Setup features
    setupThemeToggle();
    setupFormatButtons();
    setupKeyboardShortcuts();
    enhanceTitleEditing();
    setupAutoSaveIndicator();
    setupImageInsertion();
    setupUndoRedo();
    setupToolbarToggle(); 
    enhanceSelectionHandling(); 

    // Add undo/redo functionality
    function setupUndoRedo() {
        const header = document.querySelector('.header-actions');
        
        // Insert undo/redo buttons before theme toggle
        const undoRedoGroup = document.createElement('div');
        undoRedoGroup.className = 'undo-redo-group';
        undoRedoGroup.innerHTML = `
            <button id="undo-button" class="icon-button" data-tooltip="Undo (Ctrl+Z)">
                <i class="fa-solid fa-undo"></i>
            </button>
            <button id="redo-button" class="icon-button" data-tooltip="Redo (Ctrl+Y)">
                <i class="fa-solid fa-redo"></i>
            </button>
        `;
        
        header.insertBefore(undoRedoGroup, themeToggleButton);
        
        // Get references to new buttons
        const undoButton = document.getElementById('undo-button');
        const redoButton = document.getElementById('redo-button');
        
        // Add event listeners
        undoButton.addEventListener('click', () => {
            document.execCommand('undo', false);
        });
        
        redoButton.addEventListener('click', () => {
            document.execCommand('redo', false);
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    document.execCommand('undo', false);
                } else if (e.key === 'y') {
                    e.preventDefault();
                    document.execCommand('redo', false);
                }
            }
        });
    }

    // Add toolbar toggle functionality
    function setupToolbarToggle() {
        const header = document.querySelector('header');
        const toolbar = document.querySelector('.toolbar');
        
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'toolbar-toggle';
        toggleButton.className = 'icon-button';
        toggleButton.setAttribute('data-tooltip', 'Toggle Toolbar');
        toggleButton.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
        
        // Insert at beginning of header actions
        const headerActions = document.querySelector('.header-actions');
        headerActions.appendChild(toggleButton);
        
        // Initial state
        let toolbarVisible = true;
        
        // Toggle function
        function toggleToolbar() {
            if (toolbarVisible) {
                toolbar.style.display = 'none';
                toggleButton.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
                toggleButton.setAttribute('data-tooltip', 'Show Toolbar');
            } else {
                toolbar.style.display = 'flex';
                toggleButton.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
                toggleButton.setAttribute('data-tooltip', 'Hide Toolbar');
            }
            toolbarVisible = !toolbarVisible;
            
            // Save preference
            StorageHandler.set('noteflowToolbarVisible', toolbarVisible);
        }
        
        // Add click event
        toggleButton.addEventListener('click', toggleToolbar);
        
        // Check for saved preference
        const savedPreference = StorageHandler.get('noteflowToolbarVisible');
        if (savedPreference === false) {
            toggleToolbar();
        }
    }

    // Enhance selection handling
    function enhanceSelectionHandling() {
        // Add click event to current editor
        document.addEventListener('click', (e) => {
            if (e.target.closest('.editor')) {
                updateButtonStates();
            }
        });
        
        // Add mouseup event to current editor
        document.addEventListener('mouseup', (e) => {
            if (e.target.closest('.editor')) {
                updateButtonStates();
            }
        });
        
        // Add keyup event to current editor
        document.addEventListener('keyup', (e) => {
            if (e.target.closest('.editor')) {
                updateButtonStates();
            }
        });
    }
    
    // Initialize app
    loadNotes();
    
    // Initialize auto-save
    resetAutoSaveTimer();
    
    // Show welcome notification
    setTimeout(() => {
        showNotification('Welcome to NoteFlow! Changes auto-save every 5 seconds.');
    }, 1000);

});

/**
 * Menu Keyboards - Inline keyboards for bot navigation
 */

const { Markup } = require('telegraf');

const keyboards = {
    // Main menu keyboard
    mainMenu: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('📥 Downloads', 'menu_downloads'),
                Markup.button.callback('📊 Stats', 'menu_stats')
            ],
            [
                Markup.button.callback('❓ Help', 'menu_help'),
                Markup.button.callback('⚙️ Settings', 'menu_settings')
            ],
            [
                Markup.button.callback('👑 Premium', 'menu_premium')
            ]
        ]);
    },

    // Downloads menu
    downloadsMenu: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🎵 YouTube Audio', 'download_ytmp3'),
                Markup.button.callback('🎬 YouTube Video', 'download_ytmp4')
            ],
            [
                Markup.button.callback('📘 Facebook Video', 'download_fb'),
                Markup.button.callback('📸 Instagram Reels', 'download_ig')
            ],
            [
                Markup.button.callback('⬅️ Back to Menu', 'menu_main')
            ]
        ]);
    },

    // Premium menu
    premiumMenu: (isPremium = false) => {
        if (isPremium) {
            return Markup.inlineKeyboard([
                [
                    Markup.button.callback('📈 Premium Stats', 'premium_stats'),
                    Markup.button.callback('📋 History', 'premium_history')
                ],
                [
                    Markup.button.callback('⬅️ Back to Menu', 'menu_main')
                ]
            ]);
        } else {
            return Markup.inlineKeyboard([
                [
                    Markup.button.callback('💎 Upgrade to Premium', 'premium_upgrade'),
                    Markup.button.callback('💰 Pricing', 'premium_pricing')
                ],
                [
                    Markup.button.callback('⬅️ Back to Menu', 'menu_main')
                ]
            ]);
        }
    },

    // Admin menu (only for admins)
    adminMenu: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('👥 User Stats', 'admin_users'),
                Markup.button.callback('📊 Bot Stats', 'admin_stats')
            ],
            [
                Markup.button.callback('📢 Broadcast', 'admin_broadcast'),
                Markup.button.callback('👑 Manage Premium', 'admin_premium')
            ],
            [
                Markup.button.callback('⬅️ Back to Menu', 'menu_main')
            ]
        ]);
    },

    // Confirmation keyboards
    confirmAction: (action, data = '') => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Yes', `confirm_${action}_${data}`),
                Markup.button.callback('❌ No', `cancel_${action}`)
            ]
        ]);
    },

    // Pagination keyboard
    pagination: (currentPage, totalPages, prefix = 'page') => {
        const buttons = [];
        
        if (currentPage > 1) {
            buttons.push(Markup.button.callback('⬅️ Previous', `${prefix}_${currentPage - 1}`));
        }
        
        buttons.push(Markup.button.callback(`${currentPage}/${totalPages}`, 'current_page'));
        
        if (currentPage < totalPages) {
            buttons.push(Markup.button.callback('Next ➡️', `${prefix}_${currentPage + 1}`));
        }
        
        return Markup.inlineKeyboard([buttons]);
    },

    // Download quality selection
    qualityMenu: (type = 'video') => {
        if (type === 'video') {
            return Markup.inlineKeyboard([
                [
                    Markup.button.callback('🎬 720p', 'quality_720p'),
                    Markup.button.callback('🎥 480p', 'quality_480p')
                ],
                [
                    Markup.button.callback('📱 360p', 'quality_360p'),
                    Markup.button.callback('⚡ Auto', 'quality_auto')
                ],
                [
                    Markup.button.callback('❌ Cancel', 'cancel_download')
                ]
            ]);
        } else {
            return Markup.inlineKeyboard([
                [
                    Markup.button.callback('🎵 320kbps', 'quality_320k'),
                    Markup.button.callback('🎶 256kbps', 'quality_256k')
                ],
                [
                    Markup.button.callback('🔊 128kbps', 'quality_128k'),
                    Markup.button.callback('⚡ Auto', 'quality_auto')
                ],
                [
                    Markup.button.callback('❌ Cancel', 'cancel_download')
                ]
            ]);
        }
    },

    // Language selection
    languageMenu: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🇺🇸 English', 'lang_en'),
                Markup.button.callback('🇪🇸 Español', 'lang_es')
            ],
            [
                Markup.button.callback('🇫🇷 Français', 'lang_fr'),
                Markup.button.callback('🇩🇪 Deutsch', 'lang_de')
            ],
            [
                Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
                Markup.button.callback('⬅️ Back', 'menu_settings')
            ]
        ]);
    },

    // Settings menu
    settingsMenu: () => {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('🌐 Language', 'settings_language'),
                Markup.button.callback('🔔 Notifications', 'settings_notifications')
            ],
            [
                Markup.button.callback('📱 Download Quality', 'settings_quality'),
                Markup.button.callback('🗂️ File Format', 'settings_format')
            ],
            [
                Markup.button.callback('⬅️ Back to Menu', 'menu_main')
            ]
        ]);
    },

    // Simple back button
    backButton: (destination = 'menu_main') => {
        return Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back', destination)]
        ]);
    },

    // Close button
    closeButton: () => {
        return Markup.inlineKeyboard([
            [Markup.button.callback('❌ Close', 'close_message')]
        ]);
    }
};

module.exports = keyboards;
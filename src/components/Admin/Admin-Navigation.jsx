import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const AdminNavigation = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        // clear admin-related localStorage keys
        try {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminEmail');
            localStorage.removeItem('admin_logged_in_email');
            localStorage.removeItem('adminUser');
        } catch (e) { /* noop */ }
        navigate('/admin-login');
    };

    const navigationItems = [
        { name: 'Dashboard', path: '/admin', iconActive: '/admin-icons/dashboard-icon.svg', iconInactive: '/admin-icons/dashboard-inactive.svg' },
        { name: 'Products', path: '/admin/products', iconActive: '/admin-icons/product-icon.svg', iconInactive: '/admin-icons/product-inactive.svg' },
        { name: 'Orders', path: '/admin/orders', iconActive: '/admin-icons/order-icon.svg', iconInactive: '/admin-icons/order-inactive.svg' },
        { name: 'Stocks', path: '/admin/stocks', iconActive: '/admin-icons/stocks-icon.svg', iconInactive: '/admin-icons/stocks-inactive.svg' },
        { name: 'Users', path: '/admin/users', iconActive: '/admin-icons/users-icon.svg', iconInactive: '/admin-icons/users-inactive.svg' },

    ];

    const [selected, setSelected] = useState('Dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [adminEmail, setAdminEmail] = useState(() => {
        try {
            const maybe = localStorage.getItem('adminEmail') || localStorage.getItem('admin_logged_in_email') || localStorage.getItem('adminEmailAddress') || localStorage.getItem('adminUser');
            if (!maybe) return '';
            try {
                const parsed = JSON.parse(maybe);
                return parsed?.email ? String(parsed.email) : String(maybe);
            } catch {
                return String(maybe);
            }
        } catch (e) { return ''; }
    });

    useEffect(() => {
        const handler = (e) => {
            const sec = e?.detail?.section;
            if (sec) setSelected(sec);
        };
        window.addEventListener('admin-nav-select', handler);
        return () => window.removeEventListener('admin-nav-select', handler);
    }, []);

    // Listen for an in-page admin-login event so the nav updates immediately
    // when the login component performs a successful login in the same tab.
    useEffect(() => {
        const onAdminLogin = (e) => {
            try {
                const email = e?.detail?.email;
                if (email) setAdminEmail(String(email));
            } catch (err) { /* noop */ }
        };
        window.addEventListener('admin-login', onAdminLogin);
        return () => window.removeEventListener('admin-login', onAdminLogin);
    }, []);

    // listen for storage events so cross-tab/local updates update the UI
    useEffect(() => {
        const onStorage = (e) => {
            if (!e.key) return;
            if (['adminEmail', 'admin_logged_in_email', 'adminUser', 'adminEmailAddress'].includes(e.key)) {
                try {
                    const maybe = localStorage.getItem('adminEmail') || localStorage.getItem('admin_logged_in_email') || localStorage.getItem('adminEmailAddress') || localStorage.getItem('adminUser');
                    if (!maybe) {
                        setAdminEmail('');
                        return;
                    }
                    try {
                        const parsed = JSON.parse(maybe);
                        setAdminEmail(parsed?.email ? String(parsed.email) : String(maybe));
                    } catch {
                        setAdminEmail(String(maybe));
                    }
                } catch (err) { /* noop */ }
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    // Try to read an admin email from localStorage for display in the footer
    useEffect(() => {
        try {
            const maybe = localStorage.getItem('adminEmail') || localStorage.getItem('admin_logged_in_email') || localStorage.getItem('adminEmailAddress') || localStorage.getItem('adminUser');
            if (maybe) {
                // If stored as JSON, try parse
                try {
                    const parsed = JSON.parse(maybe);
                    if (parsed && parsed.email) setAdminEmail(String(parsed.email));
                    else setAdminEmail(String(parsed || ''));
                } catch {
                    setAdminEmail(String(maybe));
                }
            }
        } catch (e) { /* ignore */ }
    }, []);

    // If no email was found in localStorage, attempt to read it from the
    // Supabase auth session (fallback). Also subscribe to auth state changes
    // so the footer updates when the session changes.
    useEffect(() => {
        if (adminEmail) return; // already have an email from localStorage
        let mounted = true;

        const trySession = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const sessionEmail = data?.session?.user?.email;
                if (mounted && sessionEmail) setAdminEmail(String(sessionEmail));
            } catch (err) {
                // ignore session read errors
            }
        };

        trySession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            const sessionEmail = session?.user?.email;
            if (sessionEmail) setAdminEmail(String(sessionEmail));
            else setAdminEmail('');
        });

        return () => {
            mounted = false;
            try {
                if (listener && listener.subscription) listener.subscription.unsubscribe();
            } catch (e) { /* noop */ }
        };
    }, [adminEmail]);

    return (
    <div className={`fixed left-0 top-0 h-full bg-[#2B4269] shadow-lg transition-all duration-300 p-2 z-50 flex flex-col ${isCollapsed ? 'w-16' : 'w-[263px]'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                {!isCollapsed && (
                    <div className="flex items-center space-x-2">
                        <img src="/logo-icon/logo-white.png" className="w-32 h-auto mb-2 " alt="Logo" />
                    </div>
                )}
                
            </div>

            

            {/* Navigation Items */}
            <nav className="flex-1 px-3 py-4">
                <ul className="space-y-6">
                    {navigationItems.map((item) => {
                        const active = selected === item.name;
                        return (
                            <li key={item.path}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelected(item.name);
                                        try {
                                            window.dispatchEvent(new CustomEvent('admin-nav-select', { detail: { section: item.name } }));
                                        } catch (e) { /* noop */ }
                                    }}
                                    className={`w-full text-[20px] text-left flex items-center bg-transparent gap-3 px-3 py-2 rounded-lg focus:outline-none transition-colors duration-200 ${active ? ' text-white' : 'text-gray-300 hover:text-gray-300 '}`}
                                >
                                    {item.iconActive ? (
                                        <>
                                            <img
                                                src={active ? item.iconActive : item.iconInactive}
                                                alt={`${item.name} icon`}
                                                className="w-6 h-6 object-contain"
                                                onError={(e) => {
                                                    try {
                                                        e.currentTarget.onerror = null;
                                                        e.currentTarget.style.display = 'none';
                                                        const next = e.currentTarget.nextElementSibling;
                                                        if (next) next.style.display = 'flex';
                                                    } catch (err) { /* noop */ }
                                                }}
                                            />
                                            <div className="w-6 h-6 hidden items-center justify-center rounded bg-white/10 text-white text-xs font-semibold">
                                                {item.name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-6 h-6 flex items-center justify-center rounded bg-white/10 text-white text-xs font-semibold">
                                            {item.name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
                                        </div>
                                    )}
                                    {!isCollapsed && <span className={`font-dm-sans text-[20px] font-medium ${active ? 'text-white' : 'text-[#5C7CB3]'}`}>{item.name}</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>

            </nav>

            {/* Footer */}
            <div className="mt-auto p-3">
                {!isCollapsed ? (
                    <div className="flex flex-col items-start space-y-2">
                        {adminEmail ? (
                            <div className="text-sm text-white truncate max-w-[200px]">{adminEmail}</div>
                        ) : null}
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-white bg-transparent"
                        >
                            <svg className="w-[25px] h-[25px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="font-dm-sans text-[20px]">Logout</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded bg-transparent text-white"
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminNavigation;

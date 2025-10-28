import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminNavigation = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('adminLoggedIn');
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
                    <div className="flex items-center space-x-3">
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

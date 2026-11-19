import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children, className = '' }) => {
  const menuRef = useRef(null);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeOnDesktop = () => { if (desktop.matches) menuRef.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  return (
    <div className="layout-wrapper">
      <Navbar onOpenMenu={() => menuRef.current?.showModal()} />
      <dialog ref={menuRef} id="mobile-navigation" className="mobile-nav-dialog" aria-label="Điều hướng chính"
        onClick={event => { if (event.target === event.currentTarget || event.target.closest('a')) menuRef.current.close(); }}>
        <div className="mobile-nav-heading"><strong>Menu</strong><button type="button" aria-label="Đóng menu" onClick={() => menuRef.current.close()}><X size={22} /></button></div>
        <Sidebar />
      </dialog>
      <div className="layout-content-area">
        <Sidebar />
        <main className={`layout-main ${className}`.trim()}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout-wrapper">
      <Navbar />
      <div className="layout-content-area">
        <Sidebar />
        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

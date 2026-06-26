import React from 'react';

const Footer = () => {
    return (
        <footer style={styles.footer}>
            <div style={styles.container}>
                <div style={styles.vuInfo}>
                    <img 
                        src="https://tse4.mm.bing.net/th/id/OIP.ZBM6EAEbQ6wVIu3Ul5wXVAAAAA?rs=1&pid=ImgDetMain&o=7&rm=3" 
                        alt="VU Logo" 
                        style={styles.vuLogo} 
                    />
                    <div style={styles.projectInfo}>
                        <strong style={{ color: '#f7d569' }}>CS619 Final Year Project</strong><br />
                        <span>Virtual University of Pakistan</span>
                    </div>
                </div>
                
                <div style={styles.copyright}>
                    <p>© 2026 AI-Supported Virtual Internship Hub</p>
                    <small>Designed for Freelancing Excellence</small>
                </div>
            </div>
        </footer>
    );
};

const styles = {
    footer: { 
        backgroundColor: '#0f111d', 
        color: '#ffffff', 
        padding: '20px 5%', 
        marginTop: '0px',
        borderTop: '2px solid #ffffff' 
    },
    container: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
    },
    vuInfo: { display: 'flex', alignItems: 'center', gap: '20px' },
    vuLogo: { height: '60px', filter: 'brightness(1.2)' }, 
    projectInfo: { fontSize: '14px', margin: 0, lineHeight: '1.6' },
    copyright: { textAlign: 'right', fontSize: '13px', opacity: 0.8 }
};

export default Footer;
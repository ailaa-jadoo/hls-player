"use client"
import React, { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';
import Chat from '../components/Chat';

const HomePage = () => {
    const [videoUrl, setVideoUrl] = useState('');
    const [submittedUrl, setSubmittedUrl] = useState('');
    const [streamId, setStreamId] = useState('');
    const [historyUrls, setHistoryUrls] = useState([]);
    const [showChat, setShowChat] = useState(true);

    const extractStreamId = (url) => {
        if (!url) return '';
        const match = url.match(/T_\d+/);
        return match && match[0] ? match[0] : '';
    };

    useEffect(() => {
        if (submittedUrl) {
            const id = extractStreamId(submittedUrl);
            setStreamId(id);
        } else {
            setStreamId('');
        }
    }, [submittedUrl]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!videoUrl) return;
        
        setSubmittedUrl(videoUrl);
        
        if (!historyUrls.includes(videoUrl)) {
            const newHistory = [videoUrl, ...historyUrls].slice(0, 5);
            setHistoryUrls(newHistory);
            
            try {
                localStorage.setItem('videoHistory', JSON.stringify(newHistory));
            } catch (e) {}
        }

        if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            url.searchParams.set('url', videoUrl);
            window.history.pushState({}, '', url);
        }
    };

    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('videoHistory');
            if (savedHistory) {
                setHistoryUrls(JSON.parse(savedHistory));
            }
            
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const urlParam = urlParams.get('url');
                if (urlParam) {
                    setVideoUrl(urlParam);
                    setSubmittedUrl(urlParam);
                }
            }
        } catch (e) {}
    }, []);

    const selectHistoryUrl = (url) => {
        setVideoUrl(url);
        setSubmittedUrl(url);
        
        if (typeof window !== 'undefined') {
            const urlObj = new URL(window.location);
            urlObj.searchParams.set('url', url);
            window.history.pushState({}, '', urlObj);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-blue-400">HLS Video Player</h1>
                    <div className="flex items-center gap-3">
                        {streamId && (
                            <span className="text-xs bg-blue-900 px-2 py-1 rounded">
                                Stream: {streamId}
                            </span>
                        )}
                        <button 
                            onClick={() => setShowChat(!showChat)} 
                            className="text-sm bg-gray-700 hover:bg-blue-600 px-3 py-1 rounded transition-all"
                        >
                            {showChat ? 'Hide Chat' : 'Show Chat'}
                        </button>
                    </div>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto p-4">
                <div className="mb-4 bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Enter HLS video URL (m3u8)"
                            className="flex-grow py-2 px-4 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded transition-colors duration-200"
                        >
                            Load Video
                        </button>
                    </form>
                </div>
                
                <div className={`flex flex-col ${showChat ? 'lg:grid lg:grid-cols-3' : ''} gap-4`}>
                    {/* Video Player - Always on top in mobile, expands when chat is hidden */}
                    <div className={`${showChat ? 'lg:col-span-2' : 'w-full'}`}>
                        {submittedUrl ? (
                            <div className="mb-4">
                                <VideoPlayer videoUrl={submittedUrl} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-gray-800 rounded-lg mb-4 border border-gray-700">
                                <svg className="w-16 h-16 mb-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                <p className="text-lg font-medium">Enter a HLS URL to start streaming</p>
                                <p className="mt-2 text-sm">Supports .m3u8 live and VOD streams</p>
                            </div>
                        )}
                        
                        {/* Recent URLs */}
                        {historyUrls.length > 0 && (
                            <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-4 lg:mb-0 border border-gray-700">
                                <h2 className="text-md font-medium text-gray-300 mb-2">Recent URLs</h2>
                                <div className="space-y-1">
                                    {historyUrls.map((url, index) => (
                                        <button
                                            key={index}
                                            onClick={() => selectHistoryUrl(url)}
                                            className="text-xs block w-full text-left truncate p-2 hover:bg-gray-700 rounded text-blue-300 transition-colors"
                                        >
                                            {url}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Chat Component - Below video in mobile view */}
                    {showChat && (
                        <div className="lg:col-span-1">
                            <Chat streamId={streamId} />
                        </div>
                    )}
                </div>
            </main>
            
            <footer className="mt-6 border-t border-gray-700 p-4 text-center text-gray-500 text-sm">
                <p>HLS Video Player • Optimized for streaming</p>
            </footer>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1f2937;
                    border-radius: 4px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #4b5563;
                    border-radius: 4px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                }
            `}</style>
        </div>
    );
};

export default HomePage;
import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";

const VideoPlayer = ({ videoUrl }) => {
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const progressContainerRef = useRef(null);
  const seekingRef = useRef(false);
  const [urlParams, setUrlParams] = useState({});
  const [baseUrl, setBaseUrl] = useState("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [loadingStatus, setLoadingStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isParamsExpanded, setIsParamsExpanded] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverProgress, setHoverProgress] = useState(null);
  const controlsTimeoutRef = useRef(null);

  const speedOptions = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

  // Update currentVideoUrl when videoUrl prop changes
  useEffect(() => {
    setCurrentVideoUrl(videoUrl);
  }, [videoUrl]);

  // Parse URL to separate base URL and parameters
  useEffect(() => {
    const parseUrl = (url) => {
      const questionMarkIndex = url.indexOf("?");
      if (questionMarkIndex === -1) {
        setBaseUrl(url);
        return {};
      }

      const base = url.substring(0, questionMarkIndex);
      setBaseUrl(base);

      const queryString = url.substring(questionMarkIndex + 1);
      const params = {};

      queryString.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      });

      return params;
    };

    const params = parseUrl(currentVideoUrl);
    setUrlParams(params);
  }, [currentVideoUrl]);

  // Initialize and manage HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset status when loading new URL
    setLoadingStatus("loading");
    setErrorMessage("");

    const hls = new Hls({
      debug: true,
      enableWorker: true,
    });

    console.log("Video URL:", currentVideoUrl);

    // Set up event listeners before loading the source
    let loadTimeout = setTimeout(() => {
      if (loadingStatus === "loading") {
        setLoadingStatus("error");
        setErrorMessage("Timeout: Source not responding");
      }
    }, 10000); // 10 second timeout

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      clearTimeout(loadTimeout);
      setLoadingStatus("success");
      // Don't autoplay here, let user control playback
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.error("HLS error:", data);

      if (data.fatal) {
        clearTimeout(loadTimeout);
        setLoadingStatus("error");

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            setErrorMessage(`Network error: ${data.details}`);
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            setErrorMessage(`Media error: ${data.details}`);
            hls.recoverMediaError();
            break;
          default:
            setErrorMessage(`Fatal error: ${data.details}`);
            hls.destroy();
            break;
        }
      }
    });

    // Now load the source
    hls.loadSource(currentVideoUrl);
    hls.attachMedia(video);

    return () => {
      clearTimeout(loadTimeout);
      hls.destroy();
    };
  }, [currentVideoUrl]);

  // Set up video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (!seekingRef.current) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedTime(bufferedEnd);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("progress", handleProgress);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("progress", handleProgress);
    };
  }, []);

  // Manage playback rate when it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle key events if video container is focused or has focus within
      if (!videoContainerRef.current?.contains(document.activeElement)) {
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
          togglePlay();
          e.preventDefault();
          break;
        case "ArrowRight":
          skipForward();
          e.preventDefault();
          break;
        case "ArrowLeft":
          skipBackward();
          e.preventDefault();
          break;
        case "f":
          toggleFullscreen();
          e.preventDefault();
          break;
        case "m":
          toggleMute();
          e.preventDefault();
          break;
        case "+":
        case "=":
          // Increase speed
          setPlaybackRate((prevRate) => {
            const nextIndex = speedOptions.findIndex(
              (speed) => speed > prevRate,
            );
            return nextIndex !== -1 ? speedOptions[nextIndex] : prevRate;
          });
          e.preventDefault();
          break;
        case "-":
          // Decrease speed
          setPlaybackRate((prevRate) => {
            const prevIndex = speedOptions
              .slice()
              .reverse()
              .findIndex((speed) => speed < prevRate);
            return prevIndex !== -1
              ? speedOptions[speedOptions.length - 1 - prevIndex]
              : prevRate;
          });
          e.preventDefault();
          break;
        case "0":
          // Reset speed to normal
          setPlaybackRate(1.0);
          e.preventDefault();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [speedOptions]);

  // Show/hide controls on mouse movement
  const handleMouseMove = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000); // Hide controls after 3 seconds of inactivity if playing
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Close speed menu when clicking outside
  useEffect(() => {
    if (!showSpeedControls) return;

    const handleClickOutside = (e) => {
      // Check if the click is outside the speed menu and not on the speed button itself
      const speedMenu = document.querySelector(".speed-menu");
      const speedButton = document.querySelector(".speed-button");
      
      if (speedMenu && 
          !speedMenu.contains(e.target) && 
          speedButton && 
          !speedButton.contains(e.target)) {
        setShowSpeedControls(false);
      }
    };

    // Use mousedown to catch the event before the button click handler
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSpeedControls]);

  // Add stylesheet for custom scrollbar in WebKit browsers
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .speed-menu::-webkit-scrollbar {
        width: 6px;
      }
      .speed-menu::-webkit-scrollbar-track {
        background: #1F2937;
        border-radius: 3px;
      }
      .speed-menu::-webkit-scrollbar-thumb {
        background-color: #4B5563;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Handle parameter change
  const handleParamChange = (key, value) => {
    setUrlParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Apply changes and reload video
  const applyChanges = () => {
    const queryString = Object.entries(urlParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");

    const newUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    setCurrentVideoUrl(newUrl);
    setIsParamsExpanded(false);
  };

  // Get status colors and icon based on loading status
  const getStatusInfo = () => {
    switch (loadingStatus) {
      case "loading":
        return {
          bgColor: "bg-yellow-900",
          textColor: "text-yellow-200",
          borderColor: "border-yellow-700",
          message: "Loading video source...",
        };
      case "success":
        return {
          bgColor: "bg-green-900",
          textColor: "text-green-200",
          borderColor: "border-green-700",
          message: "Video source loaded successfully",
        };
      case "error":
        return {
          bgColor: "bg-red-900",
          textColor: "text-red-200",
          borderColor: "border-red-700",
          message: errorMessage || "Error loading video source",
        };
      default:
        return {
          bgColor: "bg-gray-800",
          textColor: "text-gray-200",
          borderColor: "border-gray-700",
          message: "Unknown status",
        };
    }
  };

  // Format time in MM:SS format
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Video control functions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch((e) => console.error("Error playing video:", e));
    } else {
      video.pause();
    }
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.min(video.currentTime + 10, video.duration);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(video.currentTime - 10, 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
  };

  const changeVolume = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    if (newVolume === 0) {
      video.muted = true;
    } else if (video.muted) {
      video.muted = false;
    }
  };

  // Enhanced smooth seeking functionality
  const handleProgressMouseDown = (e) => {
    seekingRef.current = true;
    handleProgressChange(e);

    const handleMouseMove = (e) => {
      if (seekingRef.current) {
        handleProgressChange(e);
      }
    };

    const handleMouseUp = () => {
      seekingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleProgressChange = (e) => {
    if (!progressContainerRef.current || !videoRef.current) return;

    const rect = progressContainerRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = position * videoRef.current.duration;

    // Update UI immediately for smoother experience
    setCurrentTime(newTime);

    // Use requestAnimationFrame for smoother seeking on slower devices
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
    });
  };

  const handleProgressHover = (e) => {
    if (!progressContainerRef.current || !videoRef.current) return;

    const rect = progressContainerRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    setHoverProgress(position * videoRef.current.duration);
  };

  const toggleFullscreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Handle speed selection
  const changeSpeed = (speed) => {
    setPlaybackRate(speed);
    setShowSpeedControls(false);
  };

  // Custom speed increment/decrement with limits
  const incrementSpeed = () => {
    setPlaybackRate((prevRate) => {
      const nextIndex = speedOptions.findIndex((speed) => speed > prevRate);
      return nextIndex !== -1 ? speedOptions[nextIndex] : prevRate;
    });
  };

  const decrementSpeed = () => {
    setPlaybackRate((prevRate) => {
      const prevIndex = speedOptions
        .slice()
        .reverse()
        .findIndex((speed) => speed < prevRate);
      return prevIndex !== -1
        ? speedOptions[speedOptions.length - 1 - prevIndex]
        : prevRate;
    });
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="video-player-container rounded-lg overflow-hidden bg-gray-900 shadow-xl">
      {/* Video container */}
      <div
        ref={videoContainerRef}
        className="relative bg-black w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onClick={togglePlay}
        tabIndex={0} // Make container focusable for keyboard shortcuts
      >
        {/* Status overlay - only shown when not success */}
        {loadingStatus !== "success" && (
          <div
            className={`absolute top-4 left-4 right-4 z-20 ${statusInfo.bgColor} ${statusInfo.textColor} border ${statusInfo.borderColor} rounded-lg p-2 bg-opacity-90 flex items-center`}
          >
            {loadingStatus === "loading" && (
              <div className="mr-2 animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent"></div>
            )}
            {loadingStatus === "error" && (
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="text-sm font-medium">{statusInfo.message}</span>
          </div>
        )}

        {/* Actual video element - without native controls */}
        <video ref={videoRef} className="w-full aspect-video object-contain" />

        {/* Play button overlay - shown when paused */}
        {!isPlaying && loadingStatus === "success" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              className="p-4 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label="Play"
            >
              <svg
                className="w-12 h-12 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}

        {/* Custom controls overlay */}
        {showControls && loadingStatus === "success" && (
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 transition-opacity duration-300"
            onClick={(e) => e.stopPropagation()} // Prevent overlay clicks from toggling play
          >
            {/* Progress bar with buffer display and hover preview */}
            <div className="flex items-center mb-2">
              <span className="text-xs text-white mr-2">
                {formatTime(currentTime)}
              </span>
              <div
                ref={progressContainerRef}
                className="flex-grow relative h-8 flex items-center group cursor-pointer"
                onMouseDown={handleProgressMouseDown}
                onMouseMove={handleProgressHover}
                onMouseLeave={() => setHoverProgress(null)}
              >
                {/* Time preview on hover */}
                {hoverProgress !== null && (
                  <div
                    className="absolute top-0 transform -translate-y-full bg-black bg-opacity-80 rounded px-2 py-1 text-xs text-white"
                    style={{
                      left: `${(hoverProgress / (duration || 1)) * 100}%`,
                      transform: "translate(-50%, -8px)",
                    }}
                  >
                    {formatTime(hoverProgress)}
                  </div>
                )}

                {/* Progress track backgrounds */}
                <div className="absolute left-0 right-0 h-1 bg-gray-700 rounded-full">
                  {/* Buffered progress */}
                  <div
                    className="absolute left-0 h-full bg-gray-500 rounded-full"
                    style={{
                      width: `${(bufferedTime / (duration || 1)) * 100}%`,
                    }}
                  ></div>

                  {/* Played progress */}
                  <div
                    className="absolute left-0 h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${(currentTime / (duration || 1)) * 100}%`,
                    }}
                  ></div>
                </div>

                {/* Progress knob - larger hitbox on hover */}
                <div
                  className="absolute h-3 w-3 bg-blue-500 rounded-full shadow-lg transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                ></div>

                {/* Invisible overlay for easier clicking */}
                <div className="absolute inset-0 cursor-pointer"></div>
              </div>
              <span className="text-xs text-white ml-2">
                {formatTime(duration)}
              </span>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Play/Pause button */}
                <button
                  className="p-1 text-white hover:text-blue-400 focus:outline-none"
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Skip backward */}
                <button
                  className="p-1 text-white hover:text-blue-400 focus:outline-none"
                  onClick={skipBackward}
                  aria-label="Skip backward 10 seconds"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                  </svg>
                </button>

                {/* Skip forward */}
                <button
                  className="p-1 text-white hover:text-blue-400 focus:outline-none"
                  onClick={skipForward}
                  aria-label="Skip forward 10 seconds"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                  </svg>
                </button>

                {/* Volume control */}
                <div className="relative group flex items-center">
                  <button
                    className="p-1 text-white hover:text-blue-400 focus:outline-none"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    ) : volume > 0.5 ? (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                      </svg>
                    )}
                  </button>
                  <div className="hidden group-hover:block w-20 ml-1">
                    <input
                      ref={volumeRef}
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={changeVolume}
                      className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                      style={{
                        backgroundImage: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${(isMuted ? 0 : volume) * 100}%, rgb(75, 85, 99) ${(isMuted ? 0 : volume) * 100}%, rgb(75, 85, 99) 100%)`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Speed control */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedControls(!showSpeedControls)}
                    className="flex items-center px-2 py-1 text-white text-xs font-medium hover:bg-gray-700 rounded speed-button"
                  >
                    {playbackRate}x
                    <svg
                      className={`w-4 h-4 ml-1 transform transition-transform ${showSpeedControls ? "rotate-180" : ""}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {showSpeedControls && (
                    <div className="absolute bottom-full right-0 mb-1 p-2 bg-gray-800 rounded shadow-lg z-30 lg:max-h-48 max-h-40 overflow-y-auto speed-menu"
                         style={{
                           scrollbarWidth: 'thin',
                           scrollbarColor: '#4B5563 #1F2937'
                         }}>
                      <div className="flex justify-between items-center mb-2">
                        <button
                          onClick={decrementSpeed}
                          className="p-1 text-gray-400 hover:text-white"
                          aria-label="Decrease speed"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <div className="text-xs font-medium text-white">
                          Speed
                        </div>
                        <button
                          onClick={incrementSpeed}
                          className="p-1 text-gray-400 hover:text-white"
                          aria-label="Increase speed"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="flex flex-col space-y-1 w-32">
                        {speedOptions.map((speed) => (
                          <button
                            key={speed}
                            onClick={() => changeSpeed(speed)}
                            className={`
                                text-xs py-1 px-2 rounded text-left
                                ${
                                  playbackRate === speed
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                }
                            `}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 text-xs text-gray-400 text-center">
                        Keyboard:{" "}
                        <span className="bg-gray-700 px-1 rounded">-</span> /{" "}
                        <span className="bg-gray-700 px-1 rounded">+</span> to
                        change,{" "}
                        <span className="bg-gray-700 px-1 rounded">0</span> to
                        reset
                      </div>
                    </div>
                  )}
                </div>

                {/* Fullscreen button */}
                <button
                  className="p-1 text-white hover:text-blue-400 focus:outline-none"
                  onClick={toggleFullscreen}
                  aria-label={
                    isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                  }
                >
                  {isFullscreen ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts help - could be toggled with a button */}
      <div className="p-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 rounded-b-lg mt-1 hidden md:block">
        <div className="flex flex-wrap justify-between">
          <div className="flex items-center mr-4 mb-1">
            <span className="bg-gray-700 px-1.5 py-0.5 rounded mr-1">
              Space
            </span>
            <span>Play/Pause</span>
          </div>
          <div className="flex items-center mr-4 mb-1">
            <span className="bg-gray-700 px-1.5 py-0.5 rounded mr-1">←</span>
            <span>-10s</span>
          </div>
          <div className="flex items-center mr-4 mb-1">
            <span className="bg-gray-700 px-1.5 py-0.5 rounded mr-1">→</span>
            <span>+10s</span>
          </div>
          <div className="flex items-center mr-4 mb-1">
            <span className="bg-gray-700 px-1.5 py-0.5 rounded mr-1">+</span>
            <span>Speed up</span>
          </div>
          <div className="flex items-center mr-4 mb-1">
            <span className="bg-gray-700 px-1.5 py-0.5 rounded mr-1">-</span>
            <span>Slow down</span>
          </div>
          <div className="flex items-center mr-4 mb-1">
            <span className="bg-gray-700 px-1.5 py-0.5 rounded mr-1">0</span>
            <span>Normal speed</span>
          </div>
          <div className="flex items-center mr-4 mb-1">
            <span className="bg-gray-700 px-1.5 py-0.5 rounded mr-1">m</span>
            <span>Mute</span>
          </div>
          <div className="flex items-center mr-4 mb-1">
            <span className="bg-gray-700 px-1.5 py-0.5 rounded mr-1">f</span>
            <span>Fullscreen</span>
          </div>
        </div>
      </div>

      {/* Compact controls panel below video */}
      <div className="mt-2 pt-1 border-t border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <button
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
            onClick={() => setIsParamsExpanded(!isParamsExpanded)}
          >
            <svg
              className={`w-4 h-4 mr-1 transform transition-transform ${isParamsExpanded ? "rotate-90" : ""}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            {isParamsExpanded ? "Hide Parameters" : "Edit Parameters"}
          </button>

          <div className="flex items-center">
            <div className="bg-gray-800 rounded-full px-3 py-1 text-xs font-medium text-blue-400 mr-2">
              {playbackRate}x speed
            </div>
            <div className="text-xs text-gray-400">
              {Object.keys(urlParams).length} parameters
            </div>
          </div>
        </div>

        {/* URL display - always visible but compact */}
        <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded truncate font-mono">
          {currentVideoUrl}
        </div>
      </div>

      {/* Expandable parameters section */}
      {isParamsExpanded && (
        <div className="p-3 bg-gray-800 border-t border-gray-700 max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {Object.entries(urlParams).map(([key, value]) => (
              <div key={key} className="grid grid-cols-5 gap-2 items-center">
                <div className="col-span-2 text-xs font-medium text-gray-300 truncate">
                  {key}:
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    className="w-full py-1 px-2 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={applyChanges}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-1 px-3 rounded"
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

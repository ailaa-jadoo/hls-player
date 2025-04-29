import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";

const VideoPlayer = ({ videoUrl }) => {
  const videoRef = useRef(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(videoUrl);
  const [loadingStatus, setLoadingStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [urlParams, setUrlParams] = useState({});
  const [baseUrl, setBaseUrl] = useState("");
  const [isParamsExpanded, setIsParamsExpanded] = useState(false);

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

    let hls = null;
    let loadTimeout = null;

    const setupHLS = () => {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
        });

        // Set up event listeners before loading the source
        loadTimeout = setTimeout(() => {
          if (loadingStatus === "loading") {
            setLoadingStatus("error");
            setErrorMessage("Timeout: Source not responding");
          }
        }, 10000); // 10 second timeout

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          clearTimeout(loadTimeout);
          setLoadingStatus("success");
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
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // For Safari which has native HLS support
        video.src = currentVideoUrl;
        video.addEventListener("loadedmetadata", () => {
          setLoadingStatus("success");
        });
        video.addEventListener("error", () => {
          setLoadingStatus("error");
          setErrorMessage("Error loading video");
        });
      } else {
        setLoadingStatus("error");
        setErrorMessage("HLS is not supported in this browser");
      }
    };

    setupHLS();

    // Fix for iOS orientation lock when entering fullscreen
    const handleFullscreenChange = () => {
      if (document.fullscreenElement === video) {
        // Try to lock to landscape if supported
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(err => {
            console.log('Orientation lock failed:', err);
          });
        }
      } else {
        // Release lock when exiting fullscreen
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (loadTimeout) clearTimeout(loadTimeout);
      if (hls) hls.destroy();
    };
  }, [currentVideoUrl]);

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

  return (
    <div className="video-player-container rounded-lg overflow-hidden bg-gray-900 shadow-xl">
      {/* Video container */}
      <div className="relative bg-black w-full">
        {/* Status overlay - only shown when not success */}
        {loadingStatus !== "success" && (
          <div
            className={`absolute top-4 left-4 right-4 z-20 ${
              loadingStatus === "loading"
                ? "bg-yellow-900 text-yellow-200 border-yellow-700"
                : "bg-red-900 text-red-200 border-red-700"
            } rounded-lg p-2 bg-opacity-90 flex items-center`}
          >
            {loadingStatus === "loading" ? (
              <div className="mr-2 animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent"></div>
            ) : (
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
            <span className="text-sm font-medium">
              {loadingStatus === "loading"
                ? "Loading video source..."
                : errorMessage || "Error loading video source"}
            </span>
          </div>
        )}

        {/* Video element - WITH native controls */}
        <video 
          ref={videoRef} 
          className="w-full aspect-video object-contain" 
          controls={loadingStatus === "success"}
          playsInline
          controlsList="nodownload" 
        />
      </div>

      {/* Simple URL and parameters editor */}
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

          <div className="text-xs text-gray-400">
            {Object.keys(urlParams).length} parameters
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
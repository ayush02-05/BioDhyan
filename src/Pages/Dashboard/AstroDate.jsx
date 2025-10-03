import React, { useState, useCallback, useMemo } from 'react';
import { Rocket, CalendarCheck, Globe, Loader2, Search, Zap } from 'lucide-react';

const AstroDate = () => {
    // State for user input (date)
    const [selectedDate, setSelectedDate] = useState(() => {
        // Default to a recent date for better presentation
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    
    // State for API results
    const [resultText, setResultText] = useState(null);
    const [sources, setSources] = useState([]);
    
    // State for UI management
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- Gemini API Configuration ---
    const apiKey = ""; // Canvas will provide this key at runtime
    const model = 'gemini-2.5-flash-preview-05-20';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    /**
     * Executes the Gemini API call to search for NASA history on a specific date.
     * Implements exponential backoff for handling rate limits.
     */
    const fetchNasaHistory = useCallback(async (date) => {
        setIsLoading(true);
        setError(null);
        setResultText(null);
        setSources([]);

        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        // System instructions guide the model's persona and output style
        const systemPrompt = "You are 'AstroDate', a knowledgeable, inspiring, and concise AI historian for NASA and space exploration. Your task is to provide a compelling, single-paragraph summary of a key NASA, space exploration, or astronomical event that happened on the user-specified date. If multiple events exist, choose the most significant or interesting one. Always use Google Search to ground your answer and provide citations.";
        
        // User query specifying the required information
        const userQuery = `What significant NASA mission, space exploration event, or major astronomical discovery was made on the date: ${formattedDate}? Summarize the event, its significance, and the main entities involved.`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            tools: [{ "google_search": {} }], // Enable Google Search grounding
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        const maxRetries = 5;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429 && attempt < maxRetries - 1) {
                        // Rate limit error (429), wait and retry
                        const delay = Math.pow(2, attempt) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    // --- UPDATED ERROR HANDLING ---
                    let errorBody = null;
                    try {
                        errorBody = await response.json();
                    } catch (e) {
                        // Ignore JSON parsing errors if the response body is not JSON
                    }

                    // Extract a specific error message if available, otherwise use the status code
                    const errorMessage = errorBody?.error?.message || `API request failed with status: ${response.status}`;
                    throw new Error(errorMessage);
                    // --- END UPDATED ERROR HANDLING ---
                }

                const result = await response.json();
                const candidate = result.candidates?.[0];

                if (candidate && candidate.content?.parts?.[0]?.text) {
                    const text = candidate.content.parts[0].text;
                    setResultText(text);

                    // Extract grounding sources
                    let extractedSources = [];
                    const groundingMetadata = candidate.groundingMetadata;
                    if (groundingMetadata && groundingMetadata.groundingAttributions) {
                        extractedSources = groundingMetadata.groundingAttributions
                            .map(attribution => ({
                                uri: attribution.web?.uri,
                                title: attribution.web?.title,
                            }))
                            .filter(source => source.uri && source.title);
                    }
                    setSources(extractedSources);
                } else {
                    setResultText("No significant information was returned by the AI for this date.");
                }
                break; // Success, exit retry loop

            } catch (err) {
                console.error("Gemini API Error:", err);
                // Display the detailed error message extracted or the generic one
                setError(`Failed to fetch history: ${err.message}`);
                if (attempt === maxRetries - 1) break; // Last attempt failed
            }
        }
        setIsLoading(false);
    }, [apiUrl]);

    // Handle button click
    const handleSearch = () => {
        if (selectedDate) {
            fetchNasaHistory(selectedDate);
        } else {
            setError("Please select a valid date.");
        }
    };

    // Formatted date display for the result title
    const formattedResultDate = useMemo(() => {
        if (selectedDate) {
            return new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
        return "Selected Date";
    }, [selectedDate]);


    return (
        <div className="min-h-screen flex flex-col pl-60 justify-center font-sans text-white">
            <h1 className="text-4xl font-extrabold text-white mb-4 flex items-center space-x-3">
                <Rocket className="w-8 h-8 text-cyan-400" />
                <span>Born on Discovery</span>
            </h1>
            <p className="text-gray-400 mb-8 max-w-2xl">
                Enter any date to discover what pivotal NASA, space, or astronomical event occurred. Find your cosmic birthday twin!
            </p>

            {/* Input and Action Card */}
            <div className="bg-gray-800 p-6 rounded-xl shadow-xl shadow-black/30 border border-gray-700 flex flex-col md:flex-row items-center gap-4 mb-10 max-w-4xl">
                <div className="flex-grow w-full">
                    <label htmlFor="dob-date" className="block text-sm font-medium text-gray-300 mb-2">
                        Select a Date (Your Birthday or any date)
                    </label>
                    <input
                        type="date"
                        id="dob-date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 transition duration-300"
                    />
                </div>
                
                <button
                    onClick={handleSearch}
                    disabled={isLoading || !selectedDate}
                    className="w-full md:w-auto mt-7 flex items-center justify-center space-x-2 bg-cyan-500 text-slate-900 py-3 px-6 rounded-xl hover:bg-cyan-600 transition duration-300 font-semibold shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Searching Cosmos...</span>
                        </>
                    ) : (
                        <>
                            <Search className="w-5 h-5" />
                            <span>Search Discovery</span>
                        </>
                    )}
                </button>
            </div>

            {/* Results Area */}
            <div className="max-w-4xl">
                {error && (
                    <div className="bg-red-900/50 text-red-300 p-4 rounded-xl border border-red-700">
                        <p className="font-semibold">Error:</p>
                        <p>{error}</p>
                    </div>
                )}

                {isLoading && (
                    <div className="text-center p-10">
                        <Loader2 className="w-12 h-12 text-cyan-400 mx-auto animate-spin mb-4" />
                        <p className="text-gray-400">Consulting the astronomical archives...</p>
                    </div>
                )}

                {resultText && (
                    <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl shadow-black/50 border border-gray-700">
                        <h2 className="text-3xl font-extrabold text-cyan-400 mb-4 flex items-center space-x-2 border-b border-gray-700 pb-2">
                            <CalendarCheck className="w-6 h-6" />
                            <span>Discovery for {formattedResultDate}</span>
                        </h2 >

                        <p className="text-lg text-gray-200 leading-relaxed mb-6">
                            {resultText}
                        </p>

                        {/* Citations / Grounding Sources */}
                        {sources.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                                    <Globe className="w-4 h-4 inline mr-1" />
                                    Sources
                                </h3>
                                <ul className="list-disc list-inside space-y-2 text-sm text-gray-500">
                                    {sources.map((source, index) => (
                                        <li key={index} className="truncate">
                                            <a 
                                                href={source.uri} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-cyan-400 hover:text-cyan-300 transition duration-150"
                                                title={source.title || source.uri}
                                            >
                                                {source.title || source.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AstroDate;

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Settings, FileText, Download, Loader2, AlertCircle, X, Save } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  
  // Load initial settings from localStorage or defaults
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('trae_api_key') || '');
  const [baseURL, setBaseURL] = useState(() => localStorage.getItem('trae_base_url') || 'https://api.openai.com/v1');
  const [modelName, setModelName] = useState(() => localStorage.getItem('trae_model_name') || 'gpt-3.5-turbo');
  
  const [mode, setMode] = useState<'translated_only' | 'bilingual'>('bilingual');
  const [targetLanguage, setTargetLanguage] = useState('Chinese');
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedBlobUrl, setTranslatedBlobUrl] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-clear save success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  const saveSettings = () => {
    localStorage.setItem('trae_api_key', apiKey);
    localStorage.setItem('trae_base_url', baseURL);
    localStorage.setItem('trae_model_name', modelName);
    setSaveSuccess(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.html') && !selectedFile.name.endsWith('.htm')) {
        setError('Please upload a valid HTML file.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setTranslatedBlobUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (!selectedFile.name.endsWith('.html') && !selectedFile.name.endsWith('.htm')) {
        setError('Please upload a valid HTML file.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setTranslatedBlobUrl(null);
    }
  };

  const handleTranslate = async () => {
    if (!file) return setError('Please select a file first.');
    if (!apiKey) return setError('Please enter your API Key.');

    setIsTranslating(true);
    setError(null);
    setTranslatedBlobUrl(null);

    const formData = new FormData();
    formData.append('htmlFile', file);
    formData.append('apiKey', apiKey);
    formData.append('baseURL', baseURL);
    formData.append('modelName', modelName);
    formData.append('mode', mode);
    formData.append('targetLanguage', targetLanguage);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Translation failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setTranslatedBlobUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranslating(false);
      // Reset file input so user can upload the same file again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setTranslatedBlobUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight sm:text-4xl">
            HTML Translator Pro
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-zinc-500 sm:mt-4">
            Translate your HTML files while preserving structure. Powered by AI.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Left Column: Upload & Actions */}
            <div className="p-8 border-b md:border-b-0 md:border-r border-zinc-200">
              <h2 className="text-lg font-medium text-zinc-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-zinc-400" />
                Upload File
              </h2>
              
              {file ? (
                <div className="mt-4 p-4 bg-zinc-50 rounded-lg flex items-center justify-between border border-zinc-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-zinc-900 truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</span>
                    <button 
                      onClick={clearFile}
                      className="p-1 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label 
                  className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-zinc-400" />
                    <div className="flex text-sm text-zinc-600 justify-center">
                      <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        Upload a file
                      </span>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-zinc-500">HTML up to 10MB</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".html,.htm"
                    onChange={handleFileChange}
                  />
                </label>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="mt-8">
                {translatedBlobUrl ? (
                  <a
                    href={translatedBlobUrl}
                    download={`translated_${file?.name || 'file.html'}`}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Download className="w-5 h-5" />
                    Download Translated File
                  </a>
                ) : (
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating || !file}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Translating... (This may take a while)
                      </>
                    ) : (
                      'Start Translation'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Settings */}
            <div className="p-8 bg-zinc-50 relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-zinc-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-zinc-400" />
                  Settings
                </h2>
                <button
                  onClick={saveSettings}
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Config
                </button>
              </div>

              {saveSuccess && (
                <div className="absolute top-16 left-8 right-8 bg-green-50 text-green-700 text-xs py-2 px-3 rounded border border-green-200 mb-4 transition-all">
                  Settings saved to browser storage!
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Translation Mode</label>
                  <select 
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm border"
                  >
                    <option value="bilingual">Original + Translated (Bilingual)</option>
                    <option value="translated_only">Translated Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Target Language</label>
                  <input 
                    type="text" 
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-200">
                  <label className="block text-sm font-medium text-zinc-700">API Key (Required)</label>
                  <input 
                    type="password" 
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-zinc-500">Your key is only sent to the backend during translation and not stored.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Base URL</label>
                  <input 
                    type="text" 
                    value={baseURL}
                    onChange={(e) => setBaseURL(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-zinc-500">Default is OpenAI. For DeepSeek, use <code>https://api.deepseek.com/v1</code></p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Model Name</label>
                  <input 
                    type="text" 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
